import { z } from 'zod';
import { getPluginBridge } from '../../services/plugin-bridge/index.js';
import { createLogger } from '../../lib/index.js';

const logger = createLogger('tool:update-node');

export const updateNodeSchema = z.object({
  nodeId: z.string().describe('The node ID to update'),
  properties: z.object({
    name: z.string().optional(),
    visible: z.boolean().optional(),
    locked: z.boolean().optional(),
    opacity: z.number().min(0).max(1).optional(),
    x: z.number().optional(),
    y: z.number().optional(),
    width: z.number().positive().optional(),
    height: z.number().positive().optional(),
    rotation: z.number().optional(),
    cornerRadius: z.number().min(0).optional(),
    characters: z.string().optional(),
    fontSize: z.number().positive().optional(),
    fontFamily: z.string().optional(),
    fontWeight: z.number().optional(),
    textAlignHorizontal: z.enum(['LEFT', 'CENTER', 'RIGHT', 'JUSTIFIED']).optional(),
    textAlignVertical: z.enum(['TOP', 'CENTER', 'BOTTOM']).optional(),
  }).describe('Properties to update'),
});

export type UpdateNodeParams = z.infer<typeof updateNodeSchema>;

export async function updateNode(params: UpdateNodeParams) {
  const { nodeId, properties } = params;
  
  logger.debug('Updating node', { nodeId, properties });
  
  const bridge = getPluginBridge();
  const result = await bridge.updateNode({ nodeId, properties });
  
  const updatedProps = Object.keys(properties).filter(k => properties[k as keyof typeof properties] !== undefined);
  
  return {
    success: true,
    nodeId: result.nodeId,
    message: `Updated node ${nodeId}: ${updatedProps.join(', ')}`,
  };
}

export const updateNodeToolDefinition = {
  name: 'update_node',
  description: 'Update properties of an existing Figma node. Can modify position, size, text, visibility, and more.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      nodeId: { type: 'string', description: 'The node ID to update' },
      properties: {
        type: 'object',
        description: 'Properties to update',
        properties: {
          name: { type: 'string', description: 'Node name' },
          visible: { type: 'boolean', description: 'Visibility' },
          locked: { type: 'boolean', description: 'Lock state' },
          opacity: { type: 'number', description: 'Opacity 0-1' },
          x: { type: 'number', description: 'X position' },
          y: { type: 'number', description: 'Y position' },
          width: { type: 'number', description: 'Width' },
          height: { type: 'number', description: 'Height' },
          rotation: { type: 'number', description: 'Rotation in degrees' },
          cornerRadius: { type: 'number', description: 'Corner radius' },
          characters: { type: 'string', description: 'Text content (for text nodes)' },
          fontSize: { type: 'number', description: 'Font size (for text nodes)' },
          fontFamily: { type: 'string', description: 'Font family (for text nodes)' },
          fontWeight: { type: 'number', description: 'Font weight (for text nodes)' },
          textAlignHorizontal: { type: 'string', enum: ['LEFT', 'CENTER', 'RIGHT', 'JUSTIFIED'] },
          textAlignVertical: { type: 'string', enum: ['TOP', 'CENTER', 'BOTTOM'] },
        },
      },
    },
    required: ['nodeId', 'properties'],
  },
};
