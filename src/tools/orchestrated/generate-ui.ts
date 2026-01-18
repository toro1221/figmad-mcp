import { z } from 'zod';
import { getPluginBridge } from '../../services/plugin-bridge/index.js';
import { createLogger, hexToRgba } from '../../lib/index.js';

const logger = createLogger('tool:generate-ui');

export const generateUISchema = z.object({
  prompt: z.string().describe('Description of the UI to generate'),
  style: z.enum(['minimal', 'modern', 'corporate', 'playful']).optional().describe('Visual style'),
  width: z.number().positive().optional().describe('Frame width'),
  height: z.number().positive().optional().describe('Frame height'),
  colorScheme: z.object({
    primary: z.string().optional(),
    secondary: z.string().optional(),
    background: z.string().optional(),
    text: z.string().optional(),
  }).optional().describe('Color scheme in hex'),
});

export type GenerateUIParams = z.infer<typeof generateUISchema>;

interface UIElement {
  type: 'frame' | 'rectangle' | 'text' | 'button' | 'input';
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fill?: string;
  text?: string;
  fontSize?: number;
  cornerRadius?: number;
  children?: UIElement[];
}

export async function generateUI(params: GenerateUIParams) {
  const { 
    prompt, 
    style = 'modern',
    width = 1440,
    height = 900,
    colorScheme = {},
  } = params;
  
  logger.info('Generating UI', { prompt: prompt.substring(0, 100), style });
  
  const colors = {
    primary: colorScheme.primary || getStyleColors(style).primary,
    secondary: colorScheme.secondary || getStyleColors(style).secondary,
    background: colorScheme.background || getStyleColors(style).background,
    text: colorScheme.text || getStyleColors(style).text,
  };
  
  const layout = parsePromptToLayout(prompt, width, height, colors);
  
  const bridge = getPluginBridge();
  
  const bgColor = hexToRgba(colors.background);
  const rootFrame = await bridge.createFrame({
    name: `Generated: ${prompt.substring(0, 30)}`,
    width,
    height,
    x: 100,
    y: 100,
    fills: [{ type: 'SOLID', color: bgColor }],
  });
  
  const stats = { elements: 0 };
  
  for (const element of layout) {
    await createUIElement(bridge, element, rootFrame.nodeId, colors, stats);
  }
  
  logger.info('UI generation complete', { elements: stats.elements });
  
  return {
    success: true,
    frameId: rootFrame.nodeId,
    elementsCreated: stats.elements,
    message: `Generated UI with ${stats.elements} elements`,
    style,
    dimensions: { width, height },
  };
}

function getStyleColors(style: string): { primary: string; secondary: string; background: string; text: string } {
  const schemes: Record<string, { primary: string; secondary: string; background: string; text: string }> = {
    minimal: { primary: '#000000', secondary: '#666666', background: '#FFFFFF', text: '#000000' },
    modern: { primary: '#6366F1', secondary: '#8B5CF6', background: '#FAFAFA', text: '#1F2937' },
    corporate: { primary: '#2563EB', secondary: '#1E40AF', background: '#F8FAFC', text: '#0F172A' },
    playful: { primary: '#EC4899', secondary: '#F97316', background: '#FDF4FF', text: '#581C87' },
  };
  return schemes[style] || schemes.modern;
}

