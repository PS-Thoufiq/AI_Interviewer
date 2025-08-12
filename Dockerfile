# Stage 1: Build the app
FROM node:18 AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --silent
COPY . .
RUN npm run build

# Stage 2: Serve the app
FROM node:18

WORKDIR /app
RUN npm install -g serve

COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
