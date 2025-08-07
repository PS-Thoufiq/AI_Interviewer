# Use Node image to build the app
FROM node:18 AS build

WORKDIR /app
COPY . .
RUN npm install
RUN npm run build

# Use simple server to serve dist folder
FROM node:18

WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/dist ./dist
EXPOSE 3000

CMD ["serve", "-s", "dist", "-l", "3000"]
