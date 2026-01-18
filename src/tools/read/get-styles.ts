import { z } from 'zod';
import { getFigmaClient } from '../../services/figma-api/index.js';
import { createLogger } from '../../lib/index.js';

const logger = createLogger('tool:get-styles');

export const getStylesSchema = z.object({
  fileKey: z.string().describe('The Figma file key'),
});

export type GetStylesParams = z.infer<typeof getStylesSchema>;

export async function getStyles(params: GetStylesParams) {
  const { fileKey } = params;
  
  logger.debug('Getting styles', { fileKey });
  
  const client = getFigmaClient();
  const result = await client.getStyles(fileKey);
  
  const styles = result.meta?.styles || [];
  
  const grouped = {
    fill: styles.filter(s => s.styleType === 'FILL'),
    text: styles.filter(s => s.styleType === 'TEXT'),
    effect: styles.filter(s => s.styleType === 'EFFECT'),
    grid: styles.filter(s => s.styleType === 'GRID'),
  };
  
  return {
    styles: {
      fill: grouped.fill.map(s => ({ key: s.key, name: s.name, description: s.description })),
      text: grouped.text.map(s => ({ key: s.key, name: s.name, description: s.description })),
      effect: grouped.effect.map(s => ({ key: s.key, name: s.name, description: s.description })),
      grid: grouped.grid.map(s => ({ key: s.key, name: s.name, description: s.description })),
    },
    counts: {
      fill: grouped.fill.length,
      text: grouped.text.length,
      effect: grouped.effect.length,
      grid: grouped.grid.length,
      total: styles.length,
    },
  };
}

export const getStylesToolDefinition = {
  name: 'get_styles',
  description: 'Get all styles (colors, text styles, effects, grids) from a Figma file.',
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
