interface PluginCommand {
  id: string;
  type: string;
  timestamp: number;
  params: Record<string, unknown>;
}

interface PluginResponse {
  id: string;
  success: boolean;
  result?: unknown;
  error?: string;
}

figma.showUI(__html__, { 
  width: 300, 
  height: 400,
  themeColors: true,
});

figma.ui.onmessage = async (msg: { type: string; command?: PluginCommand }) => {
  if (msg.type === 'command' && msg.command) {
    const response = await handleCommand(msg.command);
    figma.ui.postMessage({ type: 'response', response });
  }
};

async function handleCommand(command: PluginCommand): Promise<PluginResponse> {
  try {
    const result = await executeCommand(command);
    return { id: command.id, success: true, result };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { id: command.id, success: false, error: message };
  }
}

async function executeCommand(command: PluginCommand): Promise<unknown> {
  const { type, params } = command;

  switch (type) {
    case 'CREATE_FRAME':
      return createFrame(params as CreateFrameParams);
    case 'CREATE_RECTANGLE':
      return createRectangle(params as CreateRectangleParams);
    case 'CREATE_ELLIPSE':
      return createEllipse(params as CreateEllipseParams);
    case 'CREATE_TEXT':
      return createText(params as CreateTextParams);
    case 'CREATE_LINE':
      return createLine(params as CreateLineParams);
    case 'UPDATE_NODE':
      return updateNode(params as UpdateNodeParams);
    case 'DELETE_NODE':
      return deleteNode(params as DeleteNodeParams);
    case 'SET_FILLS':
      return setFills(params as SetFillsParams);
    case 'SET_STROKES':
      return setStrokes(params as SetStrokesParams);
    case 'SET_EFFECTS':
      return setEffects(params as SetEffectsParams);
    case 'APPLY_AUTO_LAYOUT':
      return applyAutoLayout(params as ApplyAutoLayoutParams);
    case 'GROUP_NODES':
      return groupNodes(params as GroupNodesParams);
    case 'GET_SELECTION':
      return getSelection();
    case 'SET_SELECTION':
      return setSelection(params as SetSelectionParams);
    case 'GET_CURRENT_PAGE':
      return getCurrentPage();
    case 'CREATE_PAGE':
      return createPage(params as CreatePageParams);
    case 'MOVE_NODE':
      return moveNode(params as MoveNodeParams);
    case 'RESIZE_NODE':
      return resizeNode(params as ResizeNodeParams);
    case 'CLONE_NODE':
      return cloneNode(params as CloneNodeParams);
    default:
      throw new Error(`Unknown command type: ${type}`);
  }
}

interface PaintParam {
  type: 'SOLID' | 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'IMAGE';
  color?: { r: number; g: number; b: number; a?: number };
  opacity?: number;
  visible?: boolean;
}

interface EffectParam {
  type: 'DROP_SHADOW' | 'INNER_SHADOW' | 'LAYER_BLUR' | 'BACKGROUND_BLUR';
  radius: number;
  color?: { r: number; g: number; b: number; a?: number };
  offset?: { x: number; y: number };
  spread?: number;
  visible?: boolean;
}

function convertPaints(paints: PaintParam[]): Paint[] {
  return paints.map(p => {
    if (p.type === 'SOLID' && p.color) {
      return {
        type: 'SOLID',
        color: { r: p.color.r, g: p.color.g, b: p.color.b },
        opacity: p.color.a ?? p.opacity ?? 1,
        visible: p.visible ?? true,
      } as SolidPaint;
    }
    return {
      type: 'SOLID',
      color: { r: 0.5, g: 0.5, b: 0.5 },
      visible: true,
    } as SolidPaint;
  });
}

function convertEffects(effects: EffectParam[]): Effect[] {
  return effects.map(e => {
    const color = e.color 
      ? { r: e.color.r, g: e.color.g, b: e.color.b, a: e.color.a ?? 1 }
      : { r: 0, g: 0, b: 0, a: 0.25 };
    
    if (e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW') {
      return {
        type: e.type,
        color,
        offset: e.offset ?? { x: 0, y: 4 },
        radius: e.radius,
        spread: e.spread ?? 0,
        visible: e.visible ?? true,
        blendMode: 'NORMAL' as BlendMode,
      } as DropShadowEffect | InnerShadowEffect;
    }
    return {
      type: e.type,
      radius: e.radius,
      visible: e.visible ?? true,
    } as BlurEffect;
  });
}

