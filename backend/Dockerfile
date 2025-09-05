# Use the official Node.js image as base
FROM node:alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy the rest of the application code
COPY . .

# Create uploads directory with proper permissions
RUN mkdir -p uploads/profile_pics uploads/chat_files && \
    chown -R node:node uploads

# Create logs directory with proper permissions
RUN mkdir -p logs && \
    chown -R node:node logs

# Switch to non-root user for security
USER node

# Expose the port the app runs on
EXPOSE 3000

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { \
    if (res.statusCode === 200) { \
      process.exit(0); \
    } else { \
      process.exit(1); \
    } \
  }).on('error', () => { process.exit(1); });"

# Start the application
CMD ["node", "index.js"]
