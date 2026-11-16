// The demo's frame pages keep the app's own markup, and the demo page follows the skin rules
// (submission design "Files"; design.md: colors only from tokens, no blurred shadows).
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = new URL('../../', import.meta.url).pathname;
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');
/** Everything inside <body> except the script line. */
const body = (html: string) => html.slice(html.indexOf('<body>'), html.indexOf('</body>')).replace(/\s*<script[^>]*><\/script>/, '');

describe('demo pages', () => {
  it('window.html has the main window markup of index.html', () => {
    expect(body(read('demo/window.html'))).toBe(body(read('index.html')));
    expect(read('demo/window.html')).toContain('src="../src/demo/window-entry.ts"');
  });

  it('popup.html has the card markup of the app pop-up', () => {
    expect(body(read('demo/popup.html'))).toBe(body(read('popup.html')));
    expect(read('demo/popup.html')).toContain('src="../src/demo/popup-entry.ts"');
  });

  it('the demo page has a Start demo button that says sound will play, and links the repository', () => {
    const page = read('demo/index.html');
    expect(page).toContain('Start demo');
    expect(page).toMatch(/Sound will play/);
    expect(page).toContain('https://github.com/jasonethicseo/agentbuddy');
  });

  it('demo scripts and styles hold no color value and no blurred shadow', () => {
    const files = [
      ...readdirSync(join(ROOT, 'src/demo')).filter((n) => n.endsWith('.ts')).map((n) => `src/demo/${n}`),
      'src/demo/styles/demo.css',
      'demo/index.html',
    ];
    for (const f of files) {
      const text = read(f);
      expect(text, f).not.toMatch(/#[0-9a-fA-F]{3,8}\b(?![^<]*>)|\brgba?\(|\bhsla?\(/);
      for (const m of text.matchAll(/(?:box|text)-shadow:\s*([^;]+);/g)) {
        const lengths = m[1]!.split(/\s+/).filter((x) => /^-?\d/.test(x));
        expect(lengths[2] ?? '0', `${f}: ${m[0]}`).toMatch(/^0(px)?$/);
      }
    }
  });
});
