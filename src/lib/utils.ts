import type { RGBA } from '../types/figma.js';

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function hexToRgba(hex: string): RGBA {
  const cleaned = hex.replace('#', '');
  const hasAlpha = cleaned.length === 8;
  
  const r = parseInt(cleaned.substring(0, 2), 16) / 255;
  const g = parseInt(cleaned.substring(2, 4), 16) / 255;
  const b = parseInt(cleaned.substring(4, 6), 16) / 255;
  const a = hasAlpha ? parseInt(cleaned.substring(6, 8), 16) / 255 : 1;
  
  return { r, g, b, a };
}

export function rgbaToHex(rgba: RGBA): string {
  const r = Math.round(rgba.r * 255).toString(16).padStart(2, '0');
  const g = Math.round(rgba.g * 255).toString(16).padStart(2, '0');
  const b = Math.round(rgba.b * 255).toString(16).padStart(2, '0');
  const a = rgba.a !== undefined && rgba.a !== 1 
    ? Math.round(rgba.a * 255).toString(16).padStart(2, '0')
    : '';
  return `#${r}${g}${b}${a}`;
}

export function parseColorString(color: string): RGBA | null {
  if (color.startsWith('#')) {
    return hexToRgba(color);
  }
  
  const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgbaMatch) {
    return {
      r: parseInt(rgbaMatch[1]) / 255,
      g: parseInt(rgbaMatch[2]) / 255,
      b: parseInt(rgbaMatch[3]) / 255,
      a: rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1,
    };
  }
  
  return null;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function extractFileKeyFromUrl(url: string): string | null {
  const patterns = [
    /figma\.com\/file\/([a-zA-Z0-9]+)/,
    /figma\.com\/design\/([a-zA-Z0-9]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

export function parseNodeId(nodeId: string): { fileKey: string; nodeId: string } | null {
  if (nodeId.includes(':')) {
    return null;
  }
  return null;
}

export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let unitIndex = 0;
  let size = bytes;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

export async function retry<T>(
  fn: () => Promise<T>,
  options: { maxAttempts?: number; delayMs?: number; backoff?: boolean } = {}
): Promise<T> {
  const { maxAttempts = 3, delayMs = 1000, backoff = true } = options;
  
  let lastError: unknown;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        const delay = backoff ? delayMs * attempt : delayMs;
        await sleep(delay);
      }
    }
  }
  
  throw lastError;
}
