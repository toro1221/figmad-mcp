import { WebSocketServer, WebSocket } from 'ws';
import { createLogger, PluginNotConnectedError, PluginTimeoutError, generateId } from '../../lib/index.js';
import type { PluginCommand, PluginResponse, PluginResult } from '../../types/commands.js';

const logger = createLogger('plugin-bridge');

const COMMAND_TIMEOUT_MS = 30000;

type PendingCommand = {
  resolve: (result: PluginResult) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
};

export class PluginBridge {
  private wss: WebSocketServer | null = null;
  private client: WebSocket | null = null;
  private pendingCommands: Map<string, PendingCommand> = new Map();
  private port: number;
  private isRunning: boolean = false;

  constructor(port: number = 9001) {
    this.port = port;
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isRunning) {
        resolve();
        return;
      }

      this.wss = new WebSocketServer({ port: this.port });

      this.wss.on('listening', () => {
        this.isRunning = true;
        logger.info(`Plugin bridge listening on port ${this.port}`);
        resolve();
      });

      this.wss.on('error', (error) => {
        logger.error('WebSocket server error', error);
        reject(error);
      });

      this.wss.on('connection', (ws) => {
        this.handleConnection(ws);
      });
    });
  }

  stop(): void {
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
    this.client = null;
    this.isRunning = false;
    
    for (const [id, pending] of this.pendingCommands) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Plugin bridge stopped'));
    }
    this.pendingCommands.clear();
    
    logger.info('Plugin bridge stopped');
  }

  private handleConnection(ws: WebSocket): void {
    if (this.client) {
      logger.warn('New connection replacing existing client');
      this.client.close();
    }

    this.client = ws;
    logger.info('Figma plugin connected');

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString()) as PluginResponse;
        this.handleResponse(message);
      } catch (error) {
        logger.error('Failed to parse plugin message', error);
      }
    });

    ws.on('close', () => {
      if (this.client === ws) {
        this.client = null;
        logger.info('Figma plugin disconnected');
      }
    });

    ws.on('error', (error) => {
      logger.error('WebSocket client error', error);
    });
  }

  private handleResponse(response: PluginResponse): void {
    const pending = this.pendingCommands.get(response.id);
    if (!pending) {
      logger.warn(`Received response for unknown command: ${response.id}`);
      return;
    }

    clearTimeout(pending.timeout);
    this.pendingCommands.delete(response.id);

    if (response.success && response.result) {
      pending.resolve(response.result);
    } else {
      pending.reject(new Error(response.error || 'Unknown plugin error'));
    }
  }

  isConnected(): boolean {
    return this.client !== null && this.client.readyState === WebSocket.OPEN;
  }

  async sendCommand<T extends PluginResult = PluginResult>(
    command: Omit<PluginCommand, 'id' | 'timestamp'>
  ): Promise<T> {
    if (!this.isConnected()) {
      throw new PluginNotConnectedError();
    }

    const id = generateId();
    const fullCommand: PluginCommand = {
      ...command,
      id,
      timestamp: Date.now(),
    } as PluginCommand;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingCommands.delete(id);
        reject(new PluginTimeoutError(command.type, COMMAND_TIMEOUT_MS));
      }, COMMAND_TIMEOUT_MS);

      this.pendingCommands.set(id, {
        resolve: resolve as (result: PluginResult) => void,
        reject,
        timeout,
      });

      this.client!.send(JSON.stringify(fullCommand));
      logger.debug(`Sent command: ${command.type}`, { id });
    });
  }

  async createFrame(params: PluginCommand extends { type: 'CREATE_FRAME'; params: infer P } ? P : never): Promise<{ nodeId: string }> {
    return this.sendCommand({ type: 'CREATE_FRAME', params });
  }

  async createRectangle(params: PluginCommand extends { type: 'CREATE_RECTANGLE'; params: infer P } ? P : never): Promise<{ nodeId: string }> {
    return this.sendCommand({ type: 'CREATE_RECTANGLE', params });
  }

  async createText(params: PluginCommand extends { type: 'CREATE_TEXT'; params: infer P } ? P : never): Promise<{ nodeId: string }> {
    return this.sendCommand({ type: 'CREATE_TEXT', params });
  }

  async createEllipse(params: PluginCommand extends { type: 'CREATE_ELLIPSE'; params: infer P } ? P : never): Promise<{ nodeId: string }> {
    return this.sendCommand({ type: 'CREATE_ELLIPSE', params });
  }

  async updateNode(params: PluginCommand extends { type: 'UPDATE_NODE'; params: infer P } ? P : never): Promise<{ nodeId: string }> {
    return this.sendCommand({ type: 'UPDATE_NODE', params });
  }

  async deleteNode(nodeId: string): Promise<{ nodeId: string }> {
    return this.sendCommand({ type: 'DELETE_NODE', params: { nodeId } });
  }

  async setFills(params: PluginCommand extends { type: 'SET_FILLS'; params: infer P } ? P : never): Promise<{ nodeId: string }> {
    return this.sendCommand({ type: 'SET_FILLS', params });
  }

  async setStrokes(params: PluginCommand extends { type: 'SET_STROKES'; params: infer P } ? P : never): Promise<{ nodeId: string }> {
    return this.sendCommand({ type: 'SET_STROKES', params });
  }

  async setEffects(params: PluginCommand extends { type: 'SET_EFFECTS'; params: infer P } ? P : never): Promise<{ nodeId: string }> {
    return this.sendCommand({ type: 'SET_EFFECTS', params });
  }

  async applyAutoLayout(params: PluginCommand extends { type: 'APPLY_AUTO_LAYOUT'; params: infer P } ? P : never): Promise<{ nodeId: string }> {
    return this.sendCommand({ type: 'APPLY_AUTO_LAYOUT', params });
  }

  async groupNodes(params: PluginCommand extends { type: 'GROUP_NODES'; params: infer P } ? P : never): Promise<{ nodeId: string }> {
    return this.sendCommand({ type: 'GROUP_NODES', params });
  }

  async getSelection(): Promise<{ selection: { id: string; name: string; type: string }[] }> {
    return this.sendCommand({ type: 'GET_SELECTION', params: {} });
  }

  async setSelection(nodeIds: string[]): Promise<{ nodeIds: string[] }> {
    return this.sendCommand({ type: 'SET_SELECTION', params: { nodeIds } });
  }

  async getCurrentPage(): Promise<{ page: { id: string; name: string } }> {
    return this.sendCommand({ type: 'GET_CURRENT_PAGE', params: {} });
  }

  async createPage(name: string): Promise<{ page: { id: string; name: string } }> {
    return this.sendCommand({ type: 'CREATE_PAGE', params: { name } });
  }
}

let bridgeInstance: PluginBridge | null = null;

export function getPluginBridge(port?: number): PluginBridge {
  if (!bridgeInstance) {
    bridgeInstance = new PluginBridge(port);
  }
  return bridgeInstance;
}
