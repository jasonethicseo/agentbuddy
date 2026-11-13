// UI file lookup shared by the relay's static route and the app's `app://ui/` protocol,
// so both apply the same path rules. Computes paths only; callers check that the file exists.
import { extname, resolve, sep } from 'node:path';

const CONTENT_TYPES: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

export interface UiFile {
  file: string;
  type: string;
}

/**
 * The file under `root` for a URL path (`/` means `/index.html`), with its
 * content type. Null when the path does not decode, holds a NUL byte, or
 * resolves outside `root`.
 */
export function resolveUiFile(root: string, urlPath: string): UiFile | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(urlPath === '/' ? '/index.html' : urlPath);
  } catch {
    return null;
  }
  if (decoded.includes('\0')) return null;
  const base = resolve(root);
  const file = resolve(base, `.${decoded}`);
  if (!file.startsWith(base + sep)) return null;
  return { file, type: CONTENT_TYPES[extname(file)] ?? 'application/octet-stream' };
}
