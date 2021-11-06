FROM node:14-alpine as build
WORKDIR /app
COPY ./common ./common
COPY ./server ./server
# TODO: use your .gitignore as a .dockerignore
RUN cd common && npm install && npm run build
RUN cd server && npm install && npm run build

FROM node:14-alpine
WORKDIR /app
COPY --from=build /app/server/dist ./dist
COPY --from=build /app/server/node_modules ./node_modules
COPY server/package.json .

EXPOSE 8080

ENV RLAY_PORT=8080
ENTRYPOINT npm run start