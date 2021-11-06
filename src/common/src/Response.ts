export interface Response {
  headers: { [key: string]: string };
  body: string;
  bodySize: number;
  statusCode: number;
}
