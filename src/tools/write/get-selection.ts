import { z } from 'zod';
import { getPluginBridge } from '../../services/plugin-bridge/index.js';
import { createLogger } from '../../lib/index.js';

const logger = createLogger('tool:get-selection');

export const getSelectionSchema = z.object({});

export async function getSelection() {
  logger.debug('Getting current selection');
  
  const bridge = getPluginBridge();
  const result = await bridge.getSelection();
  
  return {
    selection: result.selection,
    count: result.selection.length,
  };
}

export const getSelectionToolDefinition = {
  name: 'get_selection',
  description: 'Get the currently selected nodes in Figma.',
  inputSchema: {
    type: 'object' as const,
    properties: {},
    required: [],
  },
};
