# Base image
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Expose port
EXPOSE 5000

# Health check
    CMD node -e "fetch('http://localhost:5000/').then(r => {if (r.status !== 200) process.exit(1)}).catch(() => process.exit(1))"


# Start the application
CMD ["npm", "start"]
