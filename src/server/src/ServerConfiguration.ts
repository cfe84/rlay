import { LogLevel } from "./Logger";

export interface ServerConfiguration {
  port: number
  password: string
  logLevel: LogLevel
}