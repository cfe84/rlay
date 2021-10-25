import { Socket, Server } from "net"
import { Logger } from "./Logger";
import { ServerConfiguration } from "./ServerConfiguration";
import { AsyncSocket, CommandMessage, TcpCommand } from "rlay-common"
import { v4 as uuid } from "uuid"
import { createAlias } from "./Alias";

const ERROR_CONNECTION_RESET = `read ECONNRESET`;
const ERROR_ENDED_BY_OTHER_PARTY = "This socket has been ended by the other party"

export class RlayTcpServer {
  private separator = uuid()
  private commandSocket?: AsyncSocket
  constructor(private config: ServerConfiguration, private logger: Logger) {
    const server = new Server((socket) => {
      this.handleSocketConnection(socket)
    })
    server.listen(config.port.tcp, () => {
      logger.info(`Listening for TCP requests on ${config.port.tcp}`)
    })
    server.on("error", (err) => {
      logger.error(`Unmanaged error ${err}`)
    })
  }

  /**
   * When a new socket connects we wait until we start receiving data, then
   * split into either a new client socket connection, or an inbound connection
   * from a consumer of Rlay
   * @param socket Inbound socket
   */
  private handleSocketConnection(socket: Socket) {
    const socketId = createAlias()
    socket.once("data", (chunk) => {
      this.logger.debug(`${socketId}: Handle socket connection`)
      if (chunk.toString("utf8", 0, TcpCommand.Connect.length) === TcpCommand.Connect) {
        this.handleClientSocketConnectionAsync(new AsyncSocket(socket), chunk.toString()).then()
      } else {
        this.handleNewInboundConnectionAsync(new AsyncSocket(socket), chunk, socketId).then()
      }
    })
  }

  private sockets: { [socketId: string]: { socket: AsyncSocket, buffer: Buffer[] } } = {}

  /**
   * Called when a consumer of Rlay opens a new socket and starts sending
   * data. Since we don't have a data socket opened yet, we're holding onto the data
   * until the rlay client called back with a data socket for that inbound socket.
   * Once this happens, configureDataSocket is called back and we defer to that
   * @param socket 
   * @param chunk 
   */
  private async handleNewInboundConnectionAsync(socket: AsyncSocket, chunk: Buffer, socketId: string) {
    const buffer = [chunk]
    const temporaryListener = (moreData: Buffer) => {
      console.log(`Received more: ${moreData.toString()}`)
      buffer.push(moreData)
    }
    socket.socket.addListener("data", temporaryListener)
    this.sockets[socketId] = { socket, buffer }
    await this.sendMessageToClientAsync(TcpCommand.OpenSocket, { socketId })
    socket.on("error", (err) => {
      if (err.message === ERROR_CONNECTION_RESET) {
        this.logger.info(`${socketId}: Socket disconnected`)
      } else if (err.message === ERROR_ENDED_BY_OTHER_PARTY) {
        this.logger.info(`${socketId}: Socket forcibly closed`)
      } else {
        this.logger.error(`${socketId}: Socket error: ${err.message}`)
      }
    })
  }

  /**
   * The inbound connection is a data relay socket. We set it up for relay transfer
   * @param inboundSocket 
   * @param line 
   */
  private async configureDataSocketAsync(inboundSocket: AsyncSocket, line: string) {
    const [command, password, socketId] = line.split("\n")
    const record = this.sockets[socketId]
    record.socket.socket.removeAllListeners("data")
    const relayDataSocket = record.socket
    for (let buffer of record.buffer) {
      await inboundSocket.writeAsync(buffer)
    }
    relayDataSocket.on("data", (data) => inboundSocket.socket.write(data))
    inboundSocket.on("data", (data) => relayDataSocket.socket.write(data))
    relayDataSocket.on("close", () => {
      this.logger.debug(`${socketId}: closed from relay`)
      inboundSocket.socket.end()
      delete this.sockets[socketId]
    })
    inboundSocket.on("close", () => {
      this.logger.debug(`${socketId}: closed by client`)
      relayDataSocket.socket.end()
      delete this.sockets[socketId]
    })
    this.logger.debug(`${socketId}: Confirming data socket`)
    await this.sendMessageToClientAsync(TcpCommand.Configure, { socketId })
  }

  private validatePassword(line: string) {
    const [command, password] = line.split("\n")
    if (password !== this.config.password) {
      throw (Error(`Incorrect password`))
    }
  }

  private async sendMessageToClientAsync(command: TcpCommand, data?: any, error?: any) {
    if (this.commandSocket) {
      const message: CommandMessage = {
        command,
        data,
        error
      }
      const serializedMessage = JSON.stringify(message) + "\n" + this.separator + "\n"
      await this.commandSocket.writeAsync(serializedMessage)
    } else {
      this.logger.warn(`Tried to send ${command} on command socket, but it's not connected.`)
    }
  }

  private async handleClientSocketConnectionAsync(socket: AsyncSocket, command: string) {
    try {
      this.validatePassword(command)
      if (command.startsWith(TcpCommand.ConnectCommand)) {
        await this.configureCommandSocketAsync(socket)
      } else if (command.startsWith(TcpCommand.ConnectData)) {
        await this.configureDataSocketAsync(socket, command)
      } else {
        throw (Error(`Unknown command: ${command}`))
      }
    } catch (error) {
      this.logger.error(error)
      await this.sendMessageToClientAsync(TcpCommand.Error, undefined, error)
    }
  }

  private async configureCommandSocketAsync(socket: AsyncSocket) {
    this.logger.info(`Client connected`)
    // @todo Handle when a client is already connected
    this.commandSocket = socket
    // Protocol: first line on response to command socket connection is
    // message separator
    await socket.writeAsync(this.separator + "\n")
    await this.sendMessageToClientAsync(TcpCommand.Hello, "Hello!")
    const disconnectCommandSocket = () => {
      this.commandSocket = undefined
      this.disconnectClient()
    }
    socket.on("error", (err) => {
      if (err.message === ERROR_CONNECTION_RESET) {
        disconnectCommandSocket()
      } else {
        this.logger.error(`Error on command socket: ${err.message}`)
      }
    })
    socket.on("data", (data) => { })
  }

  private disconnectClient() {
    this.logger.info(`Client disconnected`)
    Object.values(this.sockets).forEach(socket => socket.socket.socket.end())
    if (this.commandSocket) {
      this.commandSocket.socket.end()
    }
  }
}
