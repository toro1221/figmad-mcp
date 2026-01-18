import { z } from 'zod';
import { analyzeCodebase } from '../../services/code-analyzer/index.js';
import { createLogger } from '../../lib/index.js';
import type { CodeAnalysis } from '../../types/mcp.js';

const logger = createLogger('tool:analyze-codebase');

const analysisStore = new Map<string, CodeAnalysis>();

export const analyzeCodebaseSchema = z.object({
  path: z.string().describe('Path to the codebase root directory'),
  framework: z.enum(['react', 'vue', 'svelte', 'angular', 'html']).optional().describe('Framework to use for parsing'),
  includeTokens: z.boolean().optional().describe('Extract design tokens from Tailwind/CSS'),
});

export type AnalyzeCodebaseParams = z.infer<typeof analyzeCodebaseSchema>;

export async function analyzeCodebaseTool(params: AnalyzeCodebaseParams) {
  const { path, framework, includeTokens = true } = params;
  
  logger.info('Analyzing codebase', { path, framework });
  
  const analysis = await analyzeCodebase(path, { framework, includeTokens });
  
  analysisStore.set(analysis.id, analysis);
  
  return {
    analysisId: analysis.id,
    framework: analysis.framework,
    componentCount: analysis.components.length,
    components: analysis.components.map(c => ({
      name: c.name,
      path: c.filePath,
      propCount: c.props.length,
      variants: c.variants,
    })),
    tokens: {
      colorCount: Object.keys(analysis.designTokens.colors).length,
      spacingCount: Object.keys(analysis.designTokens.spacing).length,
      typographyCount: Object.keys(analysis.designTokens.typography).length,
      shadowCount: Object.keys(analysis.designTokens.shadows).length,
      radiusCount: Object.keys(analysis.designTokens.borderRadius).length,
    },
    designTokens: analysis.designTokens,
  };
}

export function getAnalysisById(id: string): CodeAnalysis | undefined {
  return analysisStore.get(id);
}

export function listAnalyses(): { id: string; path: string; framework: string }[] {
  return Array.from(analysisStore.values()).map(a => ({
    id: a.id,
    path: a.path,
    framework: a.framework,
  }));
}

export const analyzeCodebaseToolDefinition = {
  name: 'analyze_codebase',
  description: 'Analyze a codebase to extract component definitions, props, and design tokens. Supports React, Vue, Svelte, Angular. Extracts Tailwind config and CSS variables.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      path: { type: 'string', description: 'Path to the codebase root directory' },
      framework: { 
        type: 'string', 
        enum: ['react', 'vue', 'svelte', 'angular', 'html'],
        description: 'Framework (auto-detected if not specified)' 
      },
      includeTokens: { type: 'boolean', description: 'Extract design tokens (default: true)' },
    },
    required: ['path'],
  },
};
