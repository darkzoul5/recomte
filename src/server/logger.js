const LEVELS = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60
};

const DEFAULT_LEVEL = 'info';

const toLevelName = (value) => {
  const normalized = String(value || DEFAULT_LEVEL).trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(LEVELS, normalized) ? normalized : DEFAULT_LEVEL;
};

const formatTimestamp = (date = new Date()) => {
  const pad = (value, width = 2) => String(value).padStart(width, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const stringifyValue = (value) => {
  if (value instanceof Error) {
    return value.stack || value.message;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (value === undefined) {
    return '';
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const normalizeArgs = (args) => {
  const parts = [];
  let error = null;

  for (const arg of args) {
    if (arg instanceof Error) {
      error = arg;
      continue;
    }

    if (typeof arg === 'object' && arg !== null) {
      parts.push(stringifyValue(arg));
      continue;
    }

    parts.push(String(arg));
  }

  const message = parts.join(' ').trim() || (error?.message || '');
  return {
    message,
    error
  };
};

const shouldLog = (thresholdName, currentName) => LEVELS[currentName] >= LEVELS[thresholdName];

const writeLine = (line) => {
  process.stdout.write(`${line}\n`);
};

const shouldSuppressMessage = (levelName, message) => {
  if (levelName === 'info' && typeof message === 'string' && message.startsWith('Server listening at ')) {
    return true;
  }

  return false;
};

class AppLogger {
  constructor(level = DEFAULT_LEVEL, bindings = {}) {
    this.level = toLevelName(level);
    this.bindings = bindings;
  }

  child(bindings = {}) {
    return new AppLogger(this.level, { ...this.bindings, ...bindings });
  }

  log(levelName, ...args) {
    const currentLevel = toLevelName(levelName);
    if (!shouldLog(this.level, currentLevel)) {
      return;
    }

    const { message, error } = normalizeArgs(args);
    if (shouldSuppressMessage(currentLevel, message)) {
      return;
    }

    const bindingText = Object.entries(this.bindings)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => `${key}=${value}`)
      .join(' ');

    const base = `${formatTimestamp()} ${currentLevel.toUpperCase().padEnd(5)} ${message}`.trim();
    const line = bindingText ? `${base} ${bindingText}` : base;
    writeLine(line);

    if (error?.stack && error.stack !== message) {
      writeLine(error.stack);
    }
  }

  trace(...args) { this.log('trace', ...args); }
  debug(...args) { this.log('debug', ...args); }
  info(...args) { this.log('info', ...args); }
  warn(...args) { this.log('warn', ...args); }
  error(...args) { this.log('error', ...args); }
  fatal(...args) { this.log('fatal', ...args); }
}

export const createAppLogger = (level, bindings = {}) => new AppLogger(level, bindings);
