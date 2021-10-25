export interface Configuration {
  localPort: number
  relayPort: number
  localHost: string
  relayHost: string
  password: string
  type: "tcp" | "http"
}