function findNodeById(id: string): SceneNode {
  const node = figma.getNodeById(id);
  if (!node || node.type === 'DOCUMENT' || node.type === 'PAGE') {
    throw new Error(`Node not found or invalid: ${id}`);
  }
  return node as SceneNode;
}

function getParent(parentId?: string): FrameNode | PageNode | GroupNode {
  if (parentId) {
    const parent = figma.getNodeById(parentId);
    if (parent && 'appendChild' in parent) {
      return parent as FrameNode | PageNode | GroupNode;
    }
    throw new Error(`Invalid parent: ${parentId}`);
  }
  return figma.currentPage;
}

interface CreateFrameParams {
  name: string;
  width: number;
  height: number;
  x?: number;
  y?: number;
  parentId?: string;
  fills?: PaintParam[];
}

async function createFrame(params: CreateFrameParams) {
  const frame = figma.createFrame();
  frame.name = params.name;
  frame.resize(params.width, params.height);
  frame.x = params.x ?? 0;
  frame.y = params.y ?? 0;
  
  if (params.fills) {
    frame.fills = convertPaints(params.fills);
  }
  
  const parent = getParent(params.parentId);
  parent.appendChild(frame);
  
  return { nodeId: frame.id };
}

interface CreateRectangleParams {
  width: number;
  height: number;
  name?: string;
  x?: number;
  y?: number;
  parentId?: string;
  fills?: PaintParam[];
  cornerRadius?: number;
}

async function createRectangle(params: CreateRectangleParams) {
  const rect = figma.createRectangle();
  if (params.name) rect.name = params.name;
  rect.resize(params.width, params.height);
  rect.x = params.x ?? 0;
  rect.y = params.y ?? 0;
  
  if (params.fills) {
    rect.fills = convertPaints(params.fills);
  }
  
  if (params.cornerRadius !== undefined) {
    rect.cornerRadius = params.cornerRadius;
  }
  
  const parent = getParent(params.parentId);
  parent.appendChild(rect);
  
  return { nodeId: rect.id };
}

interface CreateEllipseParams {
  width: number;
  height: number;
  name?: string;
  x?: number;
  y?: number;
  parentId?: string;
  fills?: PaintParam[];
}

async function createEllipse(params: CreateEllipseParams) {
  const ellipse = figma.createEllipse();
  if (params.name) ellipse.name = params.name;
  ellipse.resize(params.width, params.height);
  ellipse.x = params.x ?? 0;
  ellipse.y = params.y ?? 0;
  
  if (params.fills) {
    ellipse.fills = convertPaints(params.fills);
  }
  
  const parent = getParent(params.parentId);
  parent.appendChild(ellipse);
  
  return { nodeId: ellipse.id };
}

interface CreateTextParams {
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
}

async function createText(params: CreateTextParams) {
  const text = figma.createText();
  text.x = params.x ?? 0;
  text.y = params.y ?? 0;
  
  const fontFamily = params.fontFamily || 'Inter';
  const fontWeight = params.fontWeight || 400;
  
  const fontStyle = fontWeight >= 700 ? 'Bold' : fontWeight >= 500 ? 'Medium' : 'Regular';
  
  await figma.loadFontAsync({ family: fontFamily, style: fontStyle }).catch(() => {
    return figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
  });
  
  text.characters = params.characters;
  
  if (params.fontSize) {
    text.fontSize = params.fontSize;
  }
  
  if (params.fills) {
    text.fills = convertPaints(params.fills);
  }
  
  if (params.textAlignHorizontal) {
    text.textAlignHorizontal = params.textAlignHorizontal;
  }
  
  if (params.textAlignVertical) {
    text.textAlignVertical = params.textAlignVertical;
  }
  
  if (params.width !== undefined) {
    text.resize(params.width, text.height);
    text.textAutoResize = 'HEIGHT';
  }
  
  const parent = getParent(params.parentId);
  parent.appendChild(text);
  
  return { nodeId: text.id };
}

interface CreateLineParams {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  name?: string;
  parentId?: string;
  strokes?: PaintParam[];
  strokeWeight?: number;
}

