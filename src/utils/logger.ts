const PREFIX = '[GitHub Manager]';

function formatArgs(args: any[]): any[] {
  return [PREFIX, ...args];
}

export const logger = {
  log(..._args: any[]): void {
  },

  info(..._args: any[]): void {
  },

  warn(..._args: any[]): void {
  },

  error(...args: any[]): void {
    console.error(...formatArgs(args));
  },

  debug(..._args: any[]): void {
  }
};
