import { z } from 'zod';
import { getPluginBridge } from '../../services/plugin-bridge/index.js';
import { createLogger } from '../../lib/index.js';

const logger = createLogger('tool:create-rectangle');

const paintSchema = z.object({
  type: z.enum(['SOLID', 'GRADIENT_LINEAR', 'GRADIENT_RADIAL', 'IMAGE']).default('SOLID'),
  color: z.object({
    r: z.number().min(0).max(1),
    g: z.number().min(0).max(1),
    b: z.number().min(0).max(1),
    a: z.number().min(0).max(1).optional(),
  }).optional(),
});

export const createRectangleSchema = z.object({
  width: z.number().positive().describe('Rectangle width in pixels'),
  height: z.number().positive().describe('Rectangle height in pixels'),
  name: z.string().optional().describe('Name for the rectangle'),
  x: z.number().optional().describe('X position'),
  y: z.number().optional().describe('Y position'),
  parentId: z.string().optional().describe('Parent node ID'),
  fills: z.array(paintSchema).optional().describe('Fill colors'),
  cornerRadius: z.number().min(0).optional().describe('Corner radius for rounded rectangles'),
});

export type CreateRectangleParams = z.infer<typeof createRectangleSchema>;

export async function createRectangle(params: CreateRectangleParams) {
  const { width, height, name, x, y, parentId, fills, cornerRadius } = params;
  
  logger.debug('Creating rectangle', { width, height, name });
  
  const bridge = getPluginBridge();
  const result = await bridge.createRectangle({
    width,
    height,
    name,
    x,
    y,
    parentId,
    fills,
    cornerRadius,
  });
  
  return {
    success: true,
    nodeId: result.nodeId,
    message: `Created rectangle ${name ? `"${name}"` : ''} (${width}x${height})`,
  };
}

export const createRectangleToolDefinition = {
  name: 'create_rectangle',
  description: 'Create a rectangle shape in Figma. Can have fills and rounded corners.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      width: { type: 'number', description: 'Rectangle width in pixels' },
      height: { type: 'number', description: 'Rectangle height in pixels' },
      name: { type: 'string', description: 'Name for the rectangle' },
      x: { type: 'number', description: 'X position' },
      y: { type: 'number', description: 'Y position' },
      parentId: { type: 'string', description: 'Parent node ID' },
      cornerRadius: { type: 'number', description: 'Corner radius for rounded rectangles' },
      fills: {
        type: 'array',
        description: 'Fill colors',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            color: { type: 'object' },
          },
        },
      },
    },
    required: ['width', 'height'],
  },
};
