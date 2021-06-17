import * as express from "express";
import * as http from "http";
import { v4 as uuidv4 } from "uuid";
import { Server, Socket } from "socket.io";

import { ServerConfiguration } from "./ServerConfiguration";
import { Request } from "./Request";
import { Response } from "./Response";

const ERROR_NO_CONNECTION = "No socket connected";

export class RlayServer {
  socket: Socket | undefined = undefined;
  constructor(private config: ServerConfiguration) {
    const server = this.createServer();
    server.listen(this.config.port, () => {
      console.log(`Listening for HTTP requests on ${this.config.port}`);
    });
  }

  private createServer() {
    const app = express();
    const server = http.createServer(app);
    const io = new Server(server);
    io.on("connection", this.handleNewConnection.bind(this));
    app.all("*", this.handleRequest.bind(this));
    return server;
  }

  private handleNewConnection(newSocket: Socket) {
    console.log(`Client connection request`);
    if (newSocket.handshake.auth.password !== this.config.password) {
      console.error(`Password does not match. Rejecting connection`);
      newSocket.emit("incorrect password");
      newSocket.disconnect(true);
      return;
    }
    if (this.socket !== undefined) {
      console.log(`Replacing old socket`);
      this.socket.disconnect(true);
    }
    this.socket = newSocket;
    console.log("Connected");
    this.socket.on("disconnect", () => {
      console.log("Client disconnected");
      this.socket = undefined;
    });
  }

  private handleRequest(req: express.Request, res: express.Response) {
    if (req.path.indexOf("socket.io") >= 0) {
      return;
    }
    this.getRequestBodyAsync(req)
      .then((body) => {
        const requestId = uuidv4();
        const request: Request = {
          method: req.method,
          path: req.path,
          body: body.toString("base64"),
          headers: req.rawHeaders,
          id: requestId,
        };
        return request;
      })
      .then(this.forwardRequestToRlayClientAsync.bind(this))
      .then((response) => this.forwardResponseToCaller(response, res))
      .catch((error) => this.handleRlayClientError(error, res));
  }

  private getRequestBodyAsync(req: express.Request): Promise<Buffer> {
    return new Promise((resolve) => {
      let body = Buffer.from([]);
      req.on("data", (chunk) => (body = Buffer.concat([body, chunk])));
      req.on("end", () => resolve(body));
    });
  }

  private forwardResponseToCaller(response: Response, res: express.Response) {
    this.copyHeaders(response, res);
    res.statusCode = response.statusCode;
    if (response.body) {
      console.log("Decoding");
      res.write(Buffer.from(response.body, "base64"));
    }
    res.send();
  }

  private copyHeaders(response: Response, res: express.Response) {
    Object.keys(response.headers).forEach((key) => {
      res.setHeader(key, response.headers[key]);
    });
  }

  private forwardRequestToRlayClientAsync(request: Request): Promise<Response> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        return reject(Error(ERROR_NO_CONNECTION));
      }
      console.log(`Transmitting request ${request.id}`);
      this.socket.emit("request received", request);
      // TODO: handle timeout
      this.socket.once(`response for ${request.id}`, (response: Response) => {
        console.log(`Received response`);
        resolve(response);
      });
    });
  }

  private handleRlayClientError(
    error: any,
    res: express.Response<any, Record<string, any>>
  ) {
    if (error.message === ERROR_NO_CONNECTION) {
      res.statusCode = 502;
      res.send("No client connected");
      console.error("Request received but no client connected");
    } else {
      res.statusCode = 503;
      res.send(error);
      console.error("Other error: " + error);
    }
  }
}
