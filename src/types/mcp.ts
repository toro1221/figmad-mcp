/**
 * MCP-related type definitions
 */

import type { FigmaNode, FigmaVariable, FigmaVariableCollection } from './figma.js';
import type { WebCapture } from './capture.js';

// Tool parameter types
export interface GetFileParams {
  fileKey: string;
  depth?: number;
  nodeId?: string;
}

export interface GetNodeParams {
  fileKey: string;
  nodeIds: string[];
  depth?: number;
}

export interface GetComponentsParams {
  fileKey: string;
}

export interface GetStylesParams {
  fileKey: string;
}

export interface GetVariablesParams {
  fileKey: string;
}

export interface ExportImageParams {
  fileKey: string;
  nodeId: string;
  format?: 'png' | 'jpg' | 'svg' | 'pdf';
  scale?: number;
}

export interface GetCommentsParams {
  fileKey: string;
}

export interface PostCommentParams {
  fileKey: string;
  message: string;
  nodeId?: string;
  x?: number;
  y?: number;
  parentCommentId?: string;
}

export interface SearchFilesParams {
  teamId: string;
  query: string;
}

// Orchestrated tool params
export interface GenerateUIParams {
  prompt: string;
  style?: 'minimal' | 'modern' | 'corporate' | 'playful';
  targetFileKey?: string;
  targetFrameId?: string;
  width?: number;
  height?: number;
}

export interface CaptureWebpageParams {
  url: string;
  viewport?: { width: number; height: number };
  fullPage?: boolean;
  waitForSelector?: string;
  authentication?: {
    cookies?: { name: string; value: string; domain: string }[];
  };
}

export interface ReconstructPageParams {
  captureId: string;
  targetFileKey?: string;
  createComponents?: boolean;
}

export interface AnalyzeCodebaseParams {
  path: string;
  framework?: 'react' | 'vue' | 'svelte' | 'angular' | 'html';
  includeTokens?: boolean;
}

export interface SyncDesignTokensParams {
  source: 'code' | 'figma';
  figmaFileKey?: string;
  codebasePath?: string;
  direction: 'push' | 'pull' | 'bidirectional';
}

// Tool result types
export interface GetFileResult {
  file: {
    name: string;
    lastModified: string;
    version: string;
    thumbnailUrl: string;
  };
  document: FigmaNode;
}

export interface GetNodeResult {
  nodes: Record<string, { document: FigmaNode }>;
}

export interface ExportImageResult {
  images: Record<string, string>; // nodeId -> URL
}

export interface GenerateUIResult {
  success: boolean;
  frameId: string;
  message: string;
  nodeCount: number;
}

export interface CaptureResult {
  captureId: string;
  url: string;
  viewport: { width: number; height: number };
  componentCount: number;
  screenshotPath: string;
}

export interface AnalysisResult {
  analysisId: string;
  framework: string;
  componentCount: number;
  tokenCount: number;
  components: {
    name: string;
    path: string;
    props: string[];
  }[];
}

// Resource types
export interface FileResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

// Store types for captures and analyses
export interface CaptureStore {
  captures: Map<string, WebCapture>;
  add(capture: WebCapture): void;
  get(id: string): WebCapture | undefined;
  delete(id: string): boolean;
  list(): { id: string; url: string; timestamp: Date }[];
}

export interface AnalysisStore {
  analyses: Map<string, CodeAnalysis>;
  add(analysis: CodeAnalysis): void;
  get(id: string): CodeAnalysis | undefined;
  delete(id: string): boolean;
  list(): { id: string; path: string; framework: string }[];
}

export interface CodeAnalysis {
  id: string;
  path: string;
  framework: 'react' | 'vue' | 'svelte' | 'angular' | 'html';
  timestamp: Date;
  components: ComponentDefinition[];
  designTokens: DesignTokens;
}

export interface ComponentDefinition {
  name: string;
  filePath: string;
  props: PropDefinition[];
  variants: string[];
  usedStyles: string[];
  childComponents: string[];
}

export interface PropDefinition {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: string;
}

export interface DesignTokens {
  colors: Record<string, string>;
  spacing: Record<string, string>;
  typography: Record<string, TypographyToken>;
  shadows: Record<string, string>;
  borderRadius: Record<string, string>;
}

export interface TypographyToken {
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  letterSpacing?: string;
}
