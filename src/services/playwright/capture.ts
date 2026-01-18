import { chromium, type Page, type Browser } from 'playwright';
import { createLogger, generateId, CaptureError } from '../../lib/index.js';
import type { 
  WebCapture, 
  CapturedElement, 
  CaptureOptions, 
  Viewport,
  ComputedStyles,
  DetectedComponent,
  ComponentType
} from '../../types/capture.js';

const logger = createLogger('playwright');

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.isConnected()) {
    browserInstance = await chromium.launch({ headless: true });
  }
  return browserInstance;
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

export async function captureWebpage(options: CaptureOptions): Promise<WebCapture> {
  const {
    url,
    viewport = { width: 1440, height: 900 },
    waitForSelector,
    waitForTimeout,
    fullPage = true,
    captureDom = true,
    detectComponents = true,
  } = options;

  logger.info('Capturing webpage', { url, viewport });

  const browser = await getBrowser();
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 2,
  });

  if (options.authentication?.cookies) {
    await context.addCookies(options.authentication.cookies);
  }

  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    if (waitForSelector) {
      await page.waitForSelector(waitForSelector, { timeout: 10000 });
    }

    if (waitForTimeout) {
      await page.waitForTimeout(waitForTimeout);
    }

    if (options.scrollToBottom) {
      await autoScroll(page);
    }

    const screenshot = await page.screenshot({ fullPage, type: 'png' });

    let dom = { elements: [], rootElement: {} as CapturedElement, stylesheets: [] as string[] };
    if (captureDom) {
      dom = await extractDOM(page);
    }

    let components: DetectedComponent[] = [];
    if (detectComponents && captureDom) {
      components = detectUIComponents(dom.rootElement);
    }

    const capture: WebCapture = {
      id: generateId(),
      url,
      timestamp: new Date(),
      viewport,
      screenshot: Buffer.from(screenshot),
      dom,
      components,
    };

    logger.info('Capture complete', { 
      id: capture.id, 
      elementCount: dom.elements.length,
      componentCount: components.length 
    });

    return capture;
  } catch (error) {
    throw new CaptureError(`Failed to capture ${url}: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    await context.close();
  }
}

async function autoScroll(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          window.scrollTo(0, 0);
          resolve();
        }
      }, 100);
    });
  });
}

async function extractDOM(page: Page): Promise<{ elements: CapturedElement[]; rootElement: CapturedElement; stylesheets: string[] }> {
  const result = await page.evaluate(() => {
    const getComputedStylesForElement = (el: Element): Record<string, string> => {
      const computed = window.getComputedStyle(el);
      return {
        display: computed.display,
        position: computed.position,
        top: computed.top,
        right: computed.right,
        bottom: computed.bottom,
        left: computed.left,
        width: computed.width,
        height: computed.height,
        margin: computed.margin,
        padding: computed.padding,
        flexDirection: computed.flexDirection,
        justifyContent: computed.justifyContent,
        alignItems: computed.alignItems,
        gap: computed.gap,
        backgroundColor: computed.backgroundColor,
        color: computed.color,
        borderRadius: computed.borderRadius,
        border: computed.border,
        boxShadow: computed.boxShadow,
        opacity: computed.opacity,
        overflow: computed.overflow,
        fontFamily: computed.fontFamily,
        fontSize: computed.fontSize,
        fontWeight: computed.fontWeight,
        lineHeight: computed.lineHeight,
        letterSpacing: computed.letterSpacing,
        textAlign: computed.textAlign,
        textDecoration: computed.textDecoration,
      };
    };

    const isVisible = (el: Element): boolean => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0'
      );
    };

    const extractElement = (el: Element, depth: number = 0): CapturedElement | null => {
      if (depth > 20) return null;
      if (!isVisible(el)) return null;

      const rect = el.getBoundingClientRect();
      const computed = window.getComputedStyle(el);

      const attributes: Record<string, string> = {};
      for (const attr of el.attributes) {
        attributes[attr.name] = attr.value;
      }

      const children: CapturedElement[] = [];
      for (const child of el.children) {
        const extracted = extractElement(child, depth + 1);
        if (extracted) children.push(extracted);
      }

      let textContent: string | undefined;
      if (el.childNodes.length > 0) {
        const text = Array.from(el.childNodes)
          .filter(n => n.nodeType === Node.TEXT_NODE)
          .map(n => n.textContent?.trim())
          .filter(Boolean)
          .join(' ');
        if (text) textContent = text;
      }

      return {
        tagName: el.tagName.toLowerCase(),
        id: el.id || undefined,
        className: el.className || undefined,
        boundingBox: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        },
        computedStyles: getComputedStylesForElement(el) as unknown as ComputedStyles,
        children,
        textContent,
        attributes,
        isVisible: true,
        zIndex: parseInt(computed.zIndex) || 0,
      };
    };

    const rootElement = extractElement(document.body);
    
    const allElements: CapturedElement[] = [];
    const flatten = (el: CapturedElement) => {
      allElements.push(el);
      el.children.forEach(flatten);
    };
    if (rootElement) flatten(rootElement);

    const stylesheets = Array.from(document.styleSheets)
      .filter(s => s.href)
      .map(s => s.href as string);

    return {
      rootElement: rootElement || { tagName: 'body', boundingBox: { x: 0, y: 0, width: 0, height: 0 }, computedStyles: {} as ComputedStyles, children: [], attributes: {}, isVisible: true, zIndex: 0 },
      elements: allElements,
      stylesheets,
    };
  });

  return result;
}

function detectUIComponents(rootElement: CapturedElement): DetectedComponent[] {
  const components: DetectedComponent[] = [];

  const detectComponent = (el: CapturedElement): void => {
    const detected = classifyElement(el);
    if (detected) {
      components.push(detected);
    }
    el.children.forEach(detectComponent);
  };

  detectComponent(rootElement);
  return components;
}

function classifyElement(el: CapturedElement): DetectedComponent | null {
  const tag = el.tagName;
  const className = el.className?.toLowerCase() || '';
  const role = el.attributes.role;

  let type: ComponentType = 'unknown';
  let confidence = 0;
  let suggestedFigmaConstruct = 'Frame';

  if (tag === 'button' || role === 'button' || className.includes('btn') || className.includes('button')) {
    type = 'button';
    confidence = 0.9;
    suggestedFigmaConstruct = 'Component: Button';
  } else if (tag === 'input' || tag === 'textarea') {
    type = tag === 'textarea' ? 'textarea' : 'input';
    confidence = 0.95;
    suggestedFigmaConstruct = 'Component: Input';
  } else if (tag === 'nav' || role === 'navigation' || className.includes('nav')) {
    type = 'nav';
    confidence = 0.85;
    suggestedFigmaConstruct = 'Frame: Navigation';
  } else if (tag === 'header' || role === 'banner' || className.includes('header')) {
    type = 'header';
    confidence = 0.85;
    suggestedFigmaConstruct = 'Frame: Header';
  } else if (tag === 'footer' || role === 'contentinfo' || className.includes('footer')) {
    type = 'footer';
    confidence = 0.85;
    suggestedFigmaConstruct = 'Frame: Footer';
  } else if (className.includes('card') || className.includes('tile')) {
    type = 'card';
    confidence = 0.8;
    suggestedFigmaConstruct = 'Component: Card';
  } else if (tag === 'ul' || tag === 'ol' || role === 'list') {
    type = 'list';
    confidence = 0.9;
    suggestedFigmaConstruct = 'Auto-layout Frame';
  } else if (tag === 'li' || role === 'listitem') {
    type = 'list-item';
    confidence = 0.9;
    suggestedFigmaConstruct = 'Frame';
  } else if (tag === 'img' || role === 'img') {
    type = 'image';
    confidence = 0.95;
    suggestedFigmaConstruct = 'Rectangle with Image Fill';
  } else if (tag === 'svg' || className.includes('icon')) {
    type = 'icon';
    confidence = 0.8;
    suggestedFigmaConstruct = 'Vector';
  } else if (className.includes('avatar')) {
    type = 'avatar';
    confidence = 0.85;
    suggestedFigmaConstruct = 'Ellipse with Image Fill';
  } else if (className.includes('badge') || className.includes('tag') || className.includes('chip')) {
    type = 'badge';
    confidence = 0.8;
    suggestedFigmaConstruct = 'Component: Badge';
  } else if (className.includes('modal') || className.includes('dialog') || role === 'dialog') {
    type = 'modal';
    confidence = 0.85;
    suggestedFigmaConstruct = 'Frame: Modal';
  } else if (className.includes('sidebar') || className.includes('aside')) {
    type = 'sidebar';
    confidence = 0.8;
    suggestedFigmaConstruct = 'Frame: Sidebar';
  } else if (tag === 'table' || role === 'table') {
    type = 'table';
    confidence = 0.9;
    suggestedFigmaConstruct = 'Auto-layout Frame: Table';
  } else if (className.includes('dropdown') || className.includes('select') || role === 'listbox') {
    type = 'dropdown';
    confidence = 0.8;
    suggestedFigmaConstruct = 'Component: Dropdown';
  } else if (className.includes('tab') || role === 'tab') {
    type = 'tab';
    confidence = 0.8;
    suggestedFigmaConstruct = 'Component: Tab';
  } else if (className.includes('progress')) {
    type = 'progress';
    confidence = 0.85;
    suggestedFigmaConstruct = 'Component: Progress Bar';
  } else if (className.includes('spinner') || className.includes('loading')) {
    type = 'spinner';
    confidence = 0.8;
    suggestedFigmaConstruct = 'Component: Spinner';
  } else if (tag === 'section' || tag === 'article') {
    type = 'section';
    confidence = 0.6;
    suggestedFigmaConstruct = 'Frame: Section';
  } else if (tag === 'div' && (className.includes('container') || className.includes('wrapper'))) {
    type = 'container';
    confidence = 0.5;
    suggestedFigmaConstruct = 'Frame';
  }

  if (type === 'unknown' || confidence < 0.5) {
    return null;
  }

  return {
    type,
    confidence,
    boundingBox: el.boundingBox,
    element: el,
    suggestedFigmaConstruct,
    properties: {
      label: el.textContent,
    },
  };
}

export { getBrowser };
