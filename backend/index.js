const express = require("express");
const config = require("./common/config");
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const app = express();

// Swagger setup
if (config.SWAGGER_ENABLED === 'true') {
  const swaggerOptions = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'WeChat API',
        version: '1.0.0',
        description: 'API documentation for WeChat backend service.',
        contact: {
          name: 'Radovan Draskovic',
          email: 'radovandk@gmail.com',
          url: 'https://github.com/Drashko73'
        }
      },
      servers: [
        {
          url: `http://localhost:${config.PORT}`,
          description: 'Local development Server',
        },
        {
          url: `http://${config.HOST}:${config.PORT}`,
          description: 'Production Server',
        }
      ]
    },
    apis: ['./routes/*.js'],
  };

  const swaggerSpec = swaggerJsdoc(swaggerOptions);
  app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  console.log('Swagger UI available at http://localhost:' + config.PORT + '/swagger');
}

const healthCheckRouter = require("./routes/healthRoutes");

app.use('/api/', healthCheckRouter);

// Start the server
app.listen(config.PORT, () => {
  console.log(`Server is running on port ${config.PORT}...`);
});

module.exports = app;