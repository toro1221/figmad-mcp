import { z } from 'zod';
import { getFigmaClient } from '../../services/figma-api/index.js';
import { createLogger } from '../../lib/index.js';

const logger = createLogger('tool:get-file');

export const getFileSchema = z.object({
  fileKey: z.string().describe('The Figma file key (from URL: figma.com/file/{fileKey}/...)'),
  depth: z.number().optional().describe('How deep to traverse the node tree (default: full depth)'),
  nodeId: z.string().optional().describe('Specific node ID to retrieve'),
});

export type GetFileParams = z.infer<typeof getFileSchema>;

export async function getFile(params: GetFileParams) {
  const { fileKey, depth, nodeId } = params;
  
  logger.debug('Getting file', { fileKey, depth, nodeId });
  
  const client = getFigmaClient();
  const file = await client.getFile(fileKey, { depth, nodeId });
  
  return {
    name: file.name,
    lastModified: file.lastModified,
    version: file.version,
    thumbnailUrl: file.thumbnailUrl,
    document: file.document,
    componentCount: Object.keys(file.components || {}).length,
    styleCount: Object.keys(file.styles || {}).length,
  };
}

export const getFileToolDefinition = {
  name: 'get_file',
  description: 'Get a Figma file structure and metadata. Returns the document tree, components, and styles.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      fileKey: {
        type: 'string',
        description: 'The Figma file key (from URL: figma.com/file/{fileKey}/...)',
      },
      depth: {
        type: 'number',
        description: 'How deep to traverse the node tree (default: full depth)',
      },
      nodeId: {
        type: 'string',
        description: 'Specific node ID to retrieve',
      },
    },
    required: ['fileKey'],
  },
};
