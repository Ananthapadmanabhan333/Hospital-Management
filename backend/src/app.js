'use strict';

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const xssClean = require('xss-clean');
const hpp = require('hpp');
const swaggerUi = require('swagger-ui-express');

const swaggerSpec = require('./config/swagger');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const { corsOptions } = require('./config/cors');

const app = express();

// ──────────────── Security Middleware ────────────────
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'blob:'],
        },
    },
    crossOriginEmbedderPolicy: false,
}));

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ──────────────── Rate Limiting ────────────────
const globalLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 'error', message: 'Too many requests, please try again later.' },
    skip: (req) => req.path === '/api/health',
});
app.use('/api', globalLimiter);

// ──────────────── Body Parsing ────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ──────────────── Data Sanitization ────────────────
app.use(xssClean());
app.use(hpp());
app.use(compression());

// ──────────────── Logging ────────────────
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined', {
        stream: { write: (msg) => logger.http(msg.trim()) },
        skip: (req) => req.path === '/api/health',
    }));
}

// ──────────────── Static Files ────────────────
app.use('/uploads', express.static('uploads', {
    setHeaders: (res) => {
        res.set('X-Content-Type-Options', 'nosniff');
    },
}));

// ──────────────── API Docs ────────────────
if (process.env.NODE_ENV !== 'production') {
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: 'Hospital CMS API',
    }));
}

// ──────────────── Routes ────────────────
app.use('/api', routes);

// ──────────────── Health Check ────────────────
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), env: process.env.NODE_ENV });
});

// ──────────────── 404 Handler ────────────────
app.use((req, res) => {
    res.status(404).json({ status: 'error', message: `Route ${req.method} ${req.path} not found` });
});

// ──────────────── Global Error Handler ────────────────
app.use(errorHandler);

module.exports = app;
