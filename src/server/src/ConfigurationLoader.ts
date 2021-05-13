import { ServerConfiguration } from "./ServerConfiguration";

export class ConfigurationLoader {
  static loadConfiguration(): ServerConfiguration {
    const port = process.env.PORT || 8080
    const password = process.env.PASSWORD
    if (!password) {
      console.error(`No password specified.`)
      process.exit(1)
    }
    return {
      port: typeof port === "number" ? port : Number.parseInt(port),
      password
    }
  }
}