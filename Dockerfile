FROM node:22-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (pakai npm install jika belum ada package-lock.json)
RUN npm install --omit=dev

# Copy source code
COPY . .

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 8080) + '/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Expose port
EXPOSE 8080

# Run app
CMD ["node", "server.js"]
