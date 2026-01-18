import { readFile, readdir, stat } from 'fs/promises';
import { join, extname, basename } from 'path';
import { createLogger } from '../../lib/index.js';
import type { CodeAnalysis, ComponentDefinition, DesignTokens, PropDefinition } from '../../types/mcp.js';
import { generateId } from '../../lib/utils.js';

const logger = createLogger('code-analyzer');

export async function analyzeCodebase(
  rootPath: string,
  options: { framework?: string; includeTokens?: boolean } = {}
): Promise<CodeAnalysis> {
  const { includeTokens = true } = options;
  
  logger.info('Analyzing codebase', { rootPath });
  
  const framework = options.framework || await detectFramework(rootPath);
  const components = await findComponents(rootPath, framework);
  const designTokens = includeTokens ? await extractDesignTokens(rootPath) : createEmptyTokens();
  
  const analysis: CodeAnalysis = {
    id: generateId(),
    path: rootPath,
    framework: framework as CodeAnalysis['framework'],
    timestamp: new Date(),
    components,
    designTokens,
  };
  
  logger.info('Analysis complete', { 
    components: components.length, 
    tokenCount: Object.keys(designTokens.colors).length + Object.keys(designTokens.spacing).length 
  });
  
  return analysis;
}

async function detectFramework(rootPath: string): Promise<string> {
  try {
    const pkgPath = join(rootPath, 'package.json');
    const pkgContent = await readFile(pkgPath, 'utf8');
    const pkg = JSON.parse(pkgContent);
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    
    if (deps['next'] || deps['react']) return 'react';
    if (deps['vue'] || deps['nuxt']) return 'vue';
    if (deps['svelte'] || deps['@sveltejs/kit']) return 'svelte';
    if (deps['@angular/core']) return 'angular';
  } catch {
    // No package.json, try to detect from files
  }
  
  return 'html';
}

async function findComponents(rootPath: string, framework: string): Promise<ComponentDefinition[]> {
  const components: ComponentDefinition[] = [];
  const extensions = getExtensionsForFramework(framework);
  const excludeDirs = ['node_modules', '.git', 'dist', 'build', '.next', '.nuxt', '.svelte-kit'];
  
  async function scanDir(dirPath: string): Promise<void> {
    try {
      const entries = await readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          if (!excludeDirs.includes(entry.name)) {
            await scanDir(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = extname(entry.name);
          if (extensions.includes(ext)) {
            const component = await parseComponentFile(fullPath, framework);
            if (component) {
              components.push(component);
            }
          }
        }
      }
    } catch (error) {
      logger.debug('Error scanning directory', { dirPath, error });
    }
  }
  
  await scanDir(rootPath);
  return components;
}

function getExtensionsForFramework(framework: string): string[] {
  switch (framework) {
    case 'react': return ['.tsx', '.jsx'];
    case 'vue': return ['.vue'];
    case 'svelte': return ['.svelte'];
    case 'angular': return ['.ts'];
    default: return ['.html', '.htm'];
  }
}

async function parseComponentFile(filePath: string, framework: string): Promise<ComponentDefinition | null> {
  try {
    const content = await readFile(filePath, 'utf8');
    const name = extractComponentName(filePath, content, framework);
    
    if (!name) return null;
    
    const props = extractProps(content, framework);
    const variants = extractVariants(content);
    const usedStyles = extractUsedStyles(content);
    const childComponents = extractChildComponents(content, framework);
    
    return {
      name,
      filePath,
      props,
      variants,
      usedStyles,
      childComponents,
    };
  } catch (error) {
    logger.debug('Error parsing component file', { filePath, error });
    return null;
  }
}

