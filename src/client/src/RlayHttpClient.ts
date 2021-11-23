import { Configuration } from "./Configuration";
import { io, Socket } from "socket.io-client";
import * as http from "http";
import * as https from "https";
import { ClientRequest, IncomingMessage, RequestOptions } from "http";
import { HttpRequest, HttpResponse } from "rlay-common"

interface Protocol {
  request(options: RequestOptions, callback?: (res: IncomingMessage) => void): ClientRequest;
}

export class RlayHttpClient {
  private socket: Socket;
  private protocol: Protocol;

  constructor(private config: Configuration) {
    const { relayHost, relayPort, password } = config;
    const useHttps = config.https
    if (config.https) {
      console.log(`You chose HTTPS, to help with local development we will ignore invalid certificates. ` +
        `This will generate a warning.`)
      process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";
    }
    this.protocol = useHttps ? https : http
    this.socket = this.connect(relayHost, relayPort, password);
    this.socket.on("request received", this.processRequest.bind(this));
    this.socket.on(
      "incorrect password",
      this.handleIncorrectPassword.bind(this)
    );
  }

  private handleIncorrectPassword() {
    console.error("Incorrect password");
    this.socket.disconnect();
  }

  private connect(
    relayHost: string,
    relayPort: number,
    password: string
  ): Socket {
    const url = `${relayHost}:${relayPort}`;
    const socket = io(url, { auth: { password } });
    console.log(`Connecting HTTP to ${url}`);
    socket.on("connect", () => {
      console.log(`Connected HTTP to ${url}`);
    });
    socket.on("disconnect", (reason: string) => {
      console.log(`Disconnected. Reason: ${reason}. Attempting reconnection`);
    });
    return socket;
  }

  private processRequest(request: HttpRequest) {
    const date = new Date();
    process.stdout.write(
      `${date.getHours()}:${date.getMinutes()} ${request.method} ${request.path
      }: `
    );
    this.forwardRequestAsync(request)
      .then(this.processHttpResponseAsync.bind(this))
      .then((response) => this.forwardResponse(request.id, response))
      .catch((error) => this.forwardError(request.id, error));
  }

  private forwardRequestAsync(request: HttpRequest): Promise<IncomingMessage> {
    return new Promise((resolve, reject) => {
      const req = this.protocol.request(
        {
          host: this.config.localHost,
          port: this.config.localPort,
          path: request.path,
          method: request.method,
          headers: RlayHttpClient.parseHeaders(request.headers),
        },
        (res) => {
          resolve(res);
        }
      );
      req.on("error", (err) => {
        reject(err);
      });
      if (request.body) {
        const body = Buffer.from(request.body, "base64")
        req.write(body);
        if (this.config.outputBody) {
          console.info(`\n===\nRequest ${request.id}: \n${body}\n`)
        }
      }
      req.end();
    });
  }

  private processHttpResponseAsync(res: IncomingMessage): Promise<HttpResponse> {
    return new Promise((resolve) => {
      let body: Buffer = Buffer.from([]);
      res.on("data", (chunk) => {
        body = Buffer.concat([body, chunk]);
      });
      res.on("end", () => {
        const response: HttpResponse = {
          body: body.toString("base64"),
          bodySize: body.byteLength,
          headers: RlayHttpClient.parseHeaders(res.rawHeaders),
          statusCode: res.statusCode || 0,
        };
        resolve(response);
      });
    });
  }

  private forwardResponse(requestId: string, response: HttpResponse) {
    if (this.config.outputBody) {
      console.info(`\n===\nResponse ${requestId}: Code: ${response.statusCode}, Body: \n${Buffer.from(response.body, "base64")}\n`)
    } else {
      console.log(response.statusCode);
    }
    this.socket.emit(`response for ${requestId}`, response);
  }

  private forwardError(requestId: string, error: Error) {
    const body = `Error in relay: ${error}`
    const response: HttpResponse = {
      statusCode: 500,
      body: Buffer.from(body).toString("base64"),
      headers: {},
      bodySize: body.length
    };
    console.log(response.statusCode);
    this.socket.emit(`response for ${requestId}`, response);
  }

  private static parseHeaders(headers: string[]): { [key: string]: string } {
    const res: { [key: string]: string } = {};
    for (let i = 0; i < headers.length; i += 2) {
      res[headers[i]] = headers[i + 1];
    }
    return res;
  }
}
