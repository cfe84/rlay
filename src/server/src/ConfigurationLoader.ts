import { ServerConfiguration } from "./ServerConfiguration";
import * as dotenv from "dotenv";
import { LogLevel } from "./Logger";
dotenv.config();

export class ConfigurationLoader {
  static loadConfiguration(): ServerConfiguration {
    const httpPort = process.env.RLAY_PORT || 8080;
    const tcpPort = process.env.RLAY_TCP_PORT || 8081;
    const password = process.env.RLAY_PASSWORD;
    if (!password) {
      console.error(`No password specified.`);
      process.exit(1);
    }
    const logLevelStr = process.env.RLAY_LOGLEVEL
    let logLevel = LogLevel.Info
    switch (logLevelStr) {
      case "DEBUG": logLevel = LogLevel.Debug
        break
      case "INFO":
      case "LOG":
        logLevel = LogLevel.Info
        break
      case "WARNING":
      case "WARN":
        logLevel = LogLevel.Warning
        break
      case "ERR":
      case "ERROR": logLevel = LogLevel.Error
        break
    }
    return {
      port: {
        http: typeof httpPort === "number" ? httpPort : Number.parseInt(httpPort),
        tcp: typeof tcpPort === "number" ? tcpPort : Number.parseInt(tcpPort),
      },
      password,
      logLevel
    };
  }
}
