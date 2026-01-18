import { z } from 'zod';
import { captureWebpage } from '../../services/playwright/index.js';
import { createLogger, generateId, getConfig } from '../../lib/index.js';
import type { WebCapture, CaptureOptions } from '../../types/capture.js';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const logger = createLogger('tool:capture-webpage');

const captureStore = new Map<string, WebCapture>();

export const captureWebpageSchema = z.object({
  url: z.string().url().describe('URL to capture'),
  viewport: z.object({
    width: z.number().positive().default(1440),
    height: z.number().positive().default(900),
  }).optional().describe('Viewport dimensions'),
  fullPage: z.boolean().optional().describe('Capture full scrollable page'),
  waitForSelector: z.string().optional().describe('Wait for this CSS selector before capture'),
  waitForTimeout: z.number().positive().optional().describe('Additional wait time in ms'),
  detectComponents: z.boolean().optional().describe('Detect UI components in the page'),
});

export type CaptureWebpageParams = z.infer<typeof captureWebpageSchema>;

export async function captureWebpageTool(params: CaptureWebpageParams) {
  const { url, viewport, fullPage, waitForSelector, waitForTimeout, detectComponents = true } = params;
  
  logger.info('Capturing webpage', { url });
  
  const options: CaptureOptions = {
    url,
    viewport: viewport || { width: 1440, height: 900 },
    fullPage: fullPage ?? true,
    waitForSelector,
    waitForTimeout,
    captureDom: true,
    detectComponents,
  };
  
  const capture = await captureWebpage(options);
  
  captureStore.set(capture.id, capture);
  
  const config = getConfig();
  const captureDir = config.captureDir;
  await mkdir(captureDir, { recursive: true });
  
  const screenshotPath = join(captureDir, `${capture.id}.png`);
  await writeFile(screenshotPath, capture.screenshot);
  
  const metaPath = join(captureDir, `${capture.id}.json`);
  await writeFile(metaPath, JSON.stringify({
    id: capture.id,
    url: capture.url,
    timestamp: capture.timestamp,
    viewport: capture.viewport,
    componentCount: capture.components.length,
    elementCount: capture.dom.elements.length,
  }, null, 2));
  
  return {
    captureId: capture.id,
    url: capture.url,
    viewport: capture.viewport,
    screenshotPath,
    elementCount: capture.dom.elements.length,
    components: capture.components.map(c => ({
      type: c.type,
      confidence: c.confidence,
      boundingBox: c.boundingBox,
      suggestedConstruct: c.suggestedFigmaConstruct,
    })),
    componentSummary: summarizeComponents(capture.components),
  };
}

function summarizeComponents(components: WebCapture['components']): Record<string, number> {
  const summary: Record<string, number> = {};
  for (const c of components) {
    summary[c.type] = (summary[c.type] || 0) + 1;
  }
  return summary;
}

export function getCaptureById(id: string): WebCapture | undefined {
  return captureStore.get(id);
}

export function listCaptures(): { id: string; url: string; timestamp: Date }[] {
  return Array.from(captureStore.values()).map(c => ({
    id: c.id,
    url: c.url,
    timestamp: c.timestamp,
  }));
}

export const captureWebpageToolDefinition = {
  name: 'capture_webpage',
  description: 'Capture a webpage screenshot and analyze its DOM structure. Detects UI components like buttons, inputs, cards, navigation. Returns capture ID for use with reconstruct_page.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      url: { type: 'string', description: 'URL to capture' },
      viewport: {
        type: 'object',
        description: 'Viewport size (default: 1440x900)',
        properties: {
          width: { type: 'number' },
          height: { type: 'number' },
        },
      },
      fullPage: { type: 'boolean', description: 'Capture full scrollable page (default: true)' },
      waitForSelector: { type: 'string', description: 'CSS selector to wait for before capture' },
      waitForTimeout: { type: 'number', description: 'Additional wait time in milliseconds' },
      detectComponents: { type: 'boolean', description: 'Detect UI components (default: true)' },
    },
    required: ['url'],
  },
};
