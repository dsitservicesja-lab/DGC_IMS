import { customAlphabet } from "nanoid";

const alphaNum = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ0123456789", 8);

export function docNumber(prefix: string): string {
  const now = new Date();
  const year = now.getFullYear();
  return `${prefix}-${year}-${alphaNum()}`;
}
