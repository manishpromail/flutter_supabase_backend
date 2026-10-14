# ==============================================================================
# Production Dockerfile for Node.js Express Backend
# Optimized for Cloud Deployment on Render (Alpine Linux, Node 22 LTS)
# ==============================================================================

# 1. Base Image: Official lightweight Node.js 22 LTS on Alpine Linux
FROM node:22-alpine

# 2. Set container working directory
WORKDIR /app

# 3. Set Node environment to production
ENV NODE_ENV=production

# 4. Copy dependency manifests first to leverage Docker layer caching
COPY package*.json ./

# 5. Clean install of production dependencies only
RUN npm ci --omit=dev

# 6. Copy application source code into the image
COPY . .

# 7. Expose default port (Render automatically sets $PORT at runtime)
EXPOSE 3000

# 8. Security best practice: switch from root to unprivileged built-in 'node' user
USER node

# 9. Launch the Express server
CMD ["node", "src/server.js"]
