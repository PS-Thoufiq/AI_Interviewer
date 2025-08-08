# Stage 1: Build the app
FROM node:18 AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --silent
COPY . .
RUN npm run build

# Verify build output (for debugging)
RUN ls -la /app/dist

# Stage 2: Serve the app
FROM node:18

WORKDIR /app
RUN npm install -g serve

# Copy only the built files
COPY --from=builder /app/dist ./dist

# Verify copied files (for debugging)
RUN ls -la /app/dist

EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]