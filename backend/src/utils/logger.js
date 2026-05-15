'use strict';

const { createLogger, format, transports } = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

const logDir = process.env.LOG_DIR || './logs';
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

const { combine, timestamp, errors, splat, json, colorize, printf } = format;

const consoleFormat = printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} [${level}]: ${stack || message}`;
});

const logger = createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        splat(),
        json()
    ),
    defaultMeta: { service: 'hospital-cms' },
    transports: [
        // Error log
        new DailyRotateFile({
            filename: path.join(logDir, 'error-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            level: 'error',
            maxFiles: '30d',
            maxSize: '20m',
            zippedArchive: true,
        }),
        // Combined log
        new DailyRotateFile({
            filename: path.join(logDir, 'combined-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxFiles: '14d',
            maxSize: '50m',
            zippedArchive: true,
        }),
        // Audit log
        new DailyRotateFile({
            filename: path.join(logDir, 'audit-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            level: 'info',
            maxFiles: '90d',
            maxSize: '100m',
            zippedArchive: true,
        }),
    ],
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new transports.Console({
        format: combine(
            colorize(),
            timestamp({ format: 'HH:mm:ss' }),
            errors({ stack: true }),
            consoleFormat
        ),
    }));
}

module.exports = logger;
