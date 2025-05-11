const express = require("express");
const config = require("./common/config");
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const mongoose = require('mongoose');
const configureCors = require('./middlewares/cors');
const { cleanupVerificationCodesJob } = require('./jobs/cleanupVerificationCodesJob');
const { cleanupRefreshTokensJob } = require('./jobs/cleanupRefreshTokensJob');
const { cleanupPasswordResetCodesJob } = require('./jobs/cleanupPasswordResetCodesJob');
const initializePassport = require('./middlewares/passport');

const app = express();

// Apply CORS middleware
app.use(configureCors());

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
          url: `${config.HOST}:${config.PORT}`,
          description: 'WeChat API Server',
        }
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          }
        }
      }
    },
    apis: ['./routes/*.js'],
  };

  const swaggerSpec = swaggerJsdoc(swaggerOptions);
  app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  console.log('Swagger UI available at http://localhost:' + config.PORT + '/swagger');
}


// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Passport
const passport = initializePassport();
app.use(passport.initialize());

// Connect to MongoDB
mongoose.connect(config.MONGO_URI)
.then(async () => {
  console.log('MongoDB connected successfully.');
  // Start background job for cleaning up verification codes
  cleanupVerificationCodesJob();

  // Start background job for cleaning up refresh tokens
  cleanupRefreshTokensJob();

  // Start background job for cleaning up password reset codes
  cleanupPasswordResetCodesJob();
    
  // TODO: Seed the database if needed

  // Start the server
  app.listen(config.PORT, () => {
    console.log(`Server is running on port ${config.PORT}...`);
  });

  }).catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });
  
// Routes
const healthCheckRouter = require("./routes/healthRoutes");
const authRouter = require("./routes/authRoutes");
const protectedRouter = require("./routes/protectedRoutes");

app.use('/api/', healthCheckRouter);
app.use('/api/auth', authRouter);
app.use('/api/protected', protectedRouter);

module.exports = app;