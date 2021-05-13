import * as express from "express"
import * as http from "http"
import { v4 as uuidv4 } from 'uuid';
import { Request } from "./Request"
import { Response } from "./Response";
import { Server, Socket } from "socket.io"

const port = process.env.PORT || 8080
const password = process.env.PASSWORD
if (!password) {
  console.error(`No password specified.`)
  process.exit(1)
}

const app = express()
const server = http.createServer(app)

const io = new Server(server)
let socket: Socket | undefined = undefined
io.on("connection", (newSocket: Socket) => {
  console.log(`Client connection request`)
  if (newSocket.handshake.auth.password !== password) {
    console.error(`Password does not match. Rejecting connection`)
    newSocket.emit("incorrect password")
    newSocket.disconnect(true)
    return
  }
  if (socket !== undefined) {
    console.log(`Replacing old socket`)
    socket.disconnect(true)
  }
  socket = newSocket
  socket.on("disconnect", () => {
    console.log("Client disconnected")
    socket = undefined
  })
})

app.all("*", (req, res) => {
  if (req.path.indexOf("socket.io") >= 0) {
    return
  }
  let body = ""
  req.on("data", (chunk) => body += chunk)
  req.on("end", () => {
    const requestId = uuidv4()
    const request: Request = {
      method: req.method,
      path: req.path,
      body,
      headers: req.rawHeaders,
      id: requestId
    }
    if (!socket) {
      res.statusCode = 502
      res.send("No client connected")
      console.error("Request received but no client connected")
      return
    }
    console.log(`Transmitting request ${requestId}`)
    socket.emit("request received", request)
    // TODO: handle timeout
    socket.once(`response for ${requestId}`, (response: Response) => {
      console.log(`Received response`)
      Object.keys(response.headers).forEach(key => {
        res.setHeader(key, response.headers[key])
      })
      res.statusCode = response.statusCode
      if (response.body) {
        res.write(response.body)
      }
      res.send()
    })
  })
})
server.listen(port, () => {
  console.log(`Listening for HTTP requests on ${port}`)
})