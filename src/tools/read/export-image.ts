import { z } from 'zod';
import { getFigmaClient } from '../../services/figma-api/index.js';
import { createLogger } from '../../lib/index.js';

const logger = createLogger('tool:export-image');

export const exportImageSchema = z.object({
  fileKey: z.string().describe('The Figma file key'),
  nodeId: z.string().describe('The node ID to export'),
  format: z.enum(['png', 'jpg', 'svg', 'pdf']).optional().describe('Export format'),
  scale: z.number().min(0.01).max(4).optional().describe('Export scale (0.01-4)'),
});

export type ExportImageParams = z.infer<typeof exportImageSchema>;

export async function exportImage(params: ExportImageParams) {
  const { fileKey, nodeId, format = 'png', scale = 1 } = params;
  
  logger.debug('Exporting image', { fileKey, nodeId, format, scale });
  
  const client = getFigmaClient();
  const result = await client.exportImages(fileKey, [nodeId], { format, scale });
  
  const imageUrl = result.images[nodeId];
  
  if (!imageUrl) {
    throw new Error(`Failed to export node ${nodeId}`);
  }
  
  return {
    nodeId,
    format,
    scale,
    url: imageUrl,
  };
}

export const exportImageToolDefinition = {
  name: 'export_image',
  description: 'Export a Figma node as an image (PNG, JPG, SVG, or PDF). Returns a URL to the exported image.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      fileKey: {
        type: 'string',
        description: 'The Figma file key',
      },
      nodeId: {
        type: 'string',
        description: 'The node ID to export (e.g., "1:5")',
      },
      format: {
        type: 'string',
        enum: ['png', 'jpg', 'svg', 'pdf'],
        description: 'Export format (default: png)',
      },
      scale: {
        type: 'number',
        description: 'Export scale from 0.01 to 4 (default: 1)',
      },
    },
    required: ['fileKey', 'nodeId'],
  },
};
