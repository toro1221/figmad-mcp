import { getConfig, createLogger, FigmaApiError, retry } from '../../lib/index.js';
import type { 
  FigmaFile, 
  FigmaNode, 
  ComponentMetadata, 
  StyleMetadata,
  FigmaVariable,
  FigmaVariableCollection,
  ImageFormat 
} from '../../types/figma.js';

const logger = createLogger('figma-api');

const BASE_URL = 'https://api.figma.com';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
}

export class FigmaApiClient {
  private token: string;

  constructor(token?: string) {
    this.token = token || getConfig().figmaAccessToken;
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, params } = options;
    
    let url = `${BASE_URL}${endpoint}`;
    
    if (params) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      }
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    const headers: Record<string, string> = {
      'X-Figma-Token': this.token,
      'Content-Type': 'application/json',
    };

    logger.debug(`${method} ${endpoint}`, { params });

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error(`API error: ${response.status}`, { endpoint, errorBody });
      throw new FigmaApiError(
        `Figma API error: ${response.statusText}`,
        response.status,
        { endpoint, body: errorBody }
      );
    }

    return response.json() as Promise<T>;
  }

  private async requestWithRetry<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    return retry(() => this.request<T>(endpoint, options), {
      maxAttempts: 3,
      delayMs: 1000,
      backoff: true,
    });
  }

  async getFile(fileKey: string, options: { depth?: number; nodeId?: string } = {}): Promise<FigmaFile> {
    const params: Record<string, string | number | undefined> = {};
    if (options.depth !== undefined) params.depth = options.depth;
    if (options.nodeId) params.ids = options.nodeId;
    
    return this.requestWithRetry(`/v1/files/${fileKey}`, { params });
  }

  async getFileNodes(
    fileKey: string, 
    nodeIds: string[], 
    options: { depth?: number } = {}
  ): Promise<{ nodes: Record<string, { document: FigmaNode }> }> {
    const params: Record<string, string | number | undefined> = {
      ids: nodeIds.join(','),
    };
    if (options.depth !== undefined) params.depth = options.depth;
    
    return this.requestWithRetry(`/v1/files/${fileKey}/nodes`, { params });
  }

  async getComponents(fileKey: string): Promise<{ meta: { components: ComponentMetadata[] } }> {
    return this.requestWithRetry(`/v1/files/${fileKey}/components`);
  }

  async getStyles(fileKey: string): Promise<{ meta: { styles: StyleMetadata[] } }> {
    return this.requestWithRetry(`/v1/files/${fileKey}/styles`);
  }

  async getLocalVariables(fileKey: string): Promise<{
    meta: {
      variables: Record<string, FigmaVariable>;
      variableCollections: Record<string, FigmaVariableCollection>;
    };
  }> {
    return this.requestWithRetry(`/v1/files/${fileKey}/variables/local`);
  }

  async getPublishedVariables(fileKey: string): Promise<{
    meta: {
      variables: Record<string, FigmaVariable>;
      variableCollections: Record<string, FigmaVariableCollection>;
    };
  }> {
    return this.requestWithRetry(`/v1/files/${fileKey}/variables/published`);
  }

  async exportImages(
    fileKey: string,
    nodeIds: string[],
    options: { format?: ImageFormat; scale?: number; contentsOnly?: boolean } = {}
  ): Promise<{ images: Record<string, string> }> {
    const params: Record<string, string | number | boolean | undefined> = {
      ids: nodeIds.join(','),
      format: options.format || 'png',
      scale: options.scale || 1,
      contents_only: options.contentsOnly,
    };
    
    return this.requestWithRetry(`/v1/images/${fileKey}`, { params });
  }

  async getComments(fileKey: string): Promise<{ comments: Comment[] }> {
    return this.requestWithRetry(`/v1/files/${fileKey}/comments`);
  }

  async postComment(
    fileKey: string,
    message: string,
    options: { nodeId?: string; x?: number; y?: number; parentCommentId?: string } = {}
  ): Promise<{ id: string }> {
    const body: Record<string, unknown> = { message };
    
    if (options.nodeId || (options.x !== undefined && options.y !== undefined)) {
      body.client_meta = {
        node_id: options.nodeId,
        x: options.x,
        y: options.y,
      };
    }
    
    if (options.parentCommentId) {
      body.comment_id = options.parentCommentId;
    }
    
    return this.request(`/v1/files/${fileKey}/comments`, { method: 'POST', body });
  }

  async getTeamProjects(teamId: string): Promise<{ projects: { id: string; name: string }[] }> {
    return this.requestWithRetry(`/v1/teams/${teamId}/projects`);
  }

  async getProjectFiles(projectId: string): Promise<{ files: { key: string; name: string }[] }> {
    return this.requestWithRetry(`/v1/projects/${projectId}/files`);
  }

  async getMe(): Promise<{ id: string; email: string; handle: string }> {
    return this.requestWithRetry('/v1/me');
  }
}

let clientInstance: FigmaApiClient | null = null;

export function getFigmaClient(): FigmaApiClient {
  if (!clientInstance) {
    clientInstance = new FigmaApiClient();
  }
  return clientInstance;
}
