import { ConfigurationLoader } from "./ConfigurationLoader";
import { Logger } from "./Logger";
import { RlayHttpServer } from "./RlayHttpServer";
import { RlayTcpServer } from "./RlayTcpServer";

const config = ConfigurationLoader.loadConfiguration()
const logger = new Logger(config.logLevel)
new RlayHttpServer(config, logger)
new RlayTcpServer(config, logger)