import { z } from 'zod';
import { getPluginBridge } from '../../services/plugin-bridge/index.js';
import { createLogger } from '../../lib/index.js';

const logger = createLogger('tool:apply-auto-layout');

export const applyAutoLayoutSchema = z.object({
  nodeId: z.string().describe('The frame node ID to apply auto-layout to'),
  direction: z.enum(['HORIZONTAL', 'VERTICAL']).describe('Layout direction'),
  gap: z.number().min(0).optional().describe('Gap between items'),
  paddingLeft: z.number().min(0).optional(),
  paddingRight: z.number().min(0).optional(),
  paddingTop: z.number().min(0).optional(),
  paddingBottom: z.number().min(0).optional(),
  primaryAxisSizing: z.enum(['FIXED', 'AUTO']).optional().describe('How the container sizes along the layout axis'),
  counterAxisSizing: z.enum(['FIXED', 'AUTO']).optional().describe('How the container sizes perpendicular to layout'),
  primaryAxisAlign: z.enum(['MIN', 'CENTER', 'MAX', 'SPACE_BETWEEN']).optional().describe('Alignment along layout axis'),
  counterAxisAlign: z.enum(['MIN', 'CENTER', 'MAX', 'BASELINE']).optional().describe('Alignment perpendicular to layout'),
});

export type ApplyAutoLayoutParams = z.infer<typeof applyAutoLayoutSchema>;

export async function applyAutoLayout(params: ApplyAutoLayoutParams) {
  const { 
    nodeId, direction, gap, 
    paddingLeft, paddingRight, paddingTop, paddingBottom,
    primaryAxisSizing, counterAxisSizing,
    primaryAxisAlign, counterAxisAlign
  } = params;
  
  logger.debug('Applying auto-layout', { nodeId, direction, gap });
  
  const bridge = getPluginBridge();
  const result = await bridge.applyAutoLayout({
    nodeId,
    direction,
    gap,
    paddingLeft,
    paddingRight,
    paddingTop,
    paddingBottom,
    primaryAxisSizing,
    counterAxisSizing,
    primaryAxisAlign,
    counterAxisAlign,
  });
  
  return {
    success: true,
    nodeId: result.nodeId,
    message: `Applied ${direction} auto-layout to node ${nodeId}`,
  };
}

export const applyAutoLayoutToolDefinition = {
  name: 'apply_auto_layout',
  description: 'Apply auto-layout to a frame. Auto-layout automatically arranges children horizontally or vertically with consistent spacing.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      nodeId: { type: 'string', description: 'The frame node ID' },
      direction: { 
        type: 'string', 
        enum: ['HORIZONTAL', 'VERTICAL'],
        description: 'Layout direction' 
      },
      gap: { type: 'number', description: 'Gap between items in pixels' },
      paddingLeft: { type: 'number', description: 'Left padding' },
      paddingRight: { type: 'number', description: 'Right padding' },
      paddingTop: { type: 'number', description: 'Top padding' },
      paddingBottom: { type: 'number', description: 'Bottom padding' },
      primaryAxisSizing: { 
        type: 'string', 
        enum: ['FIXED', 'AUTO'],
        description: 'FIXED: maintain size, AUTO: hug contents' 
      },
      counterAxisSizing: { 
        type: 'string', 
        enum: ['FIXED', 'AUTO'],
        description: 'FIXED: maintain size, AUTO: hug contents' 
      },
      primaryAxisAlign: { 
        type: 'string', 
        enum: ['MIN', 'CENTER', 'MAX', 'SPACE_BETWEEN'],
        description: 'Alignment along main axis' 
      },
      counterAxisAlign: { 
        type: 'string', 
        enum: ['MIN', 'CENTER', 'MAX', 'BASELINE'],
        description: 'Alignment along cross axis' 
      },
    },
    required: ['nodeId', 'direction'],
  },
};
