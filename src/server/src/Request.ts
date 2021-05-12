export interface Request {
  path: string,
  method: string,
  headers: string[],
  body: string,
  id: string
}