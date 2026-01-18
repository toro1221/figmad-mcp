/**
 * Web capture types
 */

export interface WebCapture {
  id: string;
  url: string;
  timestamp: Date;
  viewport: Viewport;
  screenshot: Buffer;
  dom: DOMCapture;
  components: DetectedComponent[];
}

export interface Viewport {
  width: number;
  height: number;
  deviceScaleFactor?: number;
}

export interface DOMCapture {
  elements: CapturedElement[];
  rootElement: CapturedElement;
  stylesheets: string[];
}

export interface CapturedElement {
  tagName: string;
  id?: string;
  className?: string;
  boundingBox: BoundingBox;
  computedStyles: ComputedStyles;
  children: CapturedElement[];
  textContent?: string;
  attributes: Record<string, string>;
  isVisible: boolean;
  zIndex: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ComputedStyles {
  // Layout
  display: string;
  position: string;
  top: string;
  right: string;
  bottom: string;
  left: string;
  width: string;
  height: string;
  margin: string;
  padding: string;
  flexDirection?: string;
  justifyContent?: string;
  alignItems?: string;
  gap?: string;
  gridTemplateColumns?: string;
  gridTemplateRows?: string;
  
  // Visual
  backgroundColor: string;
  color: string;
  borderRadius: string;
  border: string;
  boxShadow: string;
  opacity: string;
  overflow: string;
  
  // Typography
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  letterSpacing: string;
  textAlign: string;
  textDecoration: string;
  
  // Other
  cursor?: string;
  transform?: string;
  transition?: string;
}

export interface DetectedComponent {
  type: ComponentType;
  confidence: number;
  boundingBox: BoundingBox;
  element: CapturedElement;
  suggestedFigmaConstruct: string;
  properties: ComponentProperties;
}

export type ComponentType =
  | 'button'
  | 'input'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'toggle'
  | 'card'
  | 'modal'
  | 'nav'
  | 'header'
  | 'footer'
  | 'sidebar'
  | 'list'
  | 'list-item'
  | 'table'
  | 'image'
  | 'icon'
  | 'avatar'
  | 'badge'
  | 'tag'
  | 'tooltip'
  | 'dropdown'
  | 'tab'
  | 'accordion'
  | 'breadcrumb'
  | 'pagination'
  | 'progress'
  | 'spinner'
  | 'skeleton'
  | 'divider'
  | 'container'
  | 'section'
  | 'unknown';

export interface ComponentProperties {
  variant?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  state?: 'default' | 'hover' | 'active' | 'disabled' | 'focus';
  hasIcon?: boolean;
  iconPosition?: 'left' | 'right';
  label?: string;
  placeholder?: string;
}

// Capture options
export interface CaptureOptions {
  url: string;
  viewport?: Viewport;
  waitForSelector?: string;
  waitForTimeout?: number;
  fullPage?: boolean;
  captureDom?: boolean;
  detectComponents?: boolean;
  includeHidden?: boolean;
  scrollToBottom?: boolean;
  authentication?: {
    username?: string;
    password?: string;
    cookies?: { name: string; value: string; domain: string }[];
  };
}

// Reconstruction options
export interface ReconstructionOptions {
  captureId: string;
  targetFileKey?: string;
  targetPageName?: string;
  createComponents?: boolean;
  respectLayout?: boolean;
  simplifyNesting?: boolean;
  threshold?: {
    minWidth: number;
    minHeight: number;
    minConfidence: number;
  };
}
