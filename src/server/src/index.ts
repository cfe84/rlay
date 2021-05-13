import { ConfigurationLoader } from "./ConfigurationLoader";
import { RlayServer } from "./RlayServer";

const config = ConfigurationLoader.loadConfiguration()
new RlayServer(config)
