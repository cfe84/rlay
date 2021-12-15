FROM node:14-alpine as build
WORKDIR /app
COPY ./common ./common
COPY ./server ./server
# TODO: use your .gitignore as a .dockerignore
RUN cd common && npm install && npm run build
RUN cd server && npm install && npm run build

FROM node:14-alpine
WORKDIR /app/common
COPY --from=build /app/common/dist ./dist
COPY --from=build /app/common/node_modules ./node_modules
COPY common/package.json .
COPY common/package-lock.json .
WORKDIR /app/server
COPY --from=build /app/server/dist ./dist
COPY --from=build /app/server/node_modules ./node_modules
COPY server/package.json .
COPY server/package-lock.json .

EXPOSE 8080
EXPOSE 8081

ENV RLAY_PORT=8080
ENV RLAY_TCP_PORT=8081
ENTRYPOINT npm run start