# figmad-mcp Documentation

## How It Works

figmad-mcp is an MCP (Model Context Protocol) server that enables AI agents to interact with Figma. It runs as a **stdio-based server** that your AI client (Claude Desktop, Cursor, etc.) spawns and communicates with.

```mermaid
graph TB
    subgraph "Your Computer"
        subgraph "AI Client"
            Claude[Claude Desktop / Cursor / IDE]
        end
        
        subgraph "figmad-mcp Process"
            MCP[MCP Server<br/>stdio transport]
            Bridge[Plugin Bridge<br/>WebSocket :9001]
            PW[Playwright<br/>Browser Engine]
            Analyzer[Code Analyzer]
        end
        
        subgraph "Figma Desktop/Browser"
            Plugin[figmad Plugin]
            FigmaUI[Figma Canvas]
        end
    end
    
    subgraph "Figma Cloud"
        API[Figma REST API]
        Files[(Design Files)]
    end
    
    Claude <-->|stdio JSON-RPC| MCP
    MCP <-->|HTTPS| API
    API <--> Files
    MCP <--> Bridge
    Bridge <-->|WebSocket| Plugin
    Plugin <--> FigmaUI
    MCP --> PW
    MCP --> Analyzer
```

## MCP Communication Flow

The MCP protocol uses JSON-RPC over stdio. When you ask Claude to interact with Figma:

```mermaid
sequenceDiagram
    participant User
    participant Claude as Claude Desktop
    participant MCP as figmad-mcp
    participant Figma as Figma API
    participant Plugin as Figma Plugin

    User->>Claude: "Get the structure of my Figma file"
    Claude->>MCP: Tool call: get_file({fileKey: "abc123"})
    MCP->>Figma: GET /v1/files/abc123
    Figma-->>MCP: File JSON response
    MCP-->>Claude: Tool result: {document: {...}}
    Claude-->>User: "Here's your file structure..."
```

## Setup & Running

### Step 1: Configure Your AI Client

Add figmad-mcp to your MCP client configuration:

