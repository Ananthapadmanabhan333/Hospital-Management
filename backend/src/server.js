'use strict';

require('dotenv').config();
const app = require('./app');
const db = require('./database/connection');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Verify DB connection
    await db.query('SELECT NOW()');
    logger.info('✅ Database connection established');

    // Start server
    const server = app.listen(PORT, () => {
      logger.info(`🏥 Hospital CMS API running on port ${PORT} [${process.env.NODE_ENV}]`);
      logger.info(`📚 Swagger docs at http://localhost:${PORT}/api/docs`);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      logger.info(`${signal} received - shutting down gracefully`);
      server.close(async () => {
        await db.end();
        logger.info('💤 Server and DB connections closed');
        process.exit(0);
      });
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('unhandledRejection', (err) => {
      logger.error('Unhandled Promise Rejection:', err);
      process.exit(1);
    });

    process.on('uncaughtException', (err) => {
      logger.error('Uncaught Exception:', err);
      process.exit(1);
    });

  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
