import { MAX_WORKSPACE_BYTES, parseWorkspaceValue, workspaceEnvelope } from '../domain/workspaceFiles';
import type { Workspace } from '../domain/types';

/**
 * Share links carry the whole workspace in the URL hash (never sent to a server).
 * `z` prefix: deflate-compressed JSON; `j` prefix: plain JSON (browsers without CompressionStream).
 */

export const MAX_SHARE_CHARACTERS = 1_500_000;
const toBase64Url = (bytes: Uint8Array) => {
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromBase64Url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const reader = new Blob([bytes as BlobPart]).stream().pipeThrough(stream).getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_WORKSPACE_BYTES) {
        await reader.cancel();
        throw new Error('Workspace exceeds the 1 MB limit.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const output = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
}

export async function encodeWorkspace(ws: Workspace): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(workspaceEnvelope(ws)));
  if (json.length > MAX_WORKSPACE_BYTES) throw new Error('Workspace exceeds the 1 MB limit. Combine same-sign sources or export fewer setups.');
  if (typeof CompressionStream !== 'undefined') {
    try {
      return 'z' + toBase64Url(await pipe(json, new CompressionStream('deflate-raw')));
    } catch {
      /* fall through */
    }
  }
  return 'j' + toBase64Url(json);
}

export async function decodeWorkspace(code: string): Promise<Workspace | undefined> {
  try {
    if (code.length > MAX_SHARE_CHARACTERS || !/^[jz][A-Za-z0-9_-]+$/.test(code)) return undefined;
    const bytes = fromBase64Url(code.slice(1));
    if (bytes.length > MAX_WORKSPACE_BYTES) return undefined;
    const json = code[0] === 'z' ? await pipe(bytes, new DecompressionStream('deflate-raw')) : bytes;
    return parseWorkspaceValue(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(json)), true);
  } catch {
    return undefined;
  }
}
