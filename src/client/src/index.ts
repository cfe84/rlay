
import { ConfigurationLoader } from "./ConfigurationLoader"
import { RlayHttpClient } from "./RlayHttpClient"
import { RlayTcpClient } from "./RlayTcpClient"


const configuration = ConfigurationLoader.loadConfiguration()
if (configuration.type === "http") {
  new RlayHttpClient(configuration)
} else {
  new RlayTcpClient(configuration)
}