async function createLine(params: CreateLineParams) {
  const line = figma.createLine();
  if (params.name) line.name = params.name;
  
  line.x = params.x1;
  line.y = params.y1;
  line.resize(Math.abs(params.x2 - params.x1), 0);
  line.rotation = Math.atan2(params.y2 - params.y1, params.x2 - params.x1) * (180 / Math.PI);
  
  if (params.strokes) {
    line.strokes = convertPaints(params.strokes);
  }
  
  if (params.strokeWeight !== undefined) {
    line.strokeWeight = params.strokeWeight;
  }
  
  const parent = getParent(params.parentId);
  parent.appendChild(line);
  
  return { nodeId: line.id };
}

interface UpdateNodeParams {
  nodeId: string;
  properties: {
    name?: string;
    visible?: boolean;
    locked?: boolean;
    opacity?: number;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    rotation?: number;
    cornerRadius?: number;
    characters?: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: number;
    textAlignHorizontal?: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
    textAlignVertical?: 'TOP' | 'CENTER' | 'BOTTOM';
  };
}

async function updateNode(params: UpdateNodeParams) {
  const node = findNodeById(params.nodeId);
  const props = params.properties;
  
  if (props.name !== undefined) node.name = props.name;
  if (props.visible !== undefined) node.visible = props.visible;
  if (props.locked !== undefined) node.locked = props.locked;
  
  if ('opacity' in node && props.opacity !== undefined) {
    (node as FrameNode).opacity = props.opacity;
  }
  
  if (props.x !== undefined) node.x = props.x;
  if (props.y !== undefined) node.y = props.y;
  
  if (props.width !== undefined && props.height !== undefined && 'resize' in node) {
    (node as FrameNode).resize(props.width, props.height);
  } else if (props.width !== undefined && 'resize' in node) {
    (node as FrameNode).resize(props.width, (node as FrameNode).height);
  } else if (props.height !== undefined && 'resize' in node) {
    (node as FrameNode).resize((node as FrameNode).width, props.height);
  }
  
  if (props.rotation !== undefined && 'rotation' in node) {
    (node as FrameNode).rotation = props.rotation;
  }
  
  if (props.cornerRadius !== undefined && 'cornerRadius' in node) {
    (node as RectangleNode).cornerRadius = props.cornerRadius;
  }
  
  if (node.type === 'TEXT') {
    const textNode = node as TextNode;
    
    if (props.characters !== undefined || props.fontSize !== undefined || props.fontFamily !== undefined) {
      const fontFamily = props.fontFamily || 'Inter';
      const fontWeight = props.fontWeight || 400;
      const fontStyle = fontWeight >= 700 ? 'Bold' : fontWeight >= 500 ? 'Medium' : 'Regular';
      
      await figma.loadFontAsync({ family: fontFamily, style: fontStyle }).catch(() => {
        return figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
      });
      
      if (props.characters !== undefined) textNode.characters = props.characters;
      if (props.fontSize !== undefined) textNode.fontSize = props.fontSize;
    }
    
    if (props.textAlignHorizontal !== undefined) textNode.textAlignHorizontal = props.textAlignHorizontal;
    if (props.textAlignVertical !== undefined) textNode.textAlignVertical = props.textAlignVertical;
  }
  
  return { nodeId: node.id };
}

interface DeleteNodeParams {
  nodeId: string;
}

async function deleteNode(params: DeleteNodeParams) {
  const node = findNodeById(params.nodeId);
  node.remove();
  return { nodeId: params.nodeId };
}

interface SetFillsParams {
  nodeId: string;
  fills: PaintParam[];
}

async function setFills(params: SetFillsParams) {
  const node = findNodeById(params.nodeId);
  if (!('fills' in node)) {
    throw new Error(`Node ${params.nodeId} does not support fills`);
  }
  (node as GeometryMixin).fills = convertPaints(params.fills);
  return { nodeId: node.id };
}

interface SetStrokesParams {
  nodeId: string;
  strokes: PaintParam[];
  strokeWeight?: number;
}

