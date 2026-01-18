import { z } from 'zod';
import { getPluginBridge } from '../../services/plugin-bridge/index.js';
import { createLogger } from '../../lib/index.js';

const logger = createLogger('tool:create-text');

const paintSchema = z.object({
  type: z.enum(['SOLID']).default('SOLID'),
  color: z.object({
    r: z.number().min(0).max(1),
    g: z.number().min(0).max(1),
    b: z.number().min(0).max(1),
    a: z.number().min(0).max(1).optional(),
  }),
});

export const createTextSchema = z.object({
  characters: z.string().describe('The text content'),
  x: z.number().optional().describe('X position'),
  y: z.number().optional().describe('Y position'),
  parentId: z.string().optional().describe('Parent node ID'),
  fontSize: z.number().positive().optional().describe('Font size in pixels'),
  fontFamily: z.string().optional().describe('Font family name (e.g., "Inter", "Roboto")'),
  fontWeight: z.number().optional().describe('Font weight (100-900)'),
  fills: z.array(paintSchema).optional().describe('Text color'),
  textAlignHorizontal: z.enum(['LEFT', 'CENTER', 'RIGHT', 'JUSTIFIED']).optional(),
  textAlignVertical: z.enum(['TOP', 'CENTER', 'BOTTOM']).optional(),
  width: z.number().positive().optional().describe('Fixed width for text box'),
  height: z.number().positive().optional().describe('Fixed height for text box'),
});

export type CreateTextParams = z.infer<typeof createTextSchema>;

export async function createText(params: CreateTextParams) {
  const { 
    characters, x, y, parentId, fontSize, fontFamily, fontWeight,
    fills, textAlignHorizontal, textAlignVertical, width, height 
  } = params;
  
  logger.debug('Creating text', { characters: characters.substring(0, 50), fontSize });
  
  const bridge = getPluginBridge();
  const result = await bridge.createText({
    characters,
    x,
    y,
    parentId,
    fontSize,
    fontFamily,
    fontWeight,
    fills,
    textAlignHorizontal,
    textAlignVertical,
    width,
    height,
  });
  
  return {
    success: true,
    nodeId: result.nodeId,
    message: `Created text "${characters.substring(0, 30)}${characters.length > 30 ? '...' : ''}"`,
  };
}

export const createTextToolDefinition = {
  name: 'create_text',
  description: 'Create a text node in Figma. Supports font customization and alignment.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      characters: { type: 'string', description: 'The text content' },
      x: { type: 'number', description: 'X position' },
      y: { type: 'number', description: 'Y position' },
      parentId: { type: 'string', description: 'Parent node ID' },
      fontSize: { type: 'number', description: 'Font size in pixels (default: 14)' },
      fontFamily: { type: 'string', description: 'Font family (default: "Inter")' },
      fontWeight: { type: 'number', description: 'Font weight 100-900 (default: 400)' },
      textAlignHorizontal: { 
        type: 'string', 
        enum: ['LEFT', 'CENTER', 'RIGHT', 'JUSTIFIED'],
        description: 'Horizontal text alignment' 
      },
      textAlignVertical: { 
        type: 'string', 
        enum: ['TOP', 'CENTER', 'BOTTOM'],
        description: 'Vertical text alignment' 
      },
      width: { type: 'number', description: 'Fixed width for text box' },
      height: { type: 'number', description: 'Fixed height for text box' },
      fills: {
        type: 'array',
        description: 'Text color as array of fills',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            color: { type: 'object' },
          },
        },
      },
    },
    required: ['characters'],
  },
};