function parsePromptToLayout(prompt: string, width: number, height: number, colors: { primary: string; secondary: string; background: string; text: string }): UIElement[] {
  const elements: UIElement[] = [];
  const lower = prompt.toLowerCase();
  
  const padding = 40;
  let currentY = padding;
  
  if (lower.includes('header') || lower.includes('nav') || lower.includes('navigation')) {
    elements.push({
      type: 'frame',
      name: 'Header',
      x: 0,
      y: 0,
      width: width,
      height: 64,
      fill: '#FFFFFF',
      children: [
        { type: 'text', name: 'Logo', x: padding, y: 20, width: 100, height: 24, text: 'Logo', fontSize: 20 },
        { type: 'text', name: 'Nav Item 1', x: width - 300, y: 22, width: 60, height: 20, text: 'Home', fontSize: 14 },
        { type: 'text', name: 'Nav Item 2', x: width - 220, y: 22, width: 60, height: 20, text: 'About', fontSize: 14 },
        { type: 'text', name: 'Nav Item 3', x: width - 140, y: 22, width: 60, height: 20, text: 'Contact', fontSize: 14 },
      ],
    });
    currentY = 64 + padding;
  }
  
  if (lower.includes('hero') || lower.includes('landing') || lower.includes('headline')) {
    elements.push({
      type: 'frame',
      name: 'Hero Section',
      x: 0,
      y: currentY,
      width: width,
      height: 400,
      fill: colors.background,
      children: [
        { type: 'text', name: 'Headline', x: width/2 - 200, y: 100, width: 400, height: 60, text: 'Welcome to Our Platform', fontSize: 48 },
        { type: 'text', name: 'Subheadline', x: width/2 - 250, y: 180, width: 500, height: 40, text: 'Build something amazing today', fontSize: 20 },
        { type: 'button', name: 'CTA Button', x: width/2 - 75, y: 260, width: 150, height: 48, fill: colors.primary, text: 'Get Started', fontSize: 16, cornerRadius: 8 },
      ],
    });
    currentY += 400 + padding;
  }
  
  if (lower.includes('card') || lower.includes('feature') || lower.includes('grid')) {
    const cardWidth = (width - padding * 4) / 3;
    const cardHeight = 280;
    
    elements.push({
      type: 'frame',
      name: 'Features Section',
      x: 0,
      y: currentY,
      width: width,
      height: cardHeight + padding * 2,
      fill: colors.background,
      children: [
        { type: 'frame', name: 'Card 1', x: padding, y: padding, width: cardWidth, height: cardHeight, fill: '#FFFFFF', cornerRadius: 12 },
        { type: 'frame', name: 'Card 2', x: padding * 2 + cardWidth, y: padding, width: cardWidth, height: cardHeight, fill: '#FFFFFF', cornerRadius: 12 },
        { type: 'frame', name: 'Card 3', x: padding * 3 + cardWidth * 2, y: padding, width: cardWidth, height: cardHeight, fill: '#FFFFFF', cornerRadius: 12 },
      ],
    });
    currentY += cardHeight + padding * 3;
  }
  
  if (lower.includes('form') || lower.includes('input') || lower.includes('login') || lower.includes('signup')) {
    const formWidth = 400;
    const formX = (width - formWidth) / 2;
    
    elements.push({
      type: 'frame',
      name: 'Form',
      x: formX,
      y: currentY,
      width: formWidth,
      height: 300,
      fill: '#FFFFFF',
      cornerRadius: 12,
      children: [
        { type: 'text', name: 'Form Title', x: 24, y: 24, width: formWidth - 48, height: 32, text: 'Sign In', fontSize: 24 },
        { type: 'input', name: 'Email Input', x: 24, y: 80, width: formWidth - 48, height: 44, fill: '#F3F4F6', cornerRadius: 6 },
        { type: 'input', name: 'Password Input', x: 24, y: 140, width: formWidth - 48, height: 44, fill: '#F3F4F6', cornerRadius: 6 },
        { type: 'button', name: 'Submit Button', x: 24, y: 210, width: formWidth - 48, height: 48, fill: colors.primary, text: 'Sign In', fontSize: 16, cornerRadius: 8 },
      ],
    });
    currentY += 300 + padding;
  }
  
  if (lower.includes('footer')) {
    elements.push({
      type: 'frame',
      name: 'Footer',
      x: 0,
      y: height - 80,
      width: width,
      height: 80,
      fill: '#1F2937',
      children: [
        { type: 'text', name: 'Copyright', x: padding, y: 30, width: 300, height: 20, text: '2024 Company. All rights reserved.', fontSize: 14 },
      ],
    });
  }
  
  if (elements.length === 0) {
    elements.push({
      type: 'frame',
      name: 'Content',
      x: padding,
      y: padding,
      width: width - padding * 2,
      height: height - padding * 2,
      fill: '#FFFFFF',
      cornerRadius: 12,
      children: [
        { type: 'text', name: 'Title', x: 40, y: 40, width: 400, height: 40, text: 'Your Content Here', fontSize: 32 },
        { type: 'text', name: 'Description', x: 40, y: 100, width: 600, height: 60, text: 'Start designing your interface', fontSize: 16 },
      ],
    });
  }
  
  return elements;
}

