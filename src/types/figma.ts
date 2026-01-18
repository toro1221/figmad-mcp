/**
 * Figma-related type definitions
 */

// Re-export types from @figma/rest-api-spec where useful
// These are our internal representations

export interface FigmaFile {
  name: string;
  lastModified: string;
  thumbnailUrl: string;
  version: string;
  document: FigmaNode;
  components: Record<string, ComponentMetadata>;
  styles: Record<string, StyleMetadata>;
}

export interface FigmaNode {
  id: string;
  name: string;
  type: NodeType;
  visible?: boolean;
  children?: FigmaNode[];
  // Layout properties
  absoluteBoundingBox?: BoundingBox;
  constraints?: Constraints;
  layoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
  primaryAxisSizingMode?: 'FIXED' | 'AUTO';
  counterAxisSizingMode?: 'FIXED' | 'AUTO';
  primaryAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
  counterAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'BASELINE';
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  itemSpacing?: number;
  // Visual properties
  fills?: Paint[];
  strokes?: Paint[];
  strokeWeight?: number;
  cornerRadius?: number;
  effects?: Effect[];
  // Text properties
  characters?: string;
  style?: TextStyle;
  // Component properties
  componentId?: string;
}

export type NodeType =
  | 'DOCUMENT'
  | 'CANVAS'
  | 'FRAME'
  | 'GROUP'
  | 'SECTION'
  | 'VECTOR'
  | 'BOOLEAN_OPERATION'
  | 'STAR'
  | 'LINE'
  | 'ELLIPSE'
  | 'REGULAR_POLYGON'
  | 'RECTANGLE'
  | 'TEXT'
  | 'SLICE'
  | 'COMPONENT'
  | 'COMPONENT_SET'
  | 'INSTANCE'
  | 'STICKY'
  | 'SHAPE_WITH_TEXT'
  | 'CONNECTOR';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Constraints {
  vertical: 'TOP' | 'BOTTOM' | 'CENTER' | 'TOP_BOTTOM' | 'SCALE';
  horizontal: 'LEFT' | 'RIGHT' | 'CENTER' | 'LEFT_RIGHT' | 'SCALE';
}

export interface Paint {
  type: 'SOLID' | 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'GRADIENT_ANGULAR' | 'GRADIENT_DIAMOND' | 'IMAGE' | 'EMOJI';
  visible?: boolean;
  opacity?: number;
  color?: RGBA;
  gradientHandlePositions?: Vector[];
  gradientStops?: ColorStop[];
  scaleMode?: 'FILL' | 'FIT' | 'TILE' | 'STRETCH';
  imageRef?: string;
}

export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface Vector {
  x: number;
  y: number;
}

export interface ColorStop {
  position: number;
  color: RGBA;
}

export interface Effect {
  type: 'INNER_SHADOW' | 'DROP_SHADOW' | 'LAYER_BLUR' | 'BACKGROUND_BLUR';
  visible?: boolean;
  radius: number;
  color?: RGBA;
  offset?: Vector;
  spread?: number;
}

export interface TextStyle {
  fontFamily: string;
  fontPostScriptName?: string;
  fontWeight: number;
  fontSize: number;
  textAlignHorizontal: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
  textAlignVertical: 'TOP' | 'CENTER' | 'BOTTOM';
  letterSpacing: number;
  lineHeightPx: number;
  lineHeightPercent?: number;
  lineHeightUnit?: 'PIXELS' | 'FONT_SIZE_%' | 'INTRINSIC_%';
}

export interface ComponentMetadata {
  key: string;
  name: string;
  description: string;
  documentationLinks?: { uri: string }[];
}

export interface StyleMetadata {
  key: string;
  name: string;
  styleType: 'FILL' | 'TEXT' | 'EFFECT' | 'GRID';
  description: string;
}

export interface FigmaVariable {
  id: string;
  name: string;
  key: string;
  variableCollectionId: string;
  resolvedType: 'BOOLEAN' | 'FLOAT' | 'STRING' | 'COLOR';
  valuesByMode: Record<string, VariableValue>;
}

export type VariableValue = boolean | number | string | RGBA | { type: 'VARIABLE_ALIAS'; id: string };

export interface FigmaVariableCollection {
  id: string;
  name: string;
  key: string;
  modes: { modeId: string; name: string }[];
  variableIds: string[];
}

// Export image options
export type ImageFormat = 'jpg' | 'png' | 'svg' | 'pdf';

export interface ExportSettings {
  format: ImageFormat;
  scale?: number;
  contentsOnly?: boolean;
}
