import { WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

const logDir = 'logs';

// Custom format for console output (simple and clean)
const consoleFormat = winston.format.printf(({ level, message, context, timestamp }) => {
  const contextStr = context ? `[${context}] ` : '';
  return `${timestamp} ${level}: ${contextStr}${message}`;
});

// Custom format for file output (detailed)
const fileFormat = winston.format.printf(({ level, message, context, timestamp, ...meta }) => {
  const contextStr = context ? `[${context}] ` : '';
  const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
  return `${timestamp} ${level}: ${contextStr}${message}${metaStr}`;
});

export const winstonConfig: WinstonModuleOptions = {
  level: 'debug', // Global level - controls what gets logged
  transports: [
    // Console transport - info level and above for clean CLI output
    new winston.transports.Console({
      level: 'info',
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        consoleFormat
      ),
    }),

    // Daily rotating file for all logs (debug and above)
    new winston.transports.DailyRotateFile({
      level: 'debug',
      dirname: logDir,
      filename: 'product-ingest-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d', // Keep logs for 14 days
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        fileFormat
      ),
    }),

    // Separate file for errors only
    new winston.transports.DailyRotateFile({
      level: 'error',
      dirname: logDir,
      filename: 'product-ingest-error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d', // Keep error logs longer
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        fileFormat
      ),
    }),
  ],
};
