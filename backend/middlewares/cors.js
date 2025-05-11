/**
 * CORS middleware configuration
 */
const cors = require('cors');
const config = require('../common/config');

/**
 * Configures and returns CORS middleware
 * @returns {Function} - Configured CORS middleware
 */
const configureCors = () => {
  const corsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl requests)
      if (!origin) return callback(null, true);
      
      // Parse the allowed origins
      const allowedOrigins = Array.isArray(config.CORS_ORIGIN) 
        ? config.CORS_ORIGIN 
        : config.CORS_ORIGIN.split(',');
      
      // Check if the origin is allowed
      if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }    },
    methods: config.CORS_METHODS,
    allowedHeaders: config.CORS_ALLOW_HEADERS,
    credentials: config.CORS_CREDENTIALS,
    maxAge: config.CORS_MAX_AGE,
    optionsSuccessStatus: 200
  };
  
  return cors(corsOptions);
};

module.exports = configureCors;
