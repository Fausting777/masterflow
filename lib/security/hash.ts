import { createHash } from 'node:crypto';

export function sha256Hex(input: ArrayBuffer | Uint8Array): string {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  return createHash('sha256').update(bytes).digest('hex');
}
