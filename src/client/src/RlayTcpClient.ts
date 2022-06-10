import { Socket } from "net";
import { Configuration } from "./Configuration";
import { CommandMessage, TcpCommand, TcpDataHandler, AsyncSocket } from "../../common/src"
import { TcpDataSocket } from "./TcpDataSocket";

const ERROR_CONNECTION_RESET = `read ECONNRESET`;
const ERROR_ENDED_BY_OTHER_PARTY = "This socket has been ended by the other party"
const ERROR_CONNECTION_REFUSED = `ECONNREFUSED`


export class RlayTcpClient {
  private sockets: { [socketId: string]: TcpDataSocket } = {}

  constructor(private config: Configuration) {
    this.connectAsync().then()
  }

  private async connectAsync() {
    let abort = false
    const commandSocket = new AsyncSocket(new Socket(), this.config.password)
    console.log(`Connecting to ${this.config.relayHost}:${this.config.relayPort}`)
    try {
      commandSocket.socket.once("error", (err: any) => {
        console.error(`Error connecting: ${err.message}`)
        setTimeout(() => this.connectAsync().then(), 2000)
        abort = true
      })
      await commandSocket.connectAsync({
        host: this.config.relayHost,
        port: this.config.relayPort
      })
      if (!abort) {
        await commandSocket.writeAsync(TcpCommand.ConnectCommand + '\n' + this.config.password)
      }
    } catch (err) {
      console.error(`Main catch`)
      if (!abort) {
        setTimeout(() => this.connectAsync().then(), 2000)
        abort = true
      }
      return
    }

    const dataHandler = new TcpDataHandler()
    commandSocket.on("data", dataHandler.getDataHandler(this.handleMessage.bind(this)))
    commandSocket.on("close", () => {
      console.log(`Disconnected.`)
      if (!abort) {
        setTimeout(() => this.connectAsync().then(), 2000)
        abort = true
      }
    })
    commandSocket.on("error", (err: any) => {
      if (err.message === ERROR_CONNECTION_RESET
        || err.message === ERROR_ENDED_BY_OTHER_PARTY) {
        console.error(`Connection error`)
      }
    })
  }

  private handleMessage(message: CommandMessage) {
    if (message.command === TcpCommand.Hello) {
      console.log("Connected.")
    }
    if (message.command === TcpCommand.OpenSocket) {
      const socketId = message.data.socketId
      this.sockets[socketId] = new TcpDataSocket(this.config, socketId)
    }
    if (message.command === TcpCommand.Configure) {
      const socketId = message.data.socketId
      const socket = this.sockets[socketId]
      socket.confirmConnectionAsync().then()
    }
    if (message.command === TcpCommand.CloseSocket) {
      console.debug(`Close socket`)
      const socketId = message.data.socketId
      const socket = this.sockets[socketId]
      delete this.sockets[socketId]
    }
  }
}