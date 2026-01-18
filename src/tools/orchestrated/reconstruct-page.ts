import { z } from 'zod';
import { getPluginBridge } from '../../services/plugin-bridge/index.js';
import { getCaptureById } from './capture-webpage.js';
import { createLogger, hexToRgba } from '../../lib/index.js';
import type { CapturedElement, DetectedComponent } from '../../types/capture.js';

const logger = createLogger('tool:reconstruct-page');

export const reconstructPageSchema = z.object({
  captureId: z.string().describe('Capture ID from capture_webpage'),
  frameName: z.string().optional().describe('Name for the root frame'),
  createComponents: z.boolean().optional().describe('Create Figma components for detected UI elements'),
  simplifyNesting: z.boolean().optional().describe('Reduce deeply nested structures'),
  minConfidence: z.number().min(0).max(1).optional().describe('Minimum confidence for component detection'),
});

export type ReconstructPageParams = z.infer<typeof reconstructPageSchema>;

export async function reconstructPage(params: ReconstructPageParams) {
  const { 
    captureId, 
    frameName = 'Reconstructed Page',
    createComponents = false,
    simplifyNesting = true,
    minConfidence = 0.7,
  } = params;
  
  logger.info('Reconstructing page', { captureId });
  
  const capture = getCaptureById(captureId);
  if (!capture) {
    throw new Error(`Capture not found: ${captureId}`);
  }
  
  const bridge = getPluginBridge();
  
  const rootFrame = await bridge.createFrame({
    name: frameName,
    width: capture.viewport.width,
    height: capture.viewport.height,
    x: 0,
    y: 0,
    fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }],
  });
  
  const stats = {
    framesCreated: 1,
    rectanglesCreated: 0,
    textsCreated: 0,
    componentsCreated: 0,
  };
  
  const componentMap = new Map<string, DetectedComponent>();
  for (const comp of capture.components) {
    if (comp.confidence >= minConfidence) {
      const key = `${comp.boundingBox.x}-${comp.boundingBox.y}`;
      componentMap.set(key, comp);
    }
  }
  
  await reconstructElement(
    bridge,
    capture.dom.rootElement,
    rootFrame.nodeId,
    componentMap,
    stats,
    simplifyNesting,
    0
  );
  
  logger.info('Reconstruction complete', stats);
  
  return {
    success: true,
    rootFrameId: rootFrame.nodeId,
    stats,
    message: `Reconstructed page from ${capture.url}`,
  };
}

async function reconstructElement(
  bridge: ReturnType<typeof getPluginBridge>,
  element: CapturedElement,
  parentId: string,
  componentMap: Map<string, DetectedComponent>,
  stats: { framesCreated: number; rectanglesCreated: number; textsCreated: number; componentsCreated: number },
  simplifyNesting: boolean,
  depth: number
): Promise<void> {
  if (depth > 10) return;
  if (element.boundingBox.width < 5 || element.boundingBox.height < 5) return;
  
  const componentKey = `${element.boundingBox.x}-${element.boundingBox.y}`;
  const detectedComponent = componentMap.get(componentKey);
  
  const styles = element.computedStyles;
  const bgColor = parseBackgroundColor(styles.backgroundColor);
  
  if (element.textContent && !element.children.length) {
    const textColor = parseBackgroundColor(styles.color) || { r: 0, g: 0, b: 0 };
    const fontSize = parseInt(styles.fontSize) || 14;
    
    try {
      await bridge.createText({
        characters: element.textContent,
        x: element.boundingBox.x,
        y: element.boundingBox.y,
        parentId,
        fontSize,
        fills: [{ type: 'SOLID', color: textColor }],
      });
      stats.textsCreated++;
    } catch (e) {
      logger.debug('Failed to create text', { error: e });
    }
    return;
  }
  
  const isContainer = element.children.length > 0;
  const hasVisualStyles = bgColor || styles.border !== 'none' || styles.boxShadow !== 'none';
  
  if (!isContainer && !hasVisualStyles && simplifyNesting) {
    return;
  }
  
  let nodeId = parentId;
  
  if (hasVisualStyles || isContainer) {
    const isFlexContainer = styles.display === 'flex' || styles.display === 'inline-flex';
    
    if (isContainer) {
      const result = await bridge.createFrame({
        name: getElementName(element, detectedComponent),
        width: element.boundingBox.width,
        height: element.boundingBox.height,
        x: element.boundingBox.x,
        y: element.boundingBox.y,
        parentId,
        fills: bgColor ? [{ type: 'SOLID', color: bgColor }] : undefined,
      });
      nodeId = result.nodeId;
      stats.framesCreated++;
      
      if (isFlexContainer) {
        const direction = styles.flexDirection === 'column' ? 'VERTICAL' : 'HORIZONTAL';
        const gap = parseInt(styles.gap || '0') || 0;
        
        try {
          await bridge.applyAutoLayout({
            nodeId,
            direction,
            gap,
          });
        } catch (e) {
          logger.debug('Failed to apply auto-layout', { error: e });
        }
      }
    } else if (hasVisualStyles) {
      const cornerRadius = parseInt(styles.borderRadius) || 0;
      
      await bridge.createRectangle({
        name: getElementName(element, detectedComponent),
        width: element.boundingBox.width,
        height: element.boundingBox.height,
        x: element.boundingBox.x,
        y: element.boundingBox.y,
        parentId,
        fills: bgColor ? [{ type: 'SOLID', color: bgColor }] : [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }],
        cornerRadius,
      });
      stats.rectanglesCreated++;
      return;
    }
  }
  
  for (const child of element.children) {
    await reconstructElement(bridge, child, nodeId, componentMap, stats, simplifyNesting, depth + 1);
  }
}

function getElementName(element: CapturedElement, component?: DetectedComponent): string {
  if (component) {
    return `${component.type}`;
  }
  if (element.id) {
    return element.id;
  }
  if (element.className) {
    const firstClass = element.className.split(' ')[0];
    if (firstClass && firstClass.length < 30) {
      return firstClass;
    }
  }
  return element.tagName;
}

function parseBackgroundColor(color: string): { r: number; g: number; b: number; a?: number } | null {
  if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') {
    return null;
  }
  
  const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgbaMatch) {
    const a = rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1;
    if (a === 0) return null;
    
    return {
      r: parseInt(rgbaMatch[1]) / 255,
      g: parseInt(rgbaMatch[2]) / 255,
      b: parseInt(rgbaMatch[3]) / 255,
      a,
    };
  }
  
  return null;
}

export const reconstructPageToolDefinition = {
  name: 'reconstruct_page',
  description: 'Reconstruct a captured webpage in Figma. Creates frames, shapes, and text based on the captured DOM structure. Requires capture_webpage to be called first.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      captureId: { type: 'string', description: 'Capture ID from capture_webpage' },
      frameName: { type: 'string', description: 'Name for the root frame (default: "Reconstructed Page")' },
      createComponents: { type: 'boolean', description: 'Create Figma components for detected UI elements' },
      simplifyNesting: { type: 'boolean', description: 'Reduce deeply nested structures (default: true)' },
      minConfidence: { type: 'number', description: 'Minimum confidence for component detection 0-1 (default: 0.7)' },
    },
    required: ['captureId'],
  },
};
