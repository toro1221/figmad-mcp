import 'dotenv/config';

export interface Config {
  figmaAccessToken: string;
  pluginBridgePort: number;
  debug: boolean;
  captureDir: string;
}

function getEnvOrThrow(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getEnvOrDefault(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

function getEnvBool(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

let config: Config | null = null;

export function getConfig(): Config {
  if (config) return config;
  
  config = {
    figmaAccessToken: getEnvOrThrow('FIGMA_ACCESS_TOKEN'),
    pluginBridgePort: getEnvNumber('PLUGIN_BRIDGE_PORT', 9001),
    debug: getEnvBool('DEBUG', false),
    captureDir: getEnvOrDefault('CAPTURE_DIR', './captures'),
  };
  
  return config;
}

export function isDebug(): boolean {
  return getConfig().debug;
}
