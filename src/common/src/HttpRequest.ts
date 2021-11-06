export interface HttpRequest {
  path: string;
  method: string;
  headers: string[];
  body: string;
  bodySize: number;
  id: string;
}