async function setStrokes(params: SetStrokesParams) {
  const node = findNodeById(params.nodeId);
  if (!('strokes' in node)) {
    throw new Error(`Node ${params.nodeId} does not support strokes`);
  }
  const geometryNode = node as GeometryMixin;
  geometryNode.strokes = convertPaints(params.strokes);
  if (params.strokeWeight !== undefined) {
    geometryNode.strokeWeight = params.strokeWeight;
  }
  return { nodeId: node.id };
}

interface SetEffectsParams {
  nodeId: string;
  effects: EffectParam[];
}

async function setEffects(params: SetEffectsParams) {
  const node = findNodeById(params.nodeId);
  if (!('effects' in node)) {
    throw new Error(`Node ${params.nodeId} does not support effects`);
  }
  (node as BlendMixin).effects = convertEffects(params.effects);
  return { nodeId: node.id };
}

interface ApplyAutoLayoutParams {
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
}

async function applyAutoLayout(params: ApplyAutoLayoutParams) {
  const node = findNodeById(params.nodeId);
  if (node.type !== 'FRAME') {
    throw new Error(`Auto-layout can only be applied to frames, got ${node.type}`);
  }
  
  const frame = node as FrameNode;
  frame.layoutMode = params.direction;
  
  if (params.gap !== undefined) frame.itemSpacing = params.gap;
  if (params.paddingLeft !== undefined) frame.paddingLeft = params.paddingLeft;
  if (params.paddingRight !== undefined) frame.paddingRight = params.paddingRight;
  if (params.paddingTop !== undefined) frame.paddingTop = params.paddingTop;
  if (params.paddingBottom !== undefined) frame.paddingBottom = params.paddingBottom;
  if (params.primaryAxisSizing !== undefined) frame.primaryAxisSizingMode = params.primaryAxisSizing;
  if (params.counterAxisSizing !== undefined) frame.counterAxisSizingMode = params.counterAxisSizing;
  if (params.primaryAxisAlign !== undefined) frame.primaryAxisAlignItems = params.primaryAxisAlign;
  if (params.counterAxisAlign !== undefined) frame.counterAxisAlignItems = params.counterAxisAlign;
  
  return { nodeId: frame.id };
}

interface GroupNodesParams {
  nodeIds: string[];
  name?: string;
}

async function groupNodes(params: GroupNodesParams) {
  const nodes = params.nodeIds.map(id => findNodeById(id));
  const group = figma.group(nodes, figma.currentPage);
  if (params.name) group.name = params.name;
  return { nodeId: group.id };
}

async function getSelection() {
  const selection = figma.currentPage.selection.map(node => ({
    id: node.id,
    name: node.name,
    type: node.type,
  }));
  return { selection };
}

interface SetSelectionParams {
  nodeIds: string[];
}

async function setSelection(params: SetSelectionParams) {
  const nodes = params.nodeIds.map(id => findNodeById(id));
  figma.currentPage.selection = nodes;
  return { nodeIds: params.nodeIds };
}

async function getCurrentPage() {
  return {
    page: {
      id: figma.currentPage.id,
      name: figma.currentPage.name,
    },
  };
}

interface CreatePageParams {
  name: string;
}

async function createPage(params: CreatePageParams) {
  const page = figma.createPage();
  page.name = params.name;
  return {
    page: {
      id: page.id,
      name: page.name,
    },
  };
}

interface MoveNodeParams {
  nodeId: string;
  x: number;
  y: number;
}

async function moveNode(params: MoveNodeParams) {
  const node = findNodeById(params.nodeId);
  node.x = params.x;
  node.y = params.y;
  return { nodeId: node.id };
}

interface ResizeNodeParams {
  nodeId: string;
  width: number;
  height: number;
}

async function resizeNode(params: ResizeNodeParams) {
  const node = findNodeById(params.nodeId);
  if (!('resize' in node)) {
    throw new Error(`Node ${params.nodeId} cannot be resized`);
  }
  (node as FrameNode).resize(params.width, params.height);
  return { nodeId: node.id };
}

interface CloneNodeParams {
  nodeId: string;
  x?: number;
  y?: number;
}

async function cloneNode(params: CloneNodeParams) {
  const node = findNodeById(params.nodeId);
  const clone = node.clone();
  if (params.x !== undefined) clone.x = params.x;
  if (params.y !== undefined) clone.y = params.y;
  return { nodeId: clone.id };
}
