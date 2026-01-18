import { z } from 'zod';
import { getFigmaClient } from '../../services/figma-api/index.js';
import { getAnalysisById } from './analyze-codebase.js';
import { createLogger, hexToRgba } from '../../lib/index.js';
import type { DesignTokens } from '../../types/mcp.js';

const logger = createLogger('tool:sync-design-tokens');

export const syncDesignTokensSchema = z.object({
  direction: z.enum(['figma-to-code', 'code-to-figma', 'compare']).describe('Sync direction'),
  figmaFileKey: z.string().optional().describe('Figma file key for reading/writing tokens'),
  analysisId: z.string().optional().describe('Analysis ID from analyze_codebase'),
  codebasePath: z.string().optional().describe('Path to codebase (alternative to analysisId)'),
});

export type SyncDesignTokensParams = z.infer<typeof syncDesignTokensSchema>;

export async function syncDesignTokens(params: SyncDesignTokensParams) {
  const { direction, figmaFileKey, analysisId } = params;
  
  logger.info('Syncing design tokens', { direction, figmaFileKey, analysisId });
  
  let figmaTokens: DesignTokens | null = null;
  let codeTokens: DesignTokens | null = null;
  
  if (figmaFileKey) {
    figmaTokens = await fetchFigmaTokens(figmaFileKey);
  }
  
  if (analysisId) {
    const analysis = getAnalysisById(analysisId);
    if (analysis) {
      codeTokens = analysis.designTokens;
    }
  }
  
  if (direction === 'compare') {
    return compareTokens(figmaTokens, codeTokens);
  }
  
  if (direction === 'figma-to-code') {
    if (!figmaTokens) {
      throw new Error('figmaFileKey is required for figma-to-code sync');
    }
    return {
      direction: 'figma-to-code',
      tokens: figmaTokens,
      message: 'Figma tokens extracted. Use these to update your code.',
      cssVariables: generateCSSVariables(figmaTokens),
      tailwindConfig: generateTailwindExtend(figmaTokens),
    };
  }
  
  if (direction === 'code-to-figma') {
    if (!codeTokens) {
      throw new Error('analysisId or codebasePath is required for code-to-figma sync');
    }
    return {
      direction: 'code-to-figma',
      tokens: codeTokens,
      message: 'Code tokens extracted. Manual creation in Figma required (API limitation).',
      variableStructure: generateFigmaVariableStructure(codeTokens),
    };
  }
  
  throw new Error(`Invalid direction: ${direction}`);
}

async function fetchFigmaTokens(fileKey: string): Promise<DesignTokens> {
  const client = getFigmaClient();
  const tokens: DesignTokens = {
    colors: {},
    spacing: {},
    typography: {},
    shadows: {},
    borderRadius: {},
  };
  
  try {
    const varsResult = await client.getLocalVariables(fileKey);
    const variables = Object.values(varsResult.meta?.variables || {});
    const collections = Object.values(varsResult.meta?.variableCollections || {});
    
    for (const variable of variables) {
      const collection = collections.find(c => c.id === variable.variableCollectionId);
      const collectionName = collection?.name.toLowerCase() || '';
      const firstModeId = collection?.modes[0]?.modeId;
      const value = firstModeId ? variable.valuesByMode[firstModeId] : null;
      
      if (!value || typeof value === 'object' && 'type' in value) continue;
      
      if (variable.resolvedType === 'COLOR' && typeof value === 'object' && 'r' in value) {
        const rgba = value as { r: number; g: number; b: number; a: number };
        const hex = rgbaToHex(rgba);
        tokens.colors[variable.name] = hex;
      } else if (variable.resolvedType === 'FLOAT' && typeof value === 'number') {
        if (collectionName.includes('spacing') || variable.name.toLowerCase().includes('spacing')) {
          tokens.spacing[variable.name] = `${value}px`;
        } else if (collectionName.includes('radius') || variable.name.toLowerCase().includes('radius')) {
          tokens.borderRadius[variable.name] = `${value}px`;
        }
      }
    }
  } catch (error) {
    logger.debug('Error fetching Figma variables', { error });
  }
  
  try {
    const stylesResult = await client.getStyles(fileKey);
    const styles = stylesResult.meta?.styles || [];
    
    for (const style of styles) {
      if (style.styleType === 'FILL') {
        tokens.colors[style.name] = style.name;
      } else if (style.styleType === 'TEXT') {
        tokens.typography[style.name] = {
          fontFamily: '',
          fontSize: '',
          fontWeight: '',
          lineHeight: '',
        };
      } else if (style.styleType === 'EFFECT') {
        tokens.shadows[style.name] = style.name;
      }
    }
  } catch (error) {
    logger.debug('Error fetching Figma styles', { error });
  }
  
  return tokens;
}

