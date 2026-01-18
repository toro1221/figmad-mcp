import { z } from 'zod';
import { getFigmaClient } from '../../services/figma-api/index.js';
import { createLogger } from '../../lib/index.js';

const logger = createLogger('tool:get-variables');

export const getVariablesSchema = z.object({
  fileKey: z.string().describe('The Figma file key'),
  published: z.boolean().optional().describe('Get published variables instead of local'),
});

export type GetVariablesParams = z.infer<typeof getVariablesSchema>;

export async function getVariables(params: GetVariablesParams) {
  const { fileKey, published = false } = params;
  
  logger.debug('Getting variables', { fileKey, published });
  
  const client = getFigmaClient();
  const result = published 
    ? await client.getPublishedVariables(fileKey)
    : await client.getLocalVariables(fileKey);
  
  const variables = Object.values(result.meta?.variables || {});
  const collections = Object.values(result.meta?.variableCollections || {});
  
  return {
    variables: variables.map(v => ({
      id: v.id,
      name: v.name,
      type: v.resolvedType,
      collectionId: v.variableCollectionId,
    })),
    collections: collections.map(c => ({
      id: c.id,
      name: c.name,
      modes: c.modes,
      variableCount: c.variableIds.length,
    })),
    counts: {
      variables: variables.length,
      collections: collections.length,
    },
  };
}

export const getVariablesToolDefinition = {
  name: 'get_variables',
  description: 'Get design tokens/variables from a Figma file. Includes colors, spacing, and other tokenized values.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      fileKey: {
        type: 'string',
        description: 'The Figma file key',
      },
      published: {
        type: 'boolean',
        description: 'Get published variables instead of local (default: false)',
      },
    },
    required: ['fileKey'],
  },
};