async function createUIElement(
  bridge: ReturnType<typeof getPluginBridge>,
  element: UIElement,
  parentId: string,
  colors: { primary: string; secondary: string; background: string; text: string },
  stats: { elements: number }
): Promise<string | null> {
  try {
    let nodeId: string | null = null;
    
    if (element.type === 'frame') {
      const fillColor = element.fill ? hexToRgba(element.fill) : undefined;
      const result = await bridge.createFrame({
        name: element.name,
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
        parentId,
        fills: fillColor ? [{ type: 'SOLID', color: fillColor }] : undefined,
      });
      nodeId = result.nodeId;
      stats.elements++;
      
      if (element.cornerRadius) {
        await bridge.updateNode({
          nodeId,
          properties: { cornerRadius: element.cornerRadius },
        });
      }
      
      if (element.children) {
        for (const child of element.children) {
          await createUIElement(bridge, child, nodeId, colors, stats);
        }
      }
    } else if (element.type === 'rectangle' || element.type === 'input') {
      const fillColor = element.fill ? hexToRgba(element.fill) : { r: 0.95, g: 0.95, b: 0.95 };
      const result = await bridge.createRectangle({
        name: element.name,
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
        parentId,
        fills: [{ type: 'SOLID', color: fillColor }],
        cornerRadius: element.cornerRadius || 0,
      });
      nodeId = result.nodeId;
      stats.elements++;
    } else if (element.type === 'text') {
      const textColor = hexToRgba(colors.text);
      const result = await bridge.createText({
        characters: element.text || '',
        x: element.x,
        y: element.y,
        parentId,
        fontSize: element.fontSize || 14,
        fills: [{ type: 'SOLID', color: textColor }],
      });
      nodeId = result.nodeId;
      stats.elements++;
    } else if (element.type === 'button') {
      const fillColor = element.fill ? hexToRgba(element.fill) : hexToRgba(colors.primary);
      const btnResult = await bridge.createFrame({
        name: element.name,
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
        parentId,
        fills: [{ type: 'SOLID', color: fillColor }],
      });
      nodeId = btnResult.nodeId;
      stats.elements++;
      
      if (element.cornerRadius) {
        await bridge.updateNode({
          nodeId,
          properties: { cornerRadius: element.cornerRadius },
        });
      }
      
      if (element.text) {
        await bridge.createText({
          characters: element.text,
          x: element.width / 2 - 30,
          y: element.height / 2 - 8,
          parentId: nodeId,
          fontSize: element.fontSize || 14,
          fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }],
          textAlignHorizontal: 'CENTER',
        });
        stats.elements++;
      }
    }
    
    return nodeId;
  } catch (error) {
    logger.debug('Failed to create element', { name: element.name, error });
    return null;
  }
}

export const generateUIToolDefinition = {
  name: 'generate_ui',
  description: 'Generate a UI design from a text description. Parses the prompt for common UI patterns (header, hero, cards, form, footer) and creates corresponding Figma elements.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      prompt: { 
        type: 'string', 
        description: 'Description of the UI. Examples: "landing page with header, hero section, feature cards, and footer", "login form with email and password", "dashboard with sidebar navigation"' 
      },
      style: { 
        type: 'string', 
        enum: ['minimal', 'modern', 'corporate', 'playful'],
        description: 'Visual style (default: modern)' 
      },
      width: { type: 'number', description: 'Frame width in pixels (default: 1440)' },
      height: { type: 'number', description: 'Frame height in pixels (default: 900)' },
      colorScheme: {
        type: 'object',
        description: 'Custom colors in hex format',
        properties: {
          primary: { type: 'string', description: 'Primary brand color' },
          secondary: { type: 'string', description: 'Secondary color' },
          background: { type: 'string', description: 'Background color' },
          text: { type: 'string', description: 'Text color' },
        },
      },
    },
    required: ['prompt'],
  },
};