function extractComponentName(filePath: string, content: string, framework: string): string | null {
  const fileName = basename(filePath, extname(filePath));
  
  if (framework === 'react') {
    const exportMatch = content.match(/export\s+(?:default\s+)?(?:function|const)\s+([A-Z][a-zA-Z0-9]*)/);
    if (exportMatch) return exportMatch[1];
    
    const classMatch = content.match(/class\s+([A-Z][a-zA-Z0-9]*)\s+extends\s+(?:React\.)?Component/);
    if (classMatch) return classMatch[1];
    
    if (/^[A-Z]/.test(fileName)) return fileName;
  }
  
  if (framework === 'vue') {
    const nameMatch = content.match(/name:\s*['"]([^'"]+)['"]/);
    if (nameMatch) return nameMatch[1];
    return fileName;
  }
  
  if (framework === 'svelte') {
    return fileName;
  }
  
  return /^[A-Z]/.test(fileName) ? fileName : null;
}

function extractProps(content: string, framework: string): PropDefinition[] {
  const props: PropDefinition[] = [];
  
  if (framework === 'react') {
    const interfaceMatch = content.match(/interface\s+\w*Props\s*\{([^}]+)\}/s);
    if (interfaceMatch) {
      const propsBlock = interfaceMatch[1];
      const propMatches = propsBlock.matchAll(/(\w+)(\?)?:\s*([^;,\n]+)/g);
      
      for (const match of propMatches) {
        props.push({
          name: match[1],
          type: match[3].trim(),
          required: !match[2],
        });
      }
    }
    
    const destructureMatch = content.match(/(?:function|const)\s+\w+\s*\(\s*\{([^}]+)\}/);
    if (destructureMatch && props.length === 0) {
      const propNames = destructureMatch[1].split(',').map(p => p.trim().split('=')[0].trim());
      for (const name of propNames) {
        if (name && !name.startsWith('...')) {
          props.push({ name, type: 'unknown', required: false });
        }
      }
    }
  }
  
  if (framework === 'vue') {
    const definePropsMatch = content.match(/defineProps<\{([^}]+)\}>/s);
    if (definePropsMatch) {
      const propsBlock = definePropsMatch[1];
      const propMatches = propsBlock.matchAll(/(\w+)(\?)?:\s*([^;,\n]+)/g);
      
      for (const match of propMatches) {
        props.push({
          name: match[1],
          type: match[3].trim(),
          required: !match[2],
        });
      }
    }
  }
  
  if (framework === 'svelte') {
    const exportMatches = content.matchAll(/export\s+let\s+(\w+)(?:\s*:\s*([^=;]+))?(?:\s*=\s*([^;]+))?/g);
    for (const match of exportMatches) {
      props.push({
        name: match[1],
        type: match[2]?.trim() || 'unknown',
        required: !match[3],
        defaultValue: match[3]?.trim(),
      });
    }
  }
  
  return props;
}

function extractVariants(content: string): string[] {
  const variants: string[] = [];
  
  const variantMatch = content.match(/variant[s]?\s*[=:]\s*['"]([^'"]+)['"]/gi);
  if (variantMatch) {
    for (const match of variantMatch) {
      const value = match.match(/['"]([^'"]+)['"]/)?.[1];
      if (value && !variants.includes(value)) {
        variants.push(value);
      }
    }
  }
  
  const sizeMatch = content.match(/size\s*[=:]\s*['"]([^'"]+)['"]/gi);
  if (sizeMatch) {
    for (const match of sizeMatch) {
      const value = match.match(/['"]([^'"]+)['"]/)?.[1];
      if (value) {
        variants.push(`size-${value}`);
      }
    }
  }
  
  return variants;
}

