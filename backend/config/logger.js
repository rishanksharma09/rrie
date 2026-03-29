import winston, { format } from "winston";
const { combine, timestamp, label, printf, errors } = format;

const myFormat = printf(({ level, message, label, timestamp, stack }) => {
  return `${timestamp} [${label || 'rrie-backend'}] ${level}: ${stack || message}`;
});

const logger = winston.createLogger({
    level: 'info',
    format: combine(
      errors({ stack: true }), // Critical to extract stack traces from Error objects
      label({ label: 'backend' }),
      timestamp({ format: 'HH:mm:ss' }),
      myFormat
    ),
    defaultMeta: { service: 'rrie-backend' },
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
    ],
    exceptionHandlers: [
      new winston.transports.File({ filename: 'error.log' })
    ],
    rejectionHandlers: [
      new winston.transports.File({ filename: 'error.log' })
    ]
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: combine(
            errors({ stack: true }), // Extract stacks for console
            format.colorize(),
            timestamp({ format: 'HH:mm:ss' }),
            myFormat
        ),
        handleExceptions: true,
        handleRejections: true
    }));
}

export default logger;