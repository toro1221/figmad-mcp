import { z } from 'zod';
import { getPluginBridge } from '../../services/plugin-bridge/index.js';
import { createLogger } from '../../lib/index.js';

const logger = createLogger('tool:delete-node');

export const deleteNodeSchema = z.object({
  nodeId: z.string().describe('The node ID to delete'),
});

export type DeleteNodeParams = z.infer<typeof deleteNodeSchema>;

export async function deleteNode(params: DeleteNodeParams) {
  const { nodeId } = params;
  
  logger.debug('Deleting node', { nodeId });
  
  const bridge = getPluginBridge();
  await bridge.deleteNode(nodeId);
  
  return {
    success: true,
    message: `Deleted node ${nodeId}`,
  };
}

export const deleteNodeToolDefinition = {
  name: 'delete_node',
  description: 'Delete a node from the Figma document.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      nodeId: { type: 'string', description: 'The node ID to delete' },
    },
    required: ['nodeId'],
  },
};
