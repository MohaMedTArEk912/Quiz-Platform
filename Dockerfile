# Use Node.js 20 as base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy project files
COPY . .

# Build the frontend
RUN npm run build

# Expose port (Hugging Face uses PORT env var)
ENV PORT=7860
EXPOSE 7860

# Start the server
CMD ["node", "server/index.js"]
