import { normalizeWorkspace } from '../domain/normalize';
import type { Workspace } from '../domain/types';

/**
 * Share links carry the whole workspace in the URL hash (never sent to a server).
 * `z` prefix: deflate-compressed JSON; `j` prefix: plain JSON (browsers without CompressionStream).
 */

const toBase64Url = (bytes: Uint8Array) => {
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromBase64Url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

/** Drop ids so links stay short; they are regenerated on load. */
function compact(ws: Workspace) {
  return {
    highlightRequired: ws.highlightRequired ?? true,
    enemy: ws.enemy,
    hits: ws.hits.map(({ attacker, attack, effects, effectEntries, confirmed, observed }) => ({
      attacker,
      attack,
      observed,
      effects: Object.fromEntries(Object.entries(effects).filter(([, value]) => value)),
      effectEntries,
      confirmed,
    })),
  };
}

export async function encodeWorkspace(ws: Workspace): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(compact(ws)));
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
    const bytes = fromBase64Url(code.slice(1));
    const json = code[0] === 'z' ? await pipe(bytes, new DecompressionStream('deflate-raw')) : bytes;
    return normalizeWorkspace(JSON.parse(new TextDecoder().decode(json)));
  } catch {
    return undefined;
  }
}
