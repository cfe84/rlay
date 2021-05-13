
import { ConfigurationLoader } from "./ConfigurationLoader"
import { RlayClient } from "./RlayClient"


const configuration = ConfigurationLoader.loadConfiguration()
new RlayClient(configuration)