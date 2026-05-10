'use strict';
require('dotenv').config();
const express       = require('express');
const helmet        = require('helmet');
const cors          = require('cors');
const mongoSanitize = require('express-mongo-sanitize');
const compression   = require('compression');
const cookieParser  = require('cookie-parser');

const config                      = require('./config');
const { connectDB, disconnectDB } = require('./config/database');
const requestLogger               = require('./middleware/requestLogger');
const errorHandler                = require('./middleware/errorHandler');
const { globalLimiter }           = require('./middleware/rateLimiter');
const routes                      = require('./routes');
const logger                      = require('./utils/logger');

const app = express();

// Global error handlers to prevent silent crashes and provide diagnostics
process.on('uncaughtException', (err) => {
  logger.fatal({ err, message: err.message }, 'Uncaught Exception - shutting down');
  // Allow logs to flush then exit
  setTimeout(() => process.exit(1), 100);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.fatal({ reason, promise }, 'Unhandled Rejection - shutting down');
  setTimeout(() => process.exit(1), 100);
});

// ─── Security Headers ────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: (() => {
      // Allow inline styles during development for convenience, but block in production.
      const styleSrc = config.env === 'production' ? ["'self'"] : ["'self'", "'unsafe-inline'"];
      return {
        defaultSrc: ["'self'"],
        scriptSrc:  ["'self'"],
        styleSrc,
        imgSrc:     ["'self'", 'data:'],
      };
    })(),
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
}));

// ─── CORS ────────────────────────────────────────────────────
app.use(cors({
  origin:         config.cors.allowedOrigins,
  credentials:    true,
  methods:        ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

// Handle OPTIONS preflight explicitly
app.options('*', cors());

// ─── Body Parsing ────────────────────────────────────────────
// Never compress SSE: gzip buffers small writes, so pings never flush and clients/tests time out.
app.use(compression({
  filter: (req, res) => {
    const type = res.getHeader('Content-Type');
    if (typeof type === 'string' && type.toLowerCase().includes('text/event-stream')) {
      return false;
    }
    return compression.filter(req, res);
  },
}));
app.use(cookieParser());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ─── CSRF PROTECTION ───────────────────────────────────────────
// Use double-submit cookie pattern: set a readable cookie with the CSRF token
// CSRF middleware removed — project no longer uses double-submit token pattern

// ─── NoSQL Injection Prevention ──────────────────────────────
app.use(mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    logger.warn({ key, url: req.url }, 'NoSQL injection attempt sanitized');
  },
}));

// ─── Request Logging + Rate Limiting ─────────────────────────
app.use(requestLogger);
app.use(globalLimiter);

// ─── Health Check (public) ───────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

// ─── API Routes ──────────────────────────────────────────────
app.use(`/api/${config.apiVersion}`, routes);

// ─── 404 Handler ─────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.url}`,
  });
});

// ─── Global Error Handler ────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ────────────────────────────────────────────
const start = async () => {
  await connectDB();

  const http = require('http');
  const server = http.createServer(app);

  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      logger.fatal({ err, port: config.port }, `Port ${config.port} already in use`);
      // Exit with a non-zero code so the supervisor (nodemon) can restart or user can act
      process.exit(1);
    }
    logger.fatal({ err }, 'Server error');
    process.exit(1);
  });

  server.listen(config.port, () => {
    logger.info({ port: config.port, env: config.env }, 'Server started');
  });

  // Graceful shutdown — Docker / PM2
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received — shutting down gracefully');
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  });

  // Graceful shutdown — Ctrl+C in terminal
  process.on('SIGINT', async () => {
    logger.info('SIGINT received — shutting down gracefully');
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  });
};

if (require.main === module) {
  start().catch((err) => {
    console.error('STARTUP ERROR:', err.message);
    console.error(err.stack);
    process.exit(1);
  });
}

module.exports = app; // exported for Mocha tests