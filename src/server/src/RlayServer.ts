import * as express from "express";
import * as http from "http";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import { Server, Socket } from "socket.io";

import { ServerConfiguration } from "./ServerConfiguration";
import { Request } from "./Request";
import { Response } from "./Response";
import { Logger } from "./Logger";

const ERROR_NO_CONNECTION = "No socket connected";
const MAX_LOGS_DEFAULT = 50;

interface CallLog {
  date: Date,
  request?: Request,
  response?: Response
}

interface State {
  client: {
    connected: boolean
  },
  captureLogs: boolean
}

export class RlayServer {
  socket: Socket | undefined = undefined;

  private logs: CallLog[] = []
  private maxLogs = MAX_LOGS_DEFAULT
  private captureLogs = false

  constructor(private config: ServerConfiguration, private logger: Logger) {
    const server = this.createServer();
    server.listen(this.config.port, () => {
      this.logger.info(`Listening for HTTP requests on ${this.config.port}`);
    });
  }

  private addCallLog(log: CallLog) {
    if (this.captureLogs) {
      this.logs.push(log)
      while (this.logs.length > this.maxLogs) {
        this.logs.shift()
      }
    }
  }

  private createServer() {
    const app = express();
    const server = http.createServer(app);
    const io = new Server(server, {
      maxHttpBufferSize: 1e15
    });
    io.on("connection", this.handleNewConnection.bind(this));
    app.use("/rlay", express.static(path.join(__dirname, "static")))
    app.get("/rlay/calls", this.getCalls.bind(this))
    app.get("/rlay/login", this.login.bind(this))
    app.get("/rlay/state", this.getState.bind(this))
    app.patch("/rlay/state", this.patchState.bind(this))
    app.all("*", this.handleRequest.bind(this));
    return server;
  }

  private login(req: express.Request, res: express.Response) {
    if (req.headers["password"] !== this.config.password) {
      res.statusCode = 403
      res.send(JSON.stringify("Wrong password"))
      return
    }
    res.send('{"status": "success"}')
  }

  private getCalls(req: express.Request, res: express.Response) {
    if (req.headers["password"] !== this.config.password) {
      res.statusCode = 403
      res.send(JSON.stringify("Wrong password"))
      return
    }
    res.contentType("application/json")
    res.write(JSON.stringify(this.logs, null, 2))
    res.send()
  }

  private getState(req: express.Request, res: express.Response) {
    if (req.headers["password"] !== this.config.password) {
      res.statusCode = 403
      res.send(JSON.stringify("Wrong password"))
      return
    }
    res.contentType("application/json")
    const state: State = {
      client: {
        connected: this.socket !== undefined
      },
      captureLogs: this.captureLogs
    }
    res.write(JSON.stringify(state, null, 2))
    res.send()
  }

  private async patchState(req: express.Request, res: express.Response) {
    if (req.headers["password"] !== this.config.password) {
      res.statusCode = 403
      res.send(JSON.stringify("Wrong password"))
      return
    }

    const body = await this.getRequestBodyAsync(req, false)
    const patchRequest = JSON.parse(body.toString()) as Partial<State>
    if (patchRequest.captureLogs !== undefined) {
      this.captureLogs = patchRequest.captureLogs
    }
    res.send("{}")
  }

  private handleNewConnection(newSocket: Socket) {
    this.logger.info(`Client connection request`);
    if (newSocket.handshake.auth.password !== this.config.password) {
      this.logger.error(`Password does not match. Rejecting connection`);
      newSocket.emit("incorrect password");
      newSocket.disconnect(true);
      return;
    }
    if (this.socket !== undefined) {
      this.logger.info(`Replacing old socket`);
      this.socket.disconnect(true);
    }
    this.socket = newSocket;
    this.logger.info("Connected");
    this.socket.on("disconnect", (err) => {
      this.logger.info(`Client disconnected: ${err}`);
      this.socket = undefined;
    });
    this.socket.on("error", (err) => {
      this.logger.error(`Socket error: ${err}`)
    })
  }

  private handleRequest(req: express.Request, res: express.Response) {
    this.logger.debug(`Received new request`)
    if (req.path.indexOf("socket.io") >= 0) {
      this.logger.debug(`Socket connection - leaving that to socket.io`)
      return;
    }
    const log: CallLog = {
      date: new Date(),
    }
    this.addCallLog(log)
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
        log.request = request
        return request;
      })
      .then(this.forwardRequestToRlayClientAsync.bind(this))
      .then((response) => {
        log.response = response
        this.forwardResponseToCaller(response, res)
      })
      .catch((error) => this.handleRlayClientError(error, res));
  }

  private getRequestBodyAsync(req: express.Request, log = false): Promise<Buffer> {
    return new Promise((resolve) => {
      log && this.logger.debug(`Collecting request body`)
      let body = Buffer.from([]);
      req.on("data", (chunk) => {
        log && this.logger.debug(`Collected data for request body`)
        body = Buffer.concat([body, chunk])
      });
      req.on("end", () => {
        log && this.logger.debug(`Request body complete`)
        resolve(body)
      });
    });
  }

  private forwardResponseToCaller(response: Response, res: express.Response) {
    this.logger.debug(`Forwarding response to caller`)
    this.copyHeaders(response, res);
    res.statusCode = response.statusCode;
    if (response.body) {
      res.write(Buffer.from(response.body, "base64"));
    }
    res.send();
    this.logger.debug(`Done forwarding response`)
  }

  private copyHeaders(response: Response, res: express.Response) {
    this.logger.debug(`Copying headers`)
    Object.keys(response.headers).forEach((key) => {
      res.setHeader(key, response.headers[key]);
    });
  }

  private forwardRequestToRlayClientAsync(request: Request): Promise<Response> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        this.logger.error(`Tried to forward request, but no client connected`)
        return reject(Error(ERROR_NO_CONNECTION));
      }
      this.logger.info(`Transmitting request ${request.id}`);
      this.socket.emit("request received", request);
      this.socket.once(`response for ${request.id}`, (response: Response) => {
        this.logger.info(`Received response`);
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
      this.logger.error("Request received but no client connected");
    } else {
      res.statusCode = 503;
      res.send(error);
      this.logger.error("Other error: " + error);
    }
  }
}
