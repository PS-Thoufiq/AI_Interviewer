# Use Node image to build the app
FROM node:18 as build

WORKDIR /app
COPY . .
RUN npm install
RUN npm run build

# Use simple server to serve build folder
FROM node:18

WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/build ./build
EXPOSE 3000

CMD ["serve", "-s", "build", "-l", "3000"]
