# figmad-mcp

Figma Design MCP Server - Create, capture, and manage Figma designs via AI agents.

## Features

- **Read Operations**: Get files, nodes, components, styles, variables, export images
- **Write Operations**: Create frames, shapes, text; apply auto-layout; update nodes (requires plugin)
- **Capture & Reconstruct**: Screenshot webpages and recreate them in Figma
- **Generate UI**: Create UI designs from text prompts

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env and add your FIGMA_ACCESS_TOKEN
```

Get your token at: https://www.figma.com/developers/api#access-tokens

### 3. Build

```bash
npm run build
```

### 4. Install Plugin (for write operations)

```bash
cd plugin
npm install
npm run build
```

Then in Figma:
1. Menu → Plugins → Development → Import plugin from manifest
2. Select `plugin/manifest.json`

## Usage

### With Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "figmad": {
      "command": "node",
      "args": ["/path/to/figmad-mcp/dist/index.js"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "your-token-here"
      }
    }
  }
}
```

### Available Tools

#### Read Operations (REST API - always available)

| Tool | Description |
|------|-------------|
| `get_file` | Get Figma file structure |
| `get_node` | Get specific nodes by ID |
| `get_components` | List components in a file |
| `get_styles` | Get color/text/effect styles |
| `get_variables` | Get design tokens/variables |
| `export_image` | Export node as PNG/SVG/PDF |

#### Write Operations (Plugin required)

| Tool | Description |
|------|-------------|
| `create_frame` | Create a new frame |
| `create_rectangle` | Create a rectangle shape |
| `create_text` | Create text node |
| `update_node` | Modify node properties |
| `apply_auto_layout` | Apply auto-layout to frame |
| `set_fills` | Set fill colors |
| `delete_node` | Delete a node |
| `get_selection` | Get current selection |
| `plugin_status` | Check if plugin is connected |

#### Orchestrated Tools

| Tool | Description |
|------|-------------|
| `capture_webpage` | Screenshot and analyze a webpage |
| `reconstruct_page` | Recreate captured page in Figma |
| `generate_ui` | Generate UI from text description |

## Example Prompts

```
Get the structure of my Figma file: [paste figma URL]

Create a landing page with a header, hero section with headline and CTA button, three feature cards, and a footer

Capture https://example.com and recreate it in Figma

Export the frame "Hero Section" as a PNG
```

## Architecture

```
┌─────────────┐     ┌─────────────────┐     ┌──────────────────┐
│ AI Agent    │────▶│ figmad-mcp      │────▶│ Figma Plugin     │
│ (Claude)    │stdio│ (MCP Server)    │ ws  │ (runs in Figma)  │
└─────────────┘     └────────┬────────┘     └──────────────────┘
                             │
                             ├──▶ Figma REST API (read operations)
                             └──▶ Playwright (web capture)
```

## Development

```bash
npm run dev          # Watch mode
npm run typecheck    # Type checking
npm run lint         # Linting

cd plugin
npm run watch        # Watch plugin changes
```

## License

MIT
