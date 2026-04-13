import { LokiLogger } from 'byteforge-loki-logging-ts';

const DEBUG_LOCAL = process.env.DEBUG_LOCAL === 'true';
const LOKI_URL = process.env.LOKI_URL;
const LOKI_USER = process.env.LOKI_USER;
const LOKI_PASS = process.env.LOKI_PASS;
const LOKI_CA_PATH = process.env.LOKI_CA_PATH;

const useLoki = !DEBUG_LOCAL && !!LOKI_URL;

interface LogExtra {
  [key: string]: string;
}

interface Logger {
  debug(message: string, extra?: LogExtra): void;
  info(message: string, extra?: LogExtra): void;
  warning(message: string, extra?: LogExtra): void;
  error(message: string, extra?: LogExtra): void;
  critical(message: string, extra?: LogExtra): void;
}

function formatPrefix(level: string, name: string): string {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}] [${name}]`;
}

function formatExtra(extra?: LogExtra): string {
  if (!extra || Object.keys(extra).length === 0) {
    return '';
  }
  return ' ' + JSON.stringify(extra);
}

function createConsoleLogger(name: string): Logger {
  return {
    debug(message: string, extra?: LogExtra): void {
      console.debug(`${formatPrefix('DEBUG', name)} ${message}${formatExtra(extra)}`);
    },
    info(message: string, extra?: LogExtra): void {
      console.info(`${formatPrefix('INFO', name)} ${message}${formatExtra(extra)}`);
    },
    warning(message: string, extra?: LogExtra): void {
      console.warn(`${formatPrefix('WARNING', name)} ${message}${formatExtra(extra)}`);
    },
    error(message: string, extra?: LogExtra): void {
      console.error(`${formatPrefix('ERROR', name)} ${message}${formatExtra(extra)}`);
    },
    critical(message: string, extra?: LogExtra): void {
      console.error(`${formatPrefix('CRITICAL', name)} ${message}${formatExtra(extra)}`);
    },
  };
}

function createLokiLogger(name: string): Logger {
  const transportConfig: { url: string; auth?: { username: string; password: string }; verify?: string | boolean } = {
    url: LOKI_URL!,
  };

  if (LOKI_USER && LOKI_PASS) {
    transportConfig.auth = { username: LOKI_USER, password: LOKI_PASS };
  }

  if (LOKI_CA_PATH) {
    transportConfig.verify = LOKI_CA_PATH;
  }

  return new LokiLogger(
    {
      transport: transportConfig,
      emitter: {
        tags: { application: 'gatekeeper-console', env: 'production' },
        asJson: true,
      },
      batch: {
        capacity: 20,
        flushIntervalMs: 3000,
      },
    },
    name,
  );
}

export function createLogger(name: string): Logger {
  if (useLoki) {
    return createLokiLogger(name);
  }
  return createConsoleLogger(name);
}

export const logger = createLogger('gatekeeper-console');

const mode = useLoki ? `loki (${LOKI_URL})` : 'console (DEBUG_LOCAL)';
logger.info(`Logger initialized in ${mode} mode`);
