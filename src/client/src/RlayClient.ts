import { Configuration } from "./Configuration";
import { io, Socket } from "socket.io-client"
import * as http from "http"
import { Request } from "./Request"
import { Response } from "./Response"
import { IncomingMessage } from "http";

export class RlayClient {
  private socket: Socket

  constructor(private config: Configuration) {
    const { relayHost, relayPort, password } = config
    this.socket = this.connect(relayHost, relayPort, password)
    this.socket.on("request received", this.processRequest.bind(this))
    this.socket.on("incorrect password", this.handleIncorrectPassword.bind(this))
  }

  private handleIncorrectPassword() {
    console.error("Incorrect password");
    this.socket.disconnect()
  }

  private connect(relayHost: string, relayPort: number, password: string): Socket {
    const url = `${relayHost}:${relayPort}`
    const socket = io(url, { auth: { password } })
    console.log(`Connecting to ${url}`)
    socket.on("connect", () => {
      console.log(`Connected to ${url}`)
    })
    return socket
  }

  private processRequest(request: Request) {
    const date = new Date()
    process.stdout.write(`${date.getHours()}:${date.getMinutes()} ${request.method} ${request.path}: `)
    this.forwardRequestAsync(request)
      .then(this.processHttpResponseAsync.bind(this))
      .then(response => this.forwardResponse(request.id, response))
      .catch(error => this.forwardError(request.id, error))
  }

  private forwardRequestAsync(request: Request): Promise<IncomingMessage> {
    return new Promise((resolve, reject) => {
      const req = http.request({
        host: this.config.localHost,
        port: this.config.localPort,
        path: request.path,
        method: request.method,
        headers: RlayClient.parseHeaders(request.headers)
      }, (res) => {
        resolve(res)
      })
      req.on('error', (err) => {
        reject(err)
      })
      if (request.body) {
        req.write(request.body)
      }
      req.end()
    })
  }

  private processHttpResponseAsync(res: IncomingMessage): Promise<Response> {
    return new Promise((resolve) => {
      let body = ""
      res.on("data", (chunk) => body += chunk)
      res.on("end", () => {
        const response: Response = {
          body,
          headers: RlayClient.parseHeaders(res.rawHeaders),
          statusCode: res.statusCode || 0
        }
        resolve(response)
      })
    })
  }

  private forwardResponse(requestId: string, response: Response) {
    console.log(response.statusCode)
    this.socket.emit(`response for ${requestId}`, response)
  }

  private forwardError(requestId: string, error: Error) {
    const response: Response = {
      statusCode: 500,
      body: `Error in relay: ${error}`,
      headers: {}
    }
    console.log(response.statusCode)
    this.socket.emit(`response for ${requestId}`, response)
  }

  private static parseHeaders(headers: string[]): { [key: string]: string } {
    const res: { [key: string]: string } = {}
    for (let i = 0; i < headers.length; i += 2) {
      res[headers[i]] = headers[i + 1]
    }
    return res
  }
}