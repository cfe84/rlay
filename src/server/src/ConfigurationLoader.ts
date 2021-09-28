import { ServerConfiguration } from "./ServerConfiguration";
import * as dotenv from "dotenv";
import { LogLevel } from "./logger";
dotenv.config();

export class ConfigurationLoader {
  static loadConfiguration(): ServerConfiguration {
    const port = process.env.RLAY_PORT || 8080;
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
      port: typeof port === "number" ? port : Number.parseInt(port),
      password,
      logLevel
    };
  }
}
