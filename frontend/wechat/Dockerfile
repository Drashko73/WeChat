# Multi-stage build for Angular frontend

# Stage 1: Build the Angular application
FROM node:alpine AS build

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the Angular application for production
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine AS production

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built Angular app from build stage
COPY --from=build /app/dist/wechat/browser /usr/share/nginx/html

# Create directory for environment config
RUN mkdir -p /usr/share/nginx/html/assets

# Expose port 80
EXPOSE 80

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
