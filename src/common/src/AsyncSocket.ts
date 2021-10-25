import { Socket, SocketConnectOpts } from "net";

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
  constructor(public socket: Socket) { }

  connectAsync(options: SocketConnectOpts): Promise<void> {
    return new Promise((resolve) => {
      this.socket.connect(options, () => {
        resolve()
      })
    })
  }

  writeAsync(buffer: Buffer | string): Promise<void> {
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
    this.socket.on(event, listener)
    return this
  }
}