function rgbaToHex(rgba: { r: number; g: number; b: number; a?: number }): string {
  const r = Math.round(rgba.r * 255).toString(16).padStart(2, '0');
  const g = Math.round(rgba.g * 255).toString(16).padStart(2, '0');
  const b = Math.round(rgba.b * 255).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

function compareTokens(figmaTokens: DesignTokens | null, codeTokens: DesignTokens | null) {
  const comparison = {
    colors: { inBoth: [] as string[], onlyFigma: [] as string[], onlyCode: [] as string[] },
    spacing: { inBoth: [] as string[], onlyFigma: [] as string[], onlyCode: [] as string[] },
    typography: { inBoth: [] as string[], onlyFigma: [] as string[], onlyCode: [] as string[] },
    shadows: { inBoth: [] as string[], onlyFigma: [] as string[], onlyCode: [] as string[] },
    borderRadius: { inBoth: [] as string[], onlyFigma: [] as string[], onlyCode: [] as string[] },
  };
  
  const categories: (keyof DesignTokens)[] = ['colors', 'spacing', 'typography', 'shadows', 'borderRadius'];
  
  for (const category of categories) {
    const figmaKeys = figmaTokens ? Object.keys(figmaTokens[category]) : [];
    const codeKeys = codeTokens ? Object.keys(codeTokens[category]) : [];
    
    const figmaSet = new Set(figmaKeys.map(k => k.toLowerCase()));
    const codeSet = new Set(codeKeys.map(k => k.toLowerCase()));
    
    for (const key of figmaKeys) {
      if (codeSet.has(key.toLowerCase())) {
        comparison[category].inBoth.push(key);
      } else {
        comparison[category].onlyFigma.push(key);
      }
    }
    
    for (const key of codeKeys) {
      if (!figmaSet.has(key.toLowerCase())) {
        comparison[category].onlyCode.push(key);
      }
    }
  }
  
  return {
    direction: 'compare',
    comparison,
    summary: {
      totalFigma: figmaTokens ? Object.values(figmaTokens).reduce((sum, obj) => sum + Object.keys(obj).length, 0) : 0,
      totalCode: codeTokens ? Object.values(codeTokens).reduce((sum, obj) => sum + Object.keys(obj).length, 0) : 0,
      matching: Object.values(comparison).reduce((sum, cat) => sum + cat.inBoth.length, 0),
    },
  };
}

function generateCSSVariables(tokens: DesignTokens): string {
  const lines = [':root {'];
  
  for (const [name, value] of Object.entries(tokens.colors)) {
    lines.push(`  --color-${kebabCase(name)}: ${value};`);
  }
  
  for (const [name, value] of Object.entries(tokens.spacing)) {
    lines.push(`  --spacing-${kebabCase(name)}: ${value};`);
  }
  
  for (const [name, value] of Object.entries(tokens.borderRadius)) {
    lines.push(`  --radius-${kebabCase(name)}: ${value};`);
  }
  
  for (const [name, value] of Object.entries(tokens.shadows)) {
    lines.push(`  --shadow-${kebabCase(name)}: ${value};`);
  }
  
  lines.push('}');
  return lines.join('\n');
}

function generateTailwindExtend(tokens: DesignTokens): string {
  const config: Record<string, Record<string, string>> = {
    colors: {},
    spacing: {},
    borderRadius: {},
    boxShadow: {},
  };
  
  for (const [name, value] of Object.entries(tokens.colors)) {
    config.colors[kebabCase(name)] = value;
  }
  
  for (const [name, value] of Object.entries(tokens.spacing)) {
    config.spacing[kebabCase(name)] = value;
  }
  
  for (const [name, value] of Object.entries(tokens.borderRadius)) {
    config.borderRadius[kebabCase(name)] = value;
  }
  
  for (const [name, value] of Object.entries(tokens.shadows)) {
    config.boxShadow[kebabCase(name)] = value;
  }
  
  return JSON.stringify({ extend: config }, null, 2);
}

function generateFigmaVariableStructure(tokens: DesignTokens) {
  return {
    collections: [
      {
        name: 'Colors',
        modes: ['Default'],
        variables: Object.entries(tokens.colors).map(([name, value]) => ({
          name,
          type: 'COLOR',
          value,
        })),
      },
      {
        name: 'Spacing',
        modes: ['Default'],
        variables: Object.entries(tokens.spacing).map(([name, value]) => ({
          name,
          type: 'FLOAT',
          value: parseFloat(value) || 0,
        })),
      },
      {
        name: 'Border Radius',
        modes: ['Default'],
        variables: Object.entries(tokens.borderRadius).map(([name, value]) => ({
          name,
          type: 'FLOAT',
          value: parseFloat(value) || 0,
        })),
      },
    ],
  };
}

function kebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

export const syncDesignTokensToolDefinition = {
  name: 'sync_design_tokens',
  description: 'Compare and sync design tokens between Figma and code. Can extract tokens from Figma variables/styles or from codebase analysis.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      direction: { 
        type: 'string', 
        enum: ['figma-to-code', 'code-to-figma', 'compare'],
        description: 'Sync direction: figma-to-code extracts Figma tokens, code-to-figma extracts code tokens, compare shows differences' 
      },
      figmaFileKey: { type: 'string', description: 'Figma file key (required for figma-to-code and compare)' },
      analysisId: { type: 'string', description: 'Analysis ID from analyze_codebase' },
      codebasePath: { type: 'string', description: 'Path to codebase (alternative to analysisId)' },
    },
    required: ['direction'],
  },
};
