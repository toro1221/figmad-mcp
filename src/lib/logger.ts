type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private minLevel: LogLevel;
  private prefix: string;

  constructor(prefix: string = 'figmad', minLevel: LogLevel = 'info') {
    this.prefix = prefix;
    this.minLevel = minLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.minLevel];
  }

  private formatMessage(level: LogLevel, message: string, data?: unknown): string {
    const timestamp = new Date().toISOString();
    const dataStr = data ? ` ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${this.prefix}] [${level.toUpperCase()}] ${message}${dataStr}`;
  }

  debug(message: string, data?: unknown): void {
    if (this.shouldLog('debug')) {
      console.error(this.formatMessage('debug', message, data));
    }
  }

  info(message: string, data?: unknown): void {
    if (this.shouldLog('info')) {
      console.error(this.formatMessage('info', message, data));
    }
  }

  warn(message: string, data?: unknown): void {
    if (this.shouldLog('warn')) {
      console.error(this.formatMessage('warn', message, data));
    }
  }

  error(message: string, error?: unknown): void {
    if (this.shouldLog('error')) {
      const errorData = error instanceof Error 
        ? { message: error.message, stack: error.stack }
        : error;
      console.error(this.formatMessage('error', message, errorData));
    }
  }

  child(prefix: string): Logger {
    return new Logger(`${this.prefix}:${prefix}`, this.minLevel);
  }

  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }
}

export const logger = new Logger('figmad', process.env.DEBUG === 'true' ? 'debug' : 'info');

export function createLogger(prefix: string): Logger {
  return logger.child(prefix);
}
