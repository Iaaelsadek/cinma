// Audit System Logger

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  component: string;
  message: string;
  data?: any;
}

class AuditLogger {
  private logs: LogEntry[] = [];
  private minLevel: LogLevel = 'info';

  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentIndex = levels.indexOf(this.minLevel);
    const messageIndex = levels.indexOf(level);
    return messageIndex >= currentIndex;
  }

  private log(level: LogLevel, component: string, message: string, data?: any): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      component,
      message,
      data,
    };

    this.logs.push(entry);

    const prefix = `[${entry.timestamp.toISOString()}] [${level.toUpperCase()}] [${component}]`;
    const logMessage = `${prefix} ${message}`;

    switch (level) {
      case 'error':
        console.error(logMessage, data || '');
        break;
      case 'warn':
        console.warn(logMessage, data || '');
        break;
      case 'info':
        console.info(logMessage, data || '');
        break;
      case 'debug':
        console.debug(logMessage, data || '');
        break;
    }
  }

  error(component: string, message: string, data?: any): void {
    this.log('error', component, message, data);
  }

  warn(component: string, message: string, data?: any): void {
    this.log('warn', component, message, data);
  }

  info(component: string, message: string, data?: any): void {
    this.log('info', component, message, data);
  }

  debug(component: string, message: string, data?: any): void {
    this.log('debug', component, message, data);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

export const auditLogger = new AuditLogger();
