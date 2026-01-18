import { z } from 'zod';
import { getPluginBridge } from '../../services/plugin-bridge/index.js';
import { createLogger } from '../../lib/index.js';

const logger = createLogger('tool:create-frame');

const paintSchema = z.object({
  type: z.enum(['SOLID', 'GRADIENT_LINEAR', 'GRADIENT_RADIAL', 'IMAGE']).default('SOLID'),
  color: z.object({
    r: z.number().min(0).max(1),
    g: z.number().min(0).max(1),
    b: z.number().min(0).max(1),
    a: z.number().min(0).max(1).optional(),
  }).optional(),
  opacity: z.number().min(0).max(1).optional(),
});

export const createFrameSchema = z.object({
  name: z.string().describe('Name for the frame'),
  width: z.number().positive().describe('Frame width in pixels'),
  height: z.number().positive().describe('Frame height in pixels'),
  x: z.number().optional().describe('X position'),
  y: z.number().optional().describe('Y position'),
  parentId: z.string().optional().describe('Parent node ID to nest this frame under'),
  fills: z.array(paintSchema).optional().describe('Fill colors'),
});

export type CreateFrameParams = z.infer<typeof createFrameSchema>;

export async function createFrame(params: CreateFrameParams) {
  const { name, width, height, x, y, parentId, fills } = params;
  
  logger.debug('Creating frame', { name, width, height });
  
  const bridge = getPluginBridge();
  const result = await bridge.createFrame({
    name,
    width,
    height,
    x,
    y,
    parentId,
    fills,
  });
  
  return {
    success: true,
    nodeId: result.nodeId,
    message: `Created frame "${name}" (${width}x${height})`,
  };
}

export const createFrameToolDefinition = {
  name: 'create_frame',
  description: 'Create a new frame in Figma. Frames are the primary container for designs. Requires the Figma plugin to be connected.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      name: { type: 'string', description: 'Name for the frame' },
      width: { type: 'number', description: 'Frame width in pixels' },
      height: { type: 'number', description: 'Frame height in pixels' },
      x: { type: 'number', description: 'X position' },
      y: { type: 'number', description: 'Y position' },
      parentId: { type: 'string', description: 'Parent node ID to nest this frame under' },
      fills: {
        type: 'array',
        description: 'Fill colors. Each fill has type (SOLID, GRADIENT_LINEAR, etc.) and color {r,g,b,a} (0-1)',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['SOLID', 'GRADIENT_LINEAR', 'GRADIENT_RADIAL', 'IMAGE'] },
            color: {
              type: 'object',
              properties: {
                r: { type: 'number' },
                g: { type: 'number' },
                b: { type: 'number' },
                a: { type: 'number' },
              },
            },
          },
        },
      },
    },
    required: ['name', 'width', 'height'],
  },
};
