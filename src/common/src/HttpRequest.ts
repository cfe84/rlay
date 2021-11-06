export interface HttpRequest {
  path: string;
  query: string;
  method: string;
  headers: string[];
  body: string;
  bodySize: number;
  id: string;
}
