import { z } from 'zod';
import { getPluginBridge } from '../../services/plugin-bridge/index.js';
import { createLogger } from '../../lib/index.js';

const logger = createLogger('tool:set-fills');

const paintSchema = z.object({
  type: z.enum(['SOLID', 'GRADIENT_LINEAR', 'GRADIENT_RADIAL', 'IMAGE']).default('SOLID'),
  color: z.object({
    r: z.number().min(0).max(1),
    g: z.number().min(0).max(1),
    b: z.number().min(0).max(1),
    a: z.number().min(0).max(1).optional(),
  }).optional(),
  opacity: z.number().min(0).max(1).optional(),
  visible: z.boolean().optional(),
});

export const setFillsSchema = z.object({
  nodeId: z.string().describe('The node ID to update'),
  fills: z.array(paintSchema).describe('Array of fill paints'),
});

export type SetFillsParams = z.infer<typeof setFillsSchema>;

export async function setFills(params: SetFillsParams) {
  const { nodeId, fills } = params;
  
  logger.debug('Setting fills', { nodeId, fillCount: fills.length });
  
  const bridge = getPluginBridge();
  const result = await bridge.setFills({ nodeId, fills });
  
  return {
    success: true,
    nodeId: result.nodeId,
    message: `Set ${fills.length} fill(s) on node ${nodeId}`,
  };
}

export const setFillsToolDefinition = {
  name: 'set_fills',
  description: 'Set fill colors/gradients on a node. Replaces all existing fills.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      nodeId: { type: 'string', description: 'The node ID' },
      fills: {
        type: 'array',
        description: 'Array of fills. Each fill has type and color {r,g,b,a} with values 0-1',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['SOLID', 'GRADIENT_LINEAR', 'GRADIENT_RADIAL', 'IMAGE'] },
            color: {
              type: 'object',
              properties: {
                r: { type: 'number', description: 'Red 0-1' },
                g: { type: 'number', description: 'Green 0-1' },
                b: { type: 'number', description: 'Blue 0-1' },
                a: { type: 'number', description: 'Alpha 0-1' },
              },
            },
            opacity: { type: 'number', description: 'Overall opacity 0-1' },
            visible: { type: 'boolean', description: 'Fill visibility' },
          },
        },
      },
    },
    required: ['nodeId', 'fills'],
  },
};
