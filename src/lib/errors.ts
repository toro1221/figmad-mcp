export class FigmadError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'FigmadError';
  }
}

export class FigmaApiError extends FigmadError {
  constructor(message: string, statusCode: number, details?: unknown) {
    super(message, 'FIGMA_API_ERROR', statusCode, details);
    this.name = 'FigmaApiError';
  }
}

export class PluginBridgeError extends FigmadError {
  constructor(message: string, details?: unknown) {
    super(message, 'PLUGIN_BRIDGE_ERROR', undefined, details);
    this.name = 'PluginBridgeError';
  }
}

export class PluginNotConnectedError extends PluginBridgeError {
  constructor() {
    super('Figma plugin is not connected. Please open Figma and run the figmad plugin.');
    this.name = 'PluginNotConnectedError';
  }
}

export class PluginTimeoutError extends PluginBridgeError {
  constructor(commandType: string, timeoutMs: number) {
    super(`Plugin command '${commandType}' timed out after ${timeoutMs}ms`);
    this.name = 'PluginTimeoutError';
  }
}

export class CaptureError extends FigmadError {
  constructor(message: string, details?: unknown) {
    super(message, 'CAPTURE_ERROR', undefined, details);
    this.name = 'CaptureError';
  }
}

export class ValidationError extends FigmadError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export function isRetryableError(error: unknown): boolean {
  if (error instanceof FigmaApiError) {
    return error.statusCode === 429 || error.statusCode === 503;
  }
  return false;
}

export function formatErrorForMcp(error: unknown): { code: string; message: string } {
  if (error instanceof FigmadError) {
    return { code: error.code, message: error.message };
  }
  if (error instanceof Error) {
    return { code: 'UNKNOWN_ERROR', message: error.message };
  }
  return { code: 'UNKNOWN_ERROR', message: String(error) };
}
