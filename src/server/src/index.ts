import { ConfigurationLoader } from "./ConfigurationLoader";
import { Logger } from "./Logger";
import { RlayServer } from "./RlayServer";

const config = ConfigurationLoader.loadConfiguration()
const logger = new Logger(config.logLevel)
new RlayServer(config, logger)
