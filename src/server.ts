import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { createLogger, getConfig, formatErrorForMcp } from './lib/index.js';
import { getPluginBridge } from './services/plugin-bridge/index.js';

import {
  getFile, getFileToolDefinition,
  getNode, getNodeToolDefinition,
  getComponents, getComponentsToolDefinition,
  getStyles, getStylesToolDefinition,
  getVariables, getVariablesToolDefinition,
  exportImage, exportImageToolDefinition,
} from './tools/read/index.js';

import {
  createFrame, createFrameToolDefinition,
  createRectangle, createRectangleToolDefinition,
  createText, createTextToolDefinition,
  updateNode, updateNodeToolDefinition,
  applyAutoLayout, applyAutoLayoutToolDefinition,
  setFills, setFillsToolDefinition,
  deleteNode, deleteNodeToolDefinition,
  getSelection, getSelectionToolDefinition,
} from './tools/write/index.js';

import {
  captureWebpageTool, captureWebpageToolDefinition,
  reconstructPage, reconstructPageToolDefinition,
  generateUI, generateUIToolDefinition,
  analyzeCodebaseTool, analyzeCodebaseToolDefinition,
  syncDesignTokens, syncDesignTokensToolDefinition,
} from './tools/orchestrated/index.js';

const logger = createLogger('server');

