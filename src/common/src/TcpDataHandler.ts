import { CommandMessage } from "./CommandMessage"

export class TcpDataHandler {
  getDataHandler(messageHandler: (message: CommandMessage) => void) {
    let agg: string[] = []
    let commandSeparator: string | undefined = undefined
    return (chunk: Buffer) => {
      const data = chunk.toString().split("\n")
      for (let line of data) {
        if (!commandSeparator) {
          commandSeparator = line
          continue
        }
        if (line === commandSeparator) {
          const data = agg.join("\n")
          const message = JSON.parse(data) as CommandMessage
          messageHandler(message)
          agg = []
        } else {
          agg.push(line)
        }
      }
    }
  }
}

