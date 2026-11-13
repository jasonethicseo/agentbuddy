// resolveUiFile: the path rules shared by the relay and the app protocol (messenger-app design, `static.ts`).
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveUiFile } from '../../src/relay/static';

const ROOT = '/Users/dev/agentbuddy/dist/ui';

describe('resolveUiFile', () => {
  it('maps / to index.html and gives content types, including fonts and license texts', () => {
    expect(resolveUiFile(ROOT, '/')).toEqual({ file: join(ROOT, 'index.html'), type: 'text/html; charset=utf-8' });
    expect(resolveUiFile(ROOT, '/assets/main.js')?.type).toBe('text/javascript; charset=utf-8');
    expect(resolveUiFile(ROOT, '/fonts/NanumGothic-Regular.ttf')?.type).toBe('font/ttf');
    expect(resolveUiFile(ROOT, '/fonts/Galmuri11.woff2')?.type).toBe('font/woff2');
    expect(resolveUiFile(ROOT, '/fonts/OFL-Galmuri.txt')?.type).toBe('text/plain; charset=utf-8');
    expect(resolveUiFile(ROOT, '/popup.html')?.file).toBe(join(ROOT, 'popup.html'));
    expect(resolveUiFile(ROOT, '/blob.bin')?.type).toBe('application/octet-stream');
  });

  it('decodes percent escapes inside the root', () => {
    expect(resolveUiFile(ROOT, '/fonts/My%20Font.ttf')?.file).toBe(join(ROOT, 'fonts/My Font.ttf'));
  });

  it.each(['/../secret.txt', '/%2e%2e/secret.txt', '/..%2fsecret.txt', '/%00', '/a%00b.html', '/%zz', '/..', '/./../ui2/x.html'])(
    'rejects %s',
    (path) => {
      expect(resolveUiFile(ROOT, path)).toBeNull();
    },
  );

  it('rejects a sibling folder that shares the prefix', () => {
    expect(resolve(ROOT, '../ui2/x.html').startsWith(ROOT)).toBe(true); // why the trailing separator matters
    expect(resolveUiFile(ROOT, '/../ui2/x.html')).toBeNull();
  });
});
