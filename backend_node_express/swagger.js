const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Task Management API',
      version: '1.0.0',
      description:
        'Express API for Task Management app (auth + task CRUD) backed by Supabase Postgres.',
    },
  },
  apis: ['./src/routes/*.js'], // JSDoc annotations live in route files
};

const swaggerSpec = swaggerJSDoc(options);
module.exports = swaggerSpec;
