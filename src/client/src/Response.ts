export interface Response {
  headers: { [key: string]: string };
  body: string;
  statusCode: number;
}
