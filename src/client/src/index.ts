import { parseCommandLine } from "yaclip"
import { io } from "socket.io-client"
import * as http from "http"
import { Request } from "./Request"
import { Response } from "./Response"

const commands = parseCommandLine([
  { name: "relay-port", alias: "P", "type": String, description: "Port on relay server" },
  { name: "relay-host", alias: "H", "type": String, description: "Host of relay server", optional: false },
  { name: "port", alias: "p", "type": String, description: "Local port", optional: false },
  { name: "host", alias: "h", "type": String, description: "Host of local server" },
], { dashesAreOptional: true })

const localPort = Number.parseInt((commands["port"] as any).value)
const relayPort = commands["relay-port"] ? Number.parseInt((commands["relay-port"] as any).value) : 8081
const localHost = commands["host"] ? (commands["host"] as any).value : "localhost"
const relayHost = (commands["relay-host"] as any).value

const parseHeaders = (headers: string[]): { [key: string]: string } => {
  const res: { [key: string]: string } = {}
  for (let i = 0; i < headers.length; i += 2) {
    res[headers[i]] = headers[i + 1]
  }
  return res
}

const url = `http://${relayHost}:${relayPort}`
const socket = io(url)
console.log(`Connected to ${url}`)
socket.on("request received", (request: Request) => {
  const date = new Date()
  process.stdout.write(`${date.getHours()}:${date.getMinutes()} ${request.method} ${request.path}: `)

  const response: Response = {
    body: "",
    headers: {},
    statusCode: 200
  }

  const req = http.request({
    host: localHost,
    port: localPort,
    path: request.path,
    method: request.method,
    headers: parseHeaders(request.headers)
  }, (res) => {
    let body = ""
    res.on("data", (chunk) => body += chunk)
    res.on("end", () => {
      response.body = body
      response.statusCode = res.statusCode || 0
      response.headers = parseHeaders(res.rawHeaders)
      console.log(response.statusCode)
      socket.emit(`response for ${request.id}`, response)
    })
  })
  req.on('error', (err) => {
    response.statusCode = 500
    response.body = `Error in relay: ${err}`
    console.log(response.statusCode)
    socket.emit(`response for ${request.id}`, response)
  })
  if (request.body) {
    req.write(request.body)
  }
  req.end()

})