import { Socket } from "net";
import { AsyncSocket, TcpCommand } from "rlay-common";
import { Configuration } from "./Configuration";

export class TcpDataSocket {
  private dataSocket: AsyncSocket
  private localSocket: AsyncSocket

  private buffer: Buffer[] = []
  private lock = false
  private connected = false

  constructor(config: Configuration, private socketId: string) {
    this.connectAsync(config, socketId).then()
    this.dataSocket = new AsyncSocket(new Socket(), config.password)
    this.localSocket = new AsyncSocket(new Socket(), config.password)
  }

  private async connectAsync(config: Configuration, socketId: string) {
    await this.dataSocket.connectAsync({
      host: config.relayHost,
      port: config.relayPort
    })
    console.debug(`${this.socketId}: Connecting data socket`)
    await this.dataSocket.writeAsync(TcpCommand.ConnectData + '\n' + config.password + "\n" + socketId)
    await this.setupBridgeAsync(config.localHost, config.localPort)
  }

  public async confirmConnectionAsync() {
    console.debug(`${this.socketId}: Confirmed new socket`)
    this.connected = true
    await this.sendBufferAsync()
  }

  private async sendBufferAsync() {
    if (this.connected) {
      if (!this.lock) {
        this.lock = true
        while (this.buffer.length) {
          const first = this.buffer.shift()
          if (!first) {
            return
          }
          try {
            await this.dataSocket.writeAsync(first);
          } catch (err) {
            console.error(err)
          }
        }
        this.lock = false
      } else {
        console.warn(`${this.socketId}: Writing while socket is locked`)
      }
    } else {
      console.warn(`${this.socketId}: Writing while socket is not confirmed yet`)
    }
  }

  private async setupBridgeAsync(host: string, port: number) {
    this.localSocket.on("data", (data: any) => {
      this.buffer.push(data)
      this.sendBufferAsync().then()
    })
    this.dataSocket.on("data", (data: any) => {
      if (!this.localSocket.socket.destroyed) {
        this.localSocket.socket.write(data)
      }
      else {
        console.warn(`Writing on closed socket ${this.socketId}`)
      }
    })
    this.localSocket.on("close", () => {
      console.debug(`${this.socketId}: closed locally`)
      this.dataSocket.socket.end()
    })
    this.dataSocket.on("close", () => {
      console.debug(`${this.socketId}: closed from relay`)
      this.localSocket.socket.end()
    })
    await this.localSocket.connectAsync({
      host: host,
      port: port
    })
  }

  public async closeSocketAsync() {
    console.log("Closed socket")
    await this.localSocket.endAsync()
    await this.dataSocket.endAsync()
  }
}