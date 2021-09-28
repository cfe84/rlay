FROM node:14-alpine as build
WORKDIR /app
COPY . .
# TODO: use your .gitignore as a .dockerignore
RUN npm install
RUN npm build

FROM node:14-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY package.json .

EXPOSE 8080

ENV RLAY_PORT=8080
ENTRYPOINT npm start