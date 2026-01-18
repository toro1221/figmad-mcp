import { z } from 'zod';
import { getFigmaClient } from '../../services/figma-api/index.js';
import { createLogger } from '../../lib/index.js';

const logger = createLogger('tool:get-components');

export const getComponentsSchema = z.object({
  fileKey: z.string().describe('The Figma file key'),
});

export type GetComponentsParams = z.infer<typeof getComponentsSchema>;

export async function getComponents(params: GetComponentsParams) {
  const { fileKey } = params;
  
  logger.debug('Getting components', { fileKey });
  
  const client = getFigmaClient();
  const result = await client.getComponents(fileKey);
  
  const components = result.meta?.components || [];
  
  return {
    components: components.map(c => ({
      key: c.key,
      name: c.name,
      description: c.description,
    })),
    count: components.length,
  };
}

export const getComponentsToolDefinition = {
  name: 'get_components',
  description: 'List all components in a Figma file. Returns component keys, names, and descriptions.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      fileKey: {
        type: 'string',
        description: 'The Figma file key',
      },
    },
    required: ['fileKey'],
  },
};
