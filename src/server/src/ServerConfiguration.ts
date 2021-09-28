import { LogLevel } from "./logger";

export interface ServerConfiguration {
  port: number
  password: string
  logLevel: LogLevel
}