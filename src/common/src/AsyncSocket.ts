import { Socket, SocketConnectOpts } from "net";
import { } from "crypto-js"
import { createSecretKey, KeyObject } from "crypto"

const callback = (resolve: () => void, reject: (reason?: any) => void) => {
  return (err: Error | undefined) => {
    if (err) {
      reject(err)
    } else {
      resolve()
    }
  }
}

export class AsyncSocket {
  key: KeyObject
  constructor(public socket: Socket, password: string) {
    this.key = createSecretKey(password, "ascii")
  }

  connectAsync(options: SocketConnectOpts): Promise<void> {
    return new Promise((resolve) => {
      this.socket.connect(options, () => {
        resolve()
      })
    })
  }

  writeAsync(buffer: Buffer | string): Promise<void> {
    // @todo Encrypt
    // const encrypted = cypher
    return new Promise((resolve, reject) => {
      this.socket.write(buffer, callback(resolve, reject))
    })
  }

  endAsync(): Promise<void> {
    return new Promise((resolve) => {
      this.socket.end(() => resolve())
    })
  }

  on(event: string | "close" | "connect" | "data" | "drain" | "end" | "error" | "lookup" | "timeout",
    listener: (...args: any[]) => void): AsyncSocket {
    if (event === "data") {
      this.socket.on("data", (data) => {
        // @todo Decrypt
        listener(data)
      })
    } else {
      this.socket.on(event, listener)
    }
    return this
  }
}