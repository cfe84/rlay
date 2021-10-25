export enum TcpCommand {
  Configure = "CONFIGURE",
  Connect = "RLAY.CONNECT",
  ConnectCommand = "RLAY.CONNECT.COMMAND",
  ConnectData = "RLAY.CONNECT.DATA",
  ConfirmDataSocket = "CONFIRM-DATA-SOCKET",
  OpenSocket = "OPEN",
  CloseSocket = "CLOSE",
  Error = "ERROR",
  Hello = "HELLO"
}