export function createServer(): McpServer {
  const server = new McpServer({
    name: 'figmad-mcp',
    version: '0.1.0',
  });

  server.tool(
    getFileToolDefinition.name,
    getFileToolDefinition.description,
    getFileToolDefinition.inputSchema,
    async (params) => {
      try {
        const result = await getFile(params as Parameters<typeof getFile>[0]);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const { code, message } = formatErrorForMcp(error);
        return { content: [{ type: 'text', text: `Error [${code}]: ${message}` }], isError: true };
      }
    }
  );

  server.tool(
    getNodeToolDefinition.name,
    getNodeToolDefinition.description,
    getNodeToolDefinition.inputSchema,
    async (params) => {
      try {
        const result = await getNode(params as Parameters<typeof getNode>[0]);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const { code, message } = formatErrorForMcp(error);
        return { content: [{ type: 'text', text: `Error [${code}]: ${message}` }], isError: true };
      }
    }
  );

  server.tool(
    getComponentsToolDefinition.name,
    getComponentsToolDefinition.description,
    getComponentsToolDefinition.inputSchema,
    async (params) => {
      try {
        const result = await getComponents(params as Parameters<typeof getComponents>[0]);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const { code, message } = formatErrorForMcp(error);
        return { content: [{ type: 'text', text: `Error [${code}]: ${message}` }], isError: true };
      }
    }
  );

  server.tool(
    getStylesToolDefinition.name,
    getStylesToolDefinition.description,
    getStylesToolDefinition.inputSchema,
    async (params) => {
      try {
        const result = await getStyles(params as Parameters<typeof getStyles>[0]);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const { code, message } = formatErrorForMcp(error);
        return { content: [{ type: 'text', text: `Error [${code}]: ${message}` }], isError: true };
      }
    }
  );

  server.tool(
    getVariablesToolDefinition.name,
    getVariablesToolDefinition.description,
    getVariablesToolDefinition.inputSchema,
    async (params) => {
      try {
        const result = await getVariables(params as Parameters<typeof getVariables>[0]);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const { code, message } = formatErrorForMcp(error);
        return { content: [{ type: 'text', text: `Error [${code}]: ${message}` }], isError: true };
      }
    }
  );

  server.tool(
    exportImageToolDefinition.name,
    exportImageToolDefinition.description,
    exportImageToolDefinition.inputSchema,
    async (params) => {
      try {
        const result = await exportImage(params as Parameters<typeof exportImage>[0]);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const { code, message } = formatErrorForMcp(error);
        return { content: [{ type: 'text', text: `Error [${code}]: ${message}` }], isError: true };
      }
    }
  );

  server.tool(
    createFrameToolDefinition.name,
    createFrameToolDefinition.description,
    createFrameToolDefinition.inputSchema,
    async (params) => {
      try {
        const result = await createFrame(params as Parameters<typeof createFrame>[0]);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const { code, message } = formatErrorForMcp(error);
        return { content: [{ type: 'text', text: `Error [${code}]: ${message}` }], isError: true };
      }
    }
  );

  server.tool(
    createRectangleToolDefinition.name,
    createRectangleToolDefinition.description,
    createRectangleToolDefinition.inputSchema,
    async (params) => {
      try {
        const result = await createRectangle(params as Parameters<typeof createRectangle>[0]);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const { code, message } = formatErrorForMcp(error);
        return { content: [{ type: 'text', text: `Error [${code}]: ${message}` }], isError: true };
      }
    }
  );

  server.tool(
    createTextToolDefinition.name,
    createTextToolDefinition.description,
    createTextToolDefinition.inputSchema,
    async (params) => {
      try {
        const result = await createText(params as Parameters<typeof createText>[0]);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const { code, message } = formatErrorForMcp(error);
        return { content: [{ type: 'text', text: `Error [${code}]: ${message}` }], isError: true };
      }
    }
  );

  server.tool(
    updateNodeToolDefinition.name,
    updateNodeToolDefinition.description,
    updateNodeToolDefinition.inputSchema,
    async (params) => {
      try {
        const result = await updateNode(params as Parameters<typeof updateNode>[0]);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const { code, message } = formatErrorForMcp(error);
        return { content: [{ type: 'text', text: `Error [${code}]: ${message}` }], isError: true };
      }
    }
  );

  server.tool(
    applyAutoLayoutToolDefinition.name,
    applyAutoLayoutToolDefinition.description,
    applyAutoLayoutToolDefinition.inputSchema,
    async (params) => {
      try {
        const result = await applyAutoLayout(params as Parameters<typeof applyAutoLayout>[0]);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const { code, message } = formatErrorForMcp(error);
        return { content: [{ type: 'text', text: `Error [${code}]: ${message}` }], isError: true };
      }
    }
  );

  server.tool(
    setFillsToolDefinition.name,
    setFillsToolDefinition.description,
    setFillsToolDefinition.inputSchema,
    async (params) => {
      try {
        const result = await setFills(params as Parameters<typeof setFills>[0]);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const { code, message } = formatErrorForMcp(error);
        return { content: [{ type: 'text', text: `Error [${code}]: ${message}` }], isError: true };
      }
    }
  );

  server.tool(
    deleteNodeToolDefinition.name,
    deleteNodeToolDefinition.description,
    deleteNodeToolDefinition.inputSchema,
    async (params) => {
      try {
        const result = await deleteNode(params as Parameters<typeof deleteNode>[0]);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const { code, message } = formatErrorForMcp(error);
        return { content: [{ type: 'text', text: `Error [${code}]: ${message}` }], isError: true };
      }
    }
  );

  server.tool(
    getSelectionToolDefinition.name,
    getSelectionToolDefinition.description,
    getSelectionToolDefinition.inputSchema,
    async () => {
      try {
        const result = await getSelection();
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const { code, message } = formatErrorForMcp(error);
        return { content: [{ type: 'text', text: `Error [${code}]: ${message}` }], isError: true };
      }
    }
  );

  server.tool(
    captureWebpageToolDefinition.name,
    captureWebpageToolDefinition.description,
    captureWebpageToolDefinition.inputSchema,
    async (params) => {
      try {
        const result = await captureWebpageTool(params as Parameters<typeof captureWebpageTool>[0]);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const { code, message } = formatErrorForMcp(error);
        return { content: [{ type: 'text', text: `Error [${code}]: ${message}` }], isError: true };
      }
    }
  );

  server.tool(
    reconstructPageToolDefinition.name,
    reconstructPageToolDefinition.description,
    reconstructPageToolDefinition.inputSchema,
    async (params) => {
      try {
        const result = await reconstructPage(params as Parameters<typeof reconstructPage>[0]);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const { code, message } = formatErrorForMcp(error);
        return { content: [{ type: 'text', text: `Error [${code}]: ${message}` }], isError: true };
      }
    }
  );

  server.tool(
    generateUIToolDefinition.name,
    generateUIToolDefinition.description,
    generateUIToolDefinition.inputSchema,
    async (params) => {
      try {
        const result = await generateUI(params as Parameters<typeof generateUI>[0]);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const { code, message } = formatErrorForMcp(error);
        return { content: [{ type: 'text', text: `Error [${code}]: ${message}` }], isError: true };
      }
    }
  );

  server.tool(
    analyzeCodebaseToolDefinition.name,
    analyzeCodebaseToolDefinition.description,
    analyzeCodebaseToolDefinition.inputSchema,
    async (params) => {
      try {
        const result = await analyzeCodebaseTool(params as Parameters<typeof analyzeCodebaseTool>[0]);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const { code, message } = formatErrorForMcp(error);
        return { content: [{ type: 'text', text: `Error [${code}]: ${message}` }], isError: true };
      }
    }
  );

  server.tool(
    syncDesignTokensToolDefinition.name,
    syncDesignTokensToolDefinition.description,
    syncDesignTokensToolDefinition.inputSchema,
    async (params) => {
      try {
        const result = await syncDesignTokens(params as Parameters<typeof syncDesignTokens>[0]);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const { code, message } = formatErrorForMcp(error);
        return { content: [{ type: 'text', text: `Error [${code}]: ${message}` }], isError: true };
      }
    }
  );

  server.tool(
    'plugin_status',
    'Check if the Figma plugin is connected. Write operations require the plugin.',
    { type: 'object', properties: {}, required: [] },
    async () => {
      const bridge = getPluginBridge();
      const connected = bridge.isConnected();
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            connected,
            message: connected 
              ? 'Figma plugin is connected. Write operations are available.'
              : 'Figma plugin is not connected. Please open Figma and run the figmad plugin. Read operations (get_file, export_image, etc.) still work.',
          }, null, 2),
        }],
      };
    }
  );

  return server;
}

export async function startServer(): Promise<void> {
  try {
    const config = getConfig();
    logger.info('Starting figmad-mcp server');
    
    const bridge = getPluginBridge(config.pluginBridgePort);
    await bridge.start();
    
    const server = createServer();
    const transport = new StdioServerTransport();
    
    await server.connect(transport);
    
    logger.info('Server running on stdio');
    logger.info(`Plugin bridge listening on port ${config.pluginBridgePort}`);
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}
