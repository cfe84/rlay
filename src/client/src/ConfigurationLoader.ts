import * as usage from "command-line-usage";
import { parseCommandLine, ParsingResult } from "yaclip";
import { Configuration } from "./Configuration";
import * as dotenv from "dotenv";

dotenv.config();

export class ConfigurationLoader {
  static loadConfiguration(): Configuration {
    const options = [
      {
        name: "relay-port",
        alias: "P",
        type: String,
        description: "Port on relay server. Default is 443",
      },
      {
        name: "relay-host",
        alias: "H",
        type: String,
        description: "Host of relay server",
      },
      {
        name: "port",
        alias: "p",
        type: String,
        description: "Local port.",
        optional: false,
      },
      {
        name: "https",
        alias: "H",
        type: Boolean,
        description: "Connect https instead of http.",
        optional: true,
      },
      {
        name: "host",
        alias: "h",
        type: String,
        description: "Host of local server. Default is localhost",
      },
      { name: "password", type: String, description: "Rlay password" },
      { name: "tcp", alias: "t", type: Boolean, description: "Use TCP instead of HTTP" },
      { name: "help", type: Boolean, description: "Display command-line help" },
    ];

    function displayHelp() {
      const structure = [
        {
          header: "rlay - Relay http request to local machine from a server",
        },
        {
          header: "Commands",
          optionList: options,
        },
      ];
      const message = usage(structure);
      console.log(message);
    }

    let commands: ParsingResult;

    try {
      commands = parseCommandLine(options, { dashesAreOptional: true });
    } catch (error: any) {
      console.error(error.message);
      displayHelp();
      process.exit(1);
    }

    if (commands["help"]) {
      displayHelp();
      process.exit(0);
    }

    function getCommandValue(commandName: string): string | null {
      return commands[commandName]
        ? (commands[commandName] as any).value
        : null;
    }

    const localPort = Number.parseInt(getCommandValue("port") || "0");
    const tcp = getCommandValue("tcp") || false
    const relayPort = getCommandValue("relay-port") || (tcp ? 444 : 443);
    const localHost = getCommandValue("host") || "localhost";
    const relayHost = getCommandValue("relay-host") || process.env.RLAY_HOST;
    const password = getCommandValue("password") || process.env.RLAY_PASSWORD;
    const https = !!commands["https"]

    const checkVariable = (variable: any, message: string) => {
      if (!variable) {
        console.error(message);
        displayHelp();
        process.exit(1);
      }
    };

    checkVariable(localPort, "Local port not specified. Use --port or -p");
    checkVariable(
      relayHost,
      "Relay host not specified. Set --relay-host or RLAY_HOST environment variable"
    );
    checkVariable(
      password,
      "Password not specified. Set --password or RLAY_PASSWORD environment variable"
    );

    return {
      localHost,
      localPort,
      relayHost: relayHost as string,
      relayPort:
        typeof relayPort === "number" ? relayPort : Number.parseInt(relayPort),
      password: password as string,
      type: tcp ? "tcp" : "http",
      https
    };
  }
}
