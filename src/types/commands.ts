/**
 * Plugin Bridge command types
 * Commands sent from MCP server to Figma plugin
 */

export type PluginCommand =
  | CreateFrameCommand
  | CreateRectangleCommand
  | CreateEllipseCommand
  | CreateTextCommand
  | CreateLineCommand
  | CreateComponentCommand
  | CreateInstanceCommand
  | UpdateNodeCommand
  | DeleteNodeCommand
  | GroupNodesCommand
  | SetFillsCommand
  | SetStrokesCommand
  | SetEffectsCommand
  | ApplyAutoLayoutCommand
  | SetConstraintsCommand
  | MoveNodeCommand
  | ResizeNodeCommand
  | CloneNodeCommand
  | GetSelectionCommand
  | SetSelectionCommand
  | GetCurrentPageCommand
  | CreatePageCommand;

export interface BaseCommand {
  id: string;
  timestamp: number;
}

export interface CreateFrameCommand extends BaseCommand {
  type: 'CREATE_FRAME';
  params: {
    name: string;
    x?: number;
    y?: number;
    width: number;
    height: number;
    parentId?: string;
    fills?: PaintParam[];
  };
}

export interface CreateRectangleCommand extends BaseCommand {
  type: 'CREATE_RECTANGLE';
  params: {
    name?: string;
    x?: number;
    y?: number;
    width: number;
    height: number;
    parentId?: string;
    fills?: PaintParam[];
    cornerRadius?: number;
  };
}

export interface CreateEllipseCommand extends BaseCommand {
  type: 'CREATE_ELLIPSE';
  params: {
    name?: string;
    x?: number;
    y?: number;
    width: number;
    height: number;
    parentId?: string;
    fills?: PaintParam[];
  };
}

export interface CreateTextCommand extends BaseCommand {
  type: 'CREATE_TEXT';
  params: {
    characters: string;
    x?: number;
    y?: number;
    parentId?: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: number;
    fills?: PaintParam[];
    textAlignHorizontal?: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
    textAlignVertical?: 'TOP' | 'CENTER' | 'BOTTOM';
    width?: number;
    height?: number;
  };
}

export interface CreateLineCommand extends BaseCommand {
  type: 'CREATE_LINE';
  params: {
    name?: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    parentId?: string;
    strokes?: PaintParam[];
    strokeWeight?: number;
  };
}

export interface CreateComponentCommand extends BaseCommand {
  type: 'CREATE_COMPONENT';
  params: {
    name: string;
    nodeId?: string; // Convert existing node to component
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  };
}

export interface CreateInstanceCommand extends BaseCommand {
  type: 'CREATE_INSTANCE';
  params: {
    componentId: string;
    x?: number;
    y?: number;
    parentId?: string;
  };
}

export interface UpdateNodeCommand extends BaseCommand {
  type: 'UPDATE_NODE';
  params: {
    nodeId: string;
    properties: Partial<{
      name: string;
      visible: boolean;
      locked: boolean;
      opacity: number;
      x: number;
      y: number;
      width: number;
      height: number;
      rotation: number;
      cornerRadius: number;
      characters: string;
      fontSize: number;
      fontFamily: string;
      fontWeight: number;
      textAlignHorizontal: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
      textAlignVertical: 'TOP' | 'CENTER' | 'BOTTOM';
    }>;
  };
}

export interface DeleteNodeCommand extends BaseCommand {
  type: 'DELETE_NODE';
  params: {
    nodeId: string;
  };
}

export interface GroupNodesCommand extends BaseCommand {
  type: 'GROUP_NODES';
  params: {
    nodeIds: string[];
    name?: string;
  };
}

export interface SetFillsCommand extends BaseCommand {
  type: 'SET_FILLS';
  params: {
    nodeId: string;
    fills: PaintParam[];
  };
}

export interface SetStrokesCommand extends BaseCommand {
  type: 'SET_STROKES';
  params: {
    nodeId: string;
    strokes: PaintParam[];
    strokeWeight?: number;
  };
}

export interface SetEffectsCommand extends BaseCommand {
  type: 'SET_EFFECTS';
  params: {
    nodeId: string;
    effects: EffectParam[];
  };
}

export interface ApplyAutoLayoutCommand extends BaseCommand {
  type: 'APPLY_AUTO_LAYOUT';
  params: {
    nodeId: string;
    direction: 'HORIZONTAL' | 'VERTICAL';
    gap?: number;
    paddingLeft?: number;
    paddingRight?: number;
    paddingTop?: number;
    paddingBottom?: number;
    primaryAxisSizing?: 'FIXED' | 'AUTO';
    counterAxisSizing?: 'FIXED' | 'AUTO';
    primaryAxisAlign?: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
    counterAxisAlign?: 'MIN' | 'CENTER' | 'MAX' | 'BASELINE';
  };
}

export interface SetConstraintsCommand extends BaseCommand {
  type: 'SET_CONSTRAINTS';
  params: {
    nodeId: string;
    horizontal: 'LEFT' | 'RIGHT' | 'CENTER' | 'LEFT_RIGHT' | 'SCALE';
    vertical: 'TOP' | 'BOTTOM' | 'CENTER' | 'TOP_BOTTOM' | 'SCALE';
  };
}

export interface MoveNodeCommand extends BaseCommand {
  type: 'MOVE_NODE';
  params: {
    nodeId: string;
    x: number;
    y: number;
  };
}

export interface ResizeNodeCommand extends BaseCommand {
  type: 'RESIZE_NODE';
  params: {
    nodeId: string;
    width: number;
    height: number;
  };
}

export interface CloneNodeCommand extends BaseCommand {
  type: 'CLONE_NODE';
  params: {
    nodeId: string;
    x?: number;
    y?: number;
  };
}

export interface GetSelectionCommand extends BaseCommand {
  type: 'GET_SELECTION';
  params: Record<string, never>;
}

export interface SetSelectionCommand extends BaseCommand {
  type: 'SET_SELECTION';
  params: {
    nodeIds: string[];
  };
}

export interface GetCurrentPageCommand extends BaseCommand {
  type: 'GET_CURRENT_PAGE';
  params: Record<string, never>;
}

export interface CreatePageCommand extends BaseCommand {
  type: 'CREATE_PAGE';
  params: {
    name: string;
  };
}

// Parameter types
export interface PaintParam {
  type: 'SOLID' | 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'IMAGE';
  color?: { r: number; g: number; b: number; a?: number };
  opacity?: number;
  visible?: boolean;
  gradientStops?: { position: number; color: { r: number; g: number; b: number; a?: number } }[];
  imageUrl?: string;
}

export interface EffectParam {
  type: 'DROP_SHADOW' | 'INNER_SHADOW' | 'LAYER_BLUR' | 'BACKGROUND_BLUR';
  radius: number;
  color?: { r: number; g: number; b: number; a?: number };
  offset?: { x: number; y: number };
  spread?: number;
  visible?: boolean;
}

// Response types
export interface PluginResponse {
  id: string;
  success: boolean;
  result?: PluginResult;
  error?: string;
}

export type PluginResult =
  | { nodeId: string }
  | { nodeIds: string[] }
  | { page: { id: string; name: string } }
  | { selection: { id: string; name: string; type: string }[] }
  | Record<string, unknown>;
