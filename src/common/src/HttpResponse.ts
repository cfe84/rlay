export interface HttpResponse {
  headers: { [key: string]: string };
  body: string;
  bodySize: number;
  statusCode: number;
}
