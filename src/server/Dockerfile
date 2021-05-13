FROM node:14-alpine
WORKDIR /app
COPY . .
# TODO: use your .gitignore as a .dockerignore
RUN npm install

# TODO: Change port if necessary
EXPOSE 8080

# TODO: add ENV if necessary
ENV RLAY_PORT=8080
ENTRYPOINT npm start