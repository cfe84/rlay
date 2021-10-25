import { LogLevel } from "./Logger";

export interface ServerConfiguration {
  port: {
    tcp: number,
    http: number
  }
  password: string
  logLevel: LogLevel
}