function extractUsedStyles(content: string): string[] {
  const styles: string[] = [];
  
  const classNameMatches = content.matchAll(/className\s*=\s*[{"]([^}"]+)/g);
  for (const match of classNameMatches) {
    const classes = match[1].split(/\s+/).filter(c => c && !c.includes('$') && !c.includes('{'));
    styles.push(...classes);
  }
  
  const classMatches = content.matchAll(/class\s*=\s*["']([^"']+)/g);
  for (const match of classMatches) {
    const classes = match[1].split(/\s+/).filter(Boolean);
    styles.push(...classes);
  }
  
  return [...new Set(styles)];
}

function extractChildComponents(content: string, framework: string): string[] {
  const children: string[] = [];
  
  const jsxMatches = content.matchAll(/<([A-Z][a-zA-Z0-9]*)/g);
  for (const match of jsxMatches) {
    if (!children.includes(match[1])) {
      children.push(match[1]);
    }
  }
  
  return children;
}

async function extractDesignTokens(rootPath: string): Promise<DesignTokens> {
  const tokens = createEmptyTokens();
  
  const tailwindConfig = await findTailwindConfig(rootPath);
  if (tailwindConfig) {
    Object.assign(tokens, await parseTailwindConfig(tailwindConfig));
  }
  
  const cssVars = await findCSSVariables(rootPath);
  mergeCSSVariables(tokens, cssVars);
  
  return tokens;
}

function createEmptyTokens(): DesignTokens {
  return {
    colors: {},
    spacing: {},
    typography: {},
    shadows: {},
    borderRadius: {},
  };
}

async function findTailwindConfig(rootPath: string): Promise<string | null> {
  const configNames = ['tailwind.config.js', 'tailwind.config.ts', 'tailwind.config.mjs'];
  
  for (const name of configNames) {
    const configPath = join(rootPath, name);
    try {
      await stat(configPath);
      return configPath;
    } catch {
      // File doesn't exist
    }
  }
  
  return null;
}

async function parseTailwindConfig(configPath: string): Promise<Partial<DesignTokens>> {
  const tokens: Partial<DesignTokens> = { colors: {}, spacing: {} };
  
  try {
    const content = await readFile(configPath, 'utf8');
    
    const colorsMatch = content.match(/colors\s*:\s*\{([^}]+)\}/s);
    if (colorsMatch) {
      const colorMatches = colorsMatch[1].matchAll(/['"]?(\w+)['"]?\s*:\s*['"]([^'"]+)['"]/g);
      for (const match of colorMatches) {
        tokens.colors![match[1]] = match[2];
      }
    }
    
    const spacingMatch = content.match(/spacing\s*:\s*\{([^}]+)\}/s);
    if (spacingMatch) {
      const spacingMatches = spacingMatch[1].matchAll(/['"]?(\w+)['"]?\s*:\s*['"]([^'"]+)['"]/g);
      for (const match of spacingMatches) {
        tokens.spacing![match[1]] = match[2];
      }
    }
  } catch (error) {
    logger.debug('Error parsing tailwind config', { configPath, error });
  }
  
  return tokens;
}

async function findCSSVariables(rootPath: string): Promise<Record<string, string>> {
  const variables: Record<string, string> = {};
  const cssFiles = ['styles/globals.css', 'app/globals.css', 'src/styles/globals.css', 'src/index.css', 'styles.css'];
  
  for (const cssFile of cssFiles) {
    const cssPath = join(rootPath, cssFile);
    try {
      const content = await readFile(cssPath, 'utf8');
      
      const varMatches = content.matchAll(/--([a-zA-Z0-9-]+)\s*:\s*([^;]+);/g);
      for (const match of varMatches) {
        variables[match[1]] = match[2].trim();
      }
    } catch {
      // File doesn't exist
    }
  }
  
  return variables;
}

function mergeCSSVariables(tokens: DesignTokens, variables: Record<string, string>): void {
  for (const [name, value] of Object.entries(variables)) {
    if (name.includes('color') || name.includes('bg') || name.includes('text') || name.includes('border')) {
      tokens.colors[name] = value;
    } else if (name.includes('spacing') || name.includes('gap') || name.includes('padding') || name.includes('margin')) {
      tokens.spacing[name] = value;
    } else if (name.includes('radius')) {
      tokens.borderRadius[name] = value;
    } else if (name.includes('shadow')) {
      tokens.shadows[name] = value;
    } else if (name.includes('font') || name.includes('text') || name.includes('line')) {
      if (!tokens.typography[name]) {
        tokens.typography[name] = {
          fontFamily: '',
          fontSize: '',
          fontWeight: '',
          lineHeight: '',
        };
      }
    }
  }
}

export { detectFramework, findComponents, extractDesignTokens };
