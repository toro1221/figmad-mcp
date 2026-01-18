import { z } from 'zod';
import { getFigmaClient } from '../../services/figma-api/index.js';
import { createLogger } from '../../lib/index.js';

const logger = createLogger('tool:get-node');

export const getNodeSchema = z.object({
  fileKey: z.string().describe('The Figma file key'),
  nodeIds: z.array(z.string()).describe('Array of node IDs to retrieve'),
  depth: z.number().optional().describe('How deep to traverse from each node'),
});

export type GetNodeParams = z.infer<typeof getNodeSchema>;

export async function getNode(params: GetNodeParams) {
  const { fileKey, nodeIds, depth } = params;
  
  logger.debug('Getting nodes', { fileKey, nodeIds, depth });
  
  const client = getFigmaClient();
  const result = await client.getFileNodes(fileKey, nodeIds, { depth });
  
  return {
    nodes: result.nodes,
    count: Object.keys(result.nodes).length,
  };
}

export const getNodeToolDefinition = {
  name: 'get_node',
  description: 'Get specific nodes from a Figma file by their IDs. More efficient than getting the full file when you know what nodes you need.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      fileKey: {
        type: 'string',
        description: 'The Figma file key',
      },
      nodeIds: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of node IDs to retrieve (e.g., ["1:5", "1:6"])',
      },
      depth: {
        type: 'number',
        description: 'How deep to traverse from each node',
      },
    },
    required: ['fileKey', 'nodeIds'],
  },
};
