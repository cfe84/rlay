export class Base64 {
  static encode(something: any): string {
    const buffer = Buffer.from(something)
    return buffer.toString("base64")
  }

  static decode(encodedBody: string): Buffer {
    const buffer = Buffer.from(encodedBody, "base64")
    return buffer
  }
}