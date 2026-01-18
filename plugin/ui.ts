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

let ws: WebSocket | null = null;
let isConnected = false;

const statusDot = document.getElementById('statusDot') as HTMLDivElement;
const statusText = document.getElementById('statusText') as HTMLSpanElement;
const wsUrlInput = document.getElementById('wsUrl') as HTMLInputElement;
const connectBtn = document.getElementById('connectBtn') as HTMLButtonElement;
const logDiv = document.getElementById('log') as HTMLDivElement;

function updateStatus(connected: boolean) {
  isConnected = connected;
  statusDot.classList.toggle('connected', connected);
  statusText.textContent = connected ? 'Connected' : 'Disconnected';
  connectBtn.textContent = connected ? 'Disconnect' : 'Connect';
}

function addLog(type: 'cmd' | 'success' | 'error', message: string) {
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  
  const time = new Date().toLocaleTimeString();
  entry.innerHTML = `<span class="log-time">${time}</span> <span class="log-${type}">${message}</span>`;
  
  logDiv.insertBefore(entry, logDiv.firstChild);
  
  while (logDiv.children.length > 50) {
    logDiv.removeChild(logDiv.lastChild!);
  }
}

function connect() {
  if (ws) {
    ws.close();
    ws = null;
    updateStatus(false);
    return;
  }

  const url = wsUrlInput.value;
  addLog('cmd', `Connecting to ${url}...`);

  try {
    ws = new WebSocket(url);

    ws.onopen = () => {
      updateStatus(true);
      addLog('success', 'Connected to MCP server');
    };

    ws.onclose = () => {
      updateStatus(false);
      addLog('error', 'Disconnected');
      ws = null;
    };

    ws.onerror = (error) => {
      addLog('error', 'Connection error');
      console.error('WebSocket error:', error);
    };

    ws.onmessage = (event) => {
      try {
        const command = JSON.parse(event.data) as PluginCommand;
        addLog('cmd', `← ${command.type}`);
        
        parent.postMessage({ pluginMessage: { type: 'command', command } }, '*');
      } catch (error) {
        addLog('error', 'Failed to parse message');
      }
    };
  } catch (error) {
    addLog('error', `Failed to connect: ${error}`);
  }
}

connectBtn.addEventListener('click', connect);

onmessage = (event) => {
  const msg = event.data.pluginMessage;
  
  if (msg?.type === 'response' && msg.response) {
    const response = msg.response as PluginResponse;
    
    if (response.success) {
      addLog('success', `✓ Command ${response.id.substring(0, 8)}`);
    } else {
      addLog('error', `✗ ${response.error}`);
    }
    
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(response));
    }
  }
};

setTimeout(connect, 500);
