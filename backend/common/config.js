/*This is the configuration file for the WeChat backend. */

const dotenv = require('dotenv');

const env = process.env.NODE_ENV || 'development';
dotenv.config({ path: `.env.${env}` });

const config = {
  ENVIRONMENT: process.env.NODE_ENV || 'development',
  HOST: process.env.HOST || 'localhost',
  PORT: process.env.PORT || 3000,
  SWAGGER_ENABLED: process.env.SWAGGER_ENABLED || false,
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/wechat',
  SALT_ROUNDS: process.env.SALT_ROUNDS || 10,
  SMTP_USER: process.env.SMTP_USER || '*',
  SMTP_PASS: process.env.SMTP_PASS || '*',
  VERIFICATION_CODE_LENGTH: process.env.VERIFICATION_CODE_LENGTH || 6,
  VERIFICATION_CODE_EXPIRATION_MINUTES: process.env.VERIFICATION_CODE_EXPIRATION_MINUTES || 5,
  VERIFICATION_CODE_CLEANUP_INTERVAL_MINUTES: process.env.VERIFICATION_CODE_CLEANUP_INTERVAL_MINUTES || 10,
  FRONTEND_VERIFICATION_URL: process.env.FRONTEND_VERIFICATION_URL || 'http://localhost:3000/verify-email',
  FRONTEND_LOGIN_URL: process.env.FRONTEND_LOGIN_URL || 'http://localhost:3000/login',
  REFRESH_TOKEN_CLEANUP_INTERVAL_MINUTES: process.env.REFRESH_TOKEN_CLEANUP_INTERVAL_MINUTES || 60,
  JWT_SECRET_KEY: process.env.JWT_SECRET || 'supersecretkeythatisverylongandsecurexd',
  JWT_EXPIRATION_TIME: process.env.JWT_EXPIRATION_TIME || '15m',
  JWT_ALGORITHM: process.env.JWT_ALGORITHM || 'HS256',
  JWT_ISSUER: process.env.JWT_ISSUER || 'WeChat',
  REFRESH_TOKEN_EXPIRATION_MINUTES: process.env.REFRESH_TOKEN_EXPIRATION_MINUTES || 10080, // 7 days
  PASSWORD_RESET_CODE_LENGTH: process.env.PASSWORD_RESET_CODE_LENGTH || 6,
  PASSWORD_RESET_CODE_EXPIRATION_MINUTES: process.env.PASSWORD_RESET_CODE_EXPIRATION_MINUTES || 5,
  PASSWORD_RESET_CODE_CLEANUP_INTERVAL_MINUTES: process.env.PASSWORD_RESET_CODE_CLEANUP_INTERVAL_MINUTES || 60,  // CORS Configuration
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:4200',  // Can be comma-separated list
  CORS_METHODS: process.env.CORS_METHODS || 'GET,HEAD,PUT,PATCH,POST,DELETE',
  CORS_CREDENTIALS: process.env.CORS_CREDENTIALS === 'true' || true,
  CORS_MAX_AGE: process.env.CORS_MAX_AGE || 86400, // 24 hours in seconds
  CORS_ALLOW_HEADERS: process.env.CORS_ALLOW_HEADERS || 'Content-Type,Authorization,X-Requested-With,Accept,Origin,X-Device-ID'
}

module.exports = config;