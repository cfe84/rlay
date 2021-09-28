import * as p from "path"

export enum LogLevel {
  Debug = 1,
  Info = 2,
  Warning = 3,
  Error = 4
}

export class Logger {
  private functionLength = 10
  private functionMaxLength = 45

  constructor(private logLevel: LogLevel) { }

  private padFunctionName(name: string): string {
    if (name.length < this.functionLength) {
      while (name.length !== this.functionLength) {
        name += " "
      }
    } else {
      this.functionLength = Math.min(this.functionMaxLength, name.length)
    }
    return name
  }

  private findFunctionName(): string {
    if (this.logLevel > LogLevel.Debug) {
      return ""
    }
    const formatRes = (name: string) => `${this.padFunctionName(name)}: `
    const regex = /\s+at\s(\S+)(?:\s*\(([^)]+)\))?/
    const err = new Error().stack?.split("\n")
    if (!err) {
      return formatRes("(function undefined)")
    }
    for (let i = 3; i < err.length; i++) {
      const splat = regex.exec(err[i])
      if (!splat) {
        continue
      }
      const name = splat[1]
      const path = splat[2]
      const isPromiseResult = !path
      if (isPromiseResult) {
        const pathComponents = name.split(p.sep)
        return formatRes(pathComponents[pathComponents.length - 1])
      }
      const isAnonymousFunction = name.endsWith("<anonymous>")
      if (isAnonymousFunction) {
        const pathComponents = path.split(p.sep)
        return formatRes(pathComponents[pathComponents.length - 1])
      }
      return formatRes(name)
    }
    return formatRes("(function name not found)")
  }

  debug(message?: any, ...params: any) {
    if (this.logLevel <= LogLevel.Debug) {
      console.debug(`${this.findFunctionName()}DEBUG: ${message}`, ...params)
    }
  }

  log(message?: any, ...params: any) {
    this.info(message, ...params)
  }

  info(message?: any, ...params: any) {
    if (this.logLevel <= LogLevel.Info) {
      console.info(`${this.findFunctionName()}INFO:  ${message}`, ...params)
    }
  }

  warn(message?: any, ...params: any) {
    if (this.logLevel <= LogLevel.Warning) {
      console.warn(`${this.findFunctionName()}WARN:  ${message}`, ...params)
    }
  }

  error(message?: any, ...params: any) {
    if (this.logLevel <= LogLevel.Error) {
      console.error(`${this.findFunctionName()}ERROR: ${message}`, ...params)
    }
  }
}