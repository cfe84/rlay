FROM node:16-alpine as build
WORKDIR /app
COPY ./src ./src
COPY ./package*.json .
RUN npm install && npm run build

FROM node:16-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY package*.json .
COPY --from=build /app/node_modules ./node_modules

EXPOSE 8080
EXPOSE 8081

ENV RLAY_PORT=8080
ENV RLAY_TCP_PORT=8081
ENTRYPOINT npm run start