'use strict';

const swaggerJsDoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Hospital Clinical Management System API',
            version: '1.0.0',
            description: 'Production-grade REST API for Hospital CMS with RBAC, audit logging, and full clinical workflow support.',
            contact: { name: 'Hospital IT Team', email: 'it@hospitalcms.com' },
        },
        servers: [
            { url: `http://localhost:${process.env.PORT || 5000}/api`, description: 'Development' },
            { url: 'https://api.hospitalcms.com/api', description: 'Production' },
        ],
        components: {
            securitySchemes: {
                bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
                cookieAuth: { type: 'apiKey', in: 'cookie', name: 'accessToken' },
            },
            schemas: {
                Error: {
                    type: 'object',
                    properties: {
                        status: { type: 'string', example: 'error' },
                        message: { type: 'string' },
                        errors: { type: 'array', items: { type: 'object' } },
                    },
                },
                Pagination: {
                    type: 'object',
                    properties: {
                        page: { type: 'integer' },
                        limit: { type: 'integer' },
                        total: { type: 'integer' },
                        totalPages: { type: 'integer' },
                    },
                },
            },
        },
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
    },
    apis: ['./src/routes/**/*.js', './src/models/**/*.js'],
};

module.exports = swaggerJsDoc(options);
