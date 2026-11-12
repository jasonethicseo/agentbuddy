// The `app://ui/…` scheme: the app's windows load the built UI from dist/ui through it,
// with the same path rules as the relay (messenger-app Requirements 15.4, 15.5).
import { readFile, stat } from 'node:fs/promises';
import { protocol } from 'electron';
import { resolveUiFile } from '../relay/static';

/** Must run before the app is ready. */
export function registerAppScheme(): void {
  protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true } }]);
}

const HEADERS = {
  'Content-Security-Policy': "default-src 'self'",
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
};

const notFound = () => new Response('not found', { status: 404, headers: HEADERS });

export function serveAppScheme(uiDir: string): void {
  protocol.handle('app', async (request) => {
    let url: URL;
    try {
      url = new URL(request.url);
    } catch {
      return notFound();
    }
    if (url.host !== 'ui') return notFound();
    const ui = resolveUiFile(uiDir, url.pathname);
    if (ui === null) return notFound();
    try {
      if (!(await stat(ui.file)).isFile()) return notFound();
      return new Response(await readFile(ui.file), { headers: { ...HEADERS, 'Content-Type': ui.type } });
    } catch {
      return notFound();
    }
  });
}
