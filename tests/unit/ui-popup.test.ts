// The themed pop-up keeps the messenger-app behavior: ×, Later and Go there on both kinds, the same click
// handling, and gets its theme (themes Requirements 2.5, 7.4, 7.5, 11.1; decision D4).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(import.meta.dirname, '../..');
const html = readFileSync(join(ROOT, 'popup.html'), 'utf8');
const code = readFileSync(join(ROOT, 'src/ui/screens/popup.ts'), 'utf8');

describe('popup.html', () => {
  it('has a heading for the title, × named Close and mark as read, Later and Go there with its theme mark', () => {
    expect(html).toContain('<h1 class="card-head"></h1>');
    expect(html).toContain('<button type="button" class="card-close" aria-label="Close and mark as read">×</button>');
    expect(html).toContain('<button type="button" class="card-later">Later</button>');
    expect(html).toContain('<button type="button" class="card-go">Go there<span class="go-mark" aria-hidden="true"></span></button>');
    expect(html).not.toMatch(/→|▶|♥/); // the mark comes from a token
  });
});

describe('screens/popup.ts', () => {
  it('titles the card 띠링! and names it Ding! for screen readers, without ♪ (Requirement 7.5)', () => {
    expect(code).toContain("WAITING_APPROVAL: { text: '띠링! ♪ needs your OK', label: 'Ding! needs your OK' }");
    expect(code).toContain("TURN_DONE: { text: '띠링! ♪ new message', label: 'Ding! new message' }");
    expect(code).toContain("head.setAttribute('aria-label', TITLES[c.state].label)");
  });

  it('shows the buttons on both ping kinds and hides them only for a notice (decision D4)', () => {
    expect(code.match(/\$\('\.card-actions'\)\.hidden = (true|false);/g)).toEqual(["$('.card-actions').hidden = true;", "$('.card-actions').hidden = false;"]);
    expect(code).not.toMatch(/c\.state === 'TURN_DONE'[^\n]*card-actions/);
  });

  it('keeps the click handling: × closes, Later only closes, anything else on a ping card goes there (MA 9.5)', () => {
    expect(code).toContain("if (target.closest('.card-close')) bridge.close();");
    expect(code).toContain("else if (target.closest('.card-later')) bridge.later();");
    expect(code).toContain("else if ($('.card').dataset['state'] !== 'notice') bridge.go();");
  });

  it('fills the card again in a new theme, keeping its last content (Requirement 2.5)', () => {
    expect(code).toMatch(/bridge\.onTheme\(\(t\) => \{\s*applyTheme\(t\);\s*if \(last !== null\) fill\(last\);/);
  });
});
describe('pop-up look (retro-skin Requirement 11)', () => {
  const css = readFileSync(join(ROOT, 'src/ui/styles/popup.css'), 'utf8');
  it('a gloss header by kind, a hard 2 px shadow, a 36 px sprite in a sunken frame, inside the 300 px window', () => {
    expect(css).toContain('background: linear-gradient(var(--head-1) 0%, var(--head-2) 48%, var(--head-3) 52%, var(--head-4) 100%);');
    expect(css).toContain('box-shadow: 2px 2px 0 var(--hard-shadow);');
    expect(css).toContain('width: calc(100% - 2px); margin-bottom: 2px;');
    expect(code).toContain('stateSprite(theme, c.agentId, c.state, 36)');
  });
  it('Later is raised and Go there is the primary gradient with ▶ from a token', () => {
    expect(css).toMatch(/\.card-later \{[^}]*linear-gradient\(var\(--bevel-from\), var\(--bevel-to\)\)/);
    expect(css).toMatch(/\.card-go \{[^}]*linear-gradient\(var\(--primary-from\), var\(--primary-to\)\)/);
    expect(css).toContain('.go-mark::before { content: " " var(--go-mark); }');
  });
});
