# Use official Node.js LTS image as base
FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package files first to leverage Docker cache
COPY package*.json ./

# Install dependencies
RUN npm install
# For production use:
# RUN npm ci --only=production

# Copy application source code
COPY . .

# Expose the application port
EXPOSE 3002

# Define the command to run the app
CMD ["npm", "start"]