**Claude Desktop** (`~/.config/claude/claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "figmad": {
      "command": "node",
      "args": ["/absolute/path/to/figmad-mcp/dist/index.js"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "figd_xxxxxxxxxxxxx"
      }
    }
  }
}
```

**Cursor** (`.cursor/mcp.json` in your project):
```json
{
  "mcpServers": {
    "figmad": {
      "command": "node",
      "args": ["/absolute/path/to/figmad-mcp/dist/index.js"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "figd_xxxxxxxxxxxxx"
      }
    }
  }
}
```

### Step 2: Start Your AI Client

When you start Claude Desktop or Cursor, it automatically spawns the figmad-mcp process.

```mermaid
flowchart LR
    A[Start Claude Desktop] --> B[Reads MCP config]
    B --> C[Spawns: node dist/index.js]
    C --> D[figmad-mcp starts]
    D --> E[Plugin Bridge listens on :9001]
    D --> F[MCP ready on stdio]
    F --> G[Claude shows figmad tools]
```

### Step 3: Connect Figma Plugin (for write operations)

```mermaid
flowchart TB
    subgraph "One-time Setup"
        A[Open Figma Desktop] --> B[Menu → Plugins → Development]
        B --> C[Import plugin from manifest]
        C --> D[Select plugin/manifest.json]
    end
    
    subgraph "Each Session"
        E[Open Figma file] --> F[Run figmad-bridge plugin]
        F --> G[Plugin connects to ws://localhost:9001]
        G --> H[Write operations now available]
    end
```

## Tool Categories

### Read Operations (Always Available)

These use the Figma REST API directly - no plugin needed:

```mermaid
flowchart LR
    subgraph "Read Tools"
        GF[get_file]
        GN[get_node]
        GC[get_components]
        GS[get_styles]
        GV[get_variables]
        EI[export_image]
    end
    
    subgraph "Figma API"
        API[REST API]
    end
    
    GF --> API
    GN --> API
    GC --> API
    GS --> API
    GV --> API
    EI --> API
```

### Write Operations (Plugin Required)

These require the Figma plugin to be running:

```mermaid
flowchart LR
    subgraph "Write Tools"
        CF[create_frame]
        CR[create_rectangle]
        CT[create_text]
        UN[update_node]
        AL[apply_auto_layout]
        SF[set_fills]
        DN[delete_node]
    end
    
    subgraph "Plugin Bridge"
        WS[WebSocket Server]
    end
    
    subgraph "Figma"
        PL[Plugin]
        Canvas[Canvas]
    end
    
    CF --> WS
    CR --> WS
    CT --> WS
    UN --> WS
    AL --> WS
    SF --> WS
    DN --> WS
    WS <--> PL
    PL --> Canvas
```

### Orchestrated Tools (Complex Workflows)

These combine multiple operations:

```mermaid
flowchart TB
    subgraph "generate_ui"
        GU[Parse prompt] --> GU2[Create layout structure]
        GU2 --> GU3[Create frames/shapes/text]
        GU3 --> GU4[Apply styles]
    end
    
    subgraph "capture_webpage"
        CW[Launch Playwright] --> CW2[Navigate to URL]
        CW2 --> CW3[Screenshot + DOM extraction]
        CW3 --> CW4[Detect UI components]
        CW4 --> CW5[Store capture]
    end
    
    subgraph "reconstruct_page"
        RP[Load capture] --> RP2[Create root frame]
        RP2 --> RP3[Recreate DOM as Figma nodes]
        RP3 --> RP4[Apply computed styles]
    end
    
    subgraph "analyze_codebase"
        AC[Scan directory] --> AC2[Parse components]
        AC2 --> AC3[Extract props/variants]
        AC3 --> AC4[Find Tailwind/CSS tokens]
    end
    
    subgraph "sync_design_tokens"
        ST[Load Figma variables] --> ST2[Load code tokens]
        ST2 --> ST3[Compare/generate output]
    end
```

## Workflow Examples

### Workflow 1: Generate UI from Prompt

```mermaid
sequenceDiagram
    participant User
    participant Claude
    participant MCP
    participant Bridge
    participant Plugin

    User->>Claude: Create a login page with email, password, and submit button
    Claude->>MCP: plugin_status()
    MCP-->>Claude: {connected: true}
    Claude->>MCP: generate_ui({prompt: "login page..."})
    
    loop For each UI element
        MCP->>Bridge: CREATE_FRAME / CREATE_TEXT / etc
        Bridge->>Plugin: WebSocket message
        Plugin-->>Bridge: {nodeId: "1:23"}
        Bridge-->>MCP: Result
    end
    
    MCP-->>Claude: {frameId: "1:5", elementsCreated: 12}
    Claude-->>User: Created login page with 12 elements!
```

### Workflow 2: Capture Website → Figma

```mermaid
sequenceDiagram
    participant User
    participant Claude
    participant MCP
    participant Playwright
    participant Bridge
    participant Plugin

    User->>Claude: Capture stripe.com and recreate in Figma
    
    Note over Claude,MCP: Step 1: Capture
    Claude->>MCP: capture_webpage({url: "https://stripe.com"})
    MCP->>Playwright: Launch browser
    Playwright->>Playwright: Navigate, screenshot, extract DOM
    Playwright-->>MCP: {captureId: "cap_123", components: [...]}
    MCP-->>Claude: Capture complete, 47 components detected
    
    Note over Claude,MCP: Step 2: Reconstruct
    Claude->>MCP: reconstruct_page({captureId: "cap_123"})
    
    loop For each DOM element
        MCP->>Bridge: CREATE_FRAME / CREATE_TEXT
        Bridge->>Plugin: Execute command
        Plugin-->>Bridge: Success
    end
    
    MCP-->>Claude: {framesCreated: 89, textsCreated: 156}
    Claude-->>User: Recreated stripe.com with 245 elements!
```

### Workflow 3: Code → Figma Token Sync

```mermaid
sequenceDiagram
    participant User
    participant Claude
    participant MCP
    participant FileSystem
    participant FigmaAPI

    User->>Claude: Compare my React project tokens with Figma file xyz123
    
    Note over Claude,MCP: Step 1: Analyze Code
    Claude->>MCP: analyze_codebase({path: "/my/project"})
    MCP->>FileSystem: Scan for components
    MCP->>FileSystem: Parse tailwind.config.js
    MCP->>FileSystem: Extract CSS variables
    FileSystem-->>MCP: Components + tokens
    MCP-->>Claude: {analysisId: "ana_456", colors: 24, spacing: 12}
    
    Note over Claude,MCP: Step 2: Compare
    Claude->>MCP: sync_design_tokens({direction: "compare", figmaFileKey: "xyz123", analysisId: "ana_456"})
    MCP->>FigmaAPI: Get variables
    FigmaAPI-->>MCP: Figma tokens
    MCP->>MCP: Compare tokens
    MCP-->>Claude: {matching: 18, onlyFigma: 6, onlyCode: 12}
    
    Claude-->>User: Found 18 matching tokens, 6 only in Figma, 12 only in code
```

## Data Flow Diagrams

### Read Operation Data Flow

```mermaid
flowchart TB
    subgraph "Input"
        I1[fileKey: abc123]
        I2[nodeIds: 1:5, 1:6]
    end
    
    subgraph "MCP Server"
        V[Validate params]
        C[FigmaApiClient]
        R[Retry logic]
        T[Transform response]
    end
    
    subgraph "Figma API"
        E1[GET /v1/files/:key]
        E2[GET /v1/files/:key/nodes]
        E3[GET /v1/images/:key]
    end
    
    subgraph "Output"
        O1[File structure JSON]
        O2[Node details JSON]
        O3[Image URL]
    end
    
    I1 --> V --> C --> E1
    I2 --> V --> C --> E2
    C --> R --> T
    E1 --> T --> O1
    E2 --> T --> O2
    E3 --> T --> O3
```

### Write Operation Data Flow

```mermaid
flowchart TB
    subgraph "Tool Input"
        I[create_frame params]
    end
    
    subgraph "MCP Server"
        V[Validate with Zod]
        B[PluginBridge]
        Q[Command Queue]
        W[Wait for response]
    end
    
    subgraph "WebSocket"
        WS[Send JSON command]
        WR[Receive JSON response]
    end
    
    subgraph "Figma Plugin"
        P[Parse command]
        E[Execute: figma.createFrame]
        R[Return nodeId]
    end
    
    subgraph "Output"
        O[{nodeId: "1:23"}]
    end
    
    I --> V --> B --> Q --> WS
    WS --> P --> E --> R --> WR
    WR --> W --> O
```

### Capture & Reconstruct Data Flow

```mermaid
flowchart TB
    subgraph "Capture Phase"
        URL[URL Input] --> PW[Playwright Browser]
        PW --> SS[Screenshot PNG]
        PW --> DOM[DOM Tree]
        DOM --> CS[Computed Styles]
        DOM --> CD[Component Detection]
        SS --> Store[(Capture Store)]
        CS --> Store
        CD --> Store
    end
    
    subgraph "Reconstruct Phase"
        Store --> Load[Load Capture]
        Load --> Parse[Parse DOM tree]
        Parse --> Map[Map to Figma nodes]
        
        Map --> Frame[createFrame]
        Map --> Rect[createRectangle]
        Map --> Text[createText]
        
        Frame --> Plugin[Figma Plugin]
        Rect --> Plugin
        Text --> Plugin
        
        Plugin --> Canvas[Figma Canvas]
    end
```

## Architecture Deep Dive

### Component Architecture

```mermaid
graph TB
    subgraph "Entry Point"
        Index[src/index.ts]
    end
    
    subgraph "Server Layer"
        Server[src/server.ts]
        Server --> Tools
        Server --> Transport[StdioServerTransport]
    end
    
    subgraph "Tools Layer"
        Tools[src/tools/]
        Tools --> Read[read/]
        Tools --> Write[write/]
        Tools --> Orch[orchestrated/]
    end
    
    subgraph "Services Layer"
        Read --> FigmaAPI[services/figma-api/]
        Write --> PluginBridge[services/plugin-bridge/]
        Orch --> Playwright[services/playwright/]
        Orch --> CodeAnalyzer[services/code-analyzer/]
    end
    
    subgraph "Shared"
        Lib[lib/]
        Types[types/]
    end
    
    FigmaAPI --> Lib
    PluginBridge --> Lib
    Playwright --> Types
    CodeAnalyzer --> Types
    
    Index --> Server
```

### Plugin Architecture

```mermaid
graph TB
    subgraph "Plugin Entry"
        Code[code.ts<br/>Main thread]
        UI[ui.ts + ui.html<br/>UI thread]
    end
    
    subgraph "Communication"
        Code <-->|postMessage| UI
        UI <-->|WebSocket| External[MCP Server :9001]
    end
    
    subgraph "Command Handlers"
        Code --> Handlers[Command Router]
        Handlers --> CF[createFrame]
        Handlers --> CR[createRectangle]
        Handlers --> CT[createText]
        Handlers --> UN[updateNode]
        Handlers --> AL[applyAutoLayout]
    end
    
    subgraph "Figma API"
        CF --> FigmaCreate[figma.createFrame]
        CR --> FigmaRect[figma.createRectangle]
        CT --> FigmaText[figma.createText]
    end
```

## Error Handling

```mermaid
flowchart TB
    subgraph "Error Types"
        FE[FigmaApiError<br/>REST API failures]
        PE[PluginBridgeError<br/>WebSocket issues]
        PN[PluginNotConnectedError<br/>Plugin not running]
        PT[PluginTimeoutError<br/>Command timeout]
        CE[CaptureError<br/>Playwright failures]
        VE[ValidationError<br/>Invalid params]
    end
    
    subgraph "Error Flow"
        Tool[Tool execution]
        Tool -->|try| Success[Return result]
        Tool -->|catch| Format[formatErrorForMcp]
        Format --> Response[{isError: true, text: message}]
    end
    
    subgraph "Retry Logic"
        FE -->|429, 503| Retry[Automatic retry]
        Retry -->|3 attempts| Final[Return error]
    end
```

## Quick Reference

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FIGMA_ACCESS_TOKEN` | Yes | - | Personal access token from Figma |
| `PLUGIN_BRIDGE_PORT` | No | 9001 | WebSocket port for plugin |
| `DEBUG` | No | false | Enable debug logging |
| `CAPTURE_DIR` | No | ./captures | Directory for screenshots |

### File Structure

```
figmad-mcp/
├── src/
│   ├── index.ts              # Entry point
│   ├── server.ts             # MCP server setup
│   ├── tools/
│   │   ├── read/             # REST API tools
│   │   ├── write/            # Plugin bridge tools
│   │   └── orchestrated/     # Complex workflow tools
│   ├── services/
│   │   ├── figma-api/        # REST client
│   │   ├── plugin-bridge/    # WebSocket server
│   │   ├── playwright/       # Web capture
│   │   └── code-analyzer/    # Component parser
│   ├── lib/                  # Shared utilities
│   └── types/                # TypeScript types
├── plugin/
│   ├── manifest.json         # Figma plugin manifest
│   ├── code.ts               # Plugin main code
│   └── ui.ts + ui.html       # Plugin UI
└── dist/                     # Built output
```
