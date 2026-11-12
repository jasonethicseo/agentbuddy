// Relay end to end: the built dist/relay.js with a temp HOME
// (Requirements 15.1–15.8, 16.1–16.5, 18.1–18.5).
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { networkInterfaces, tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { logFileName } from '../../src/relay/home';
import { createRelayServer } from '../../src/relay/server';
import { freePort, http, listen, openStream, startRelay } from './relay-helpers';
import type { RelayProcess } from './relay-helpers';

const mode = (file: string) => statSync(file).mode & 0o777;

const event = {
  v: 1,
  agent: 'kiro',
  session: 'sess_ce19…',
  kind: 'prompt',
  at: new Date().toISOString(),
  cwd: '/Users/dev/demo',
  text: 'hello',
};

let home: string;
let relay: RelayProcess;
let token: string;

beforeAll(async () => {
  home = mkdtempSync(join(tmpdir(), 'agentbuddy-relay-'));
  relay = await startRelay(home, await freePort());
  token = readFileSync(join(home, '.agentbuddy/token'), 'utf8').trim();
});

afterAll(async () => {
  await relay?.stop();
  rmSync(home, { recursive: true, force: true });
});

const post = (body: string, headers: Record<string, string> = {}) =>
  http({ port: relay.port, method: 'POST', path: '/events', body, headers: { 'x-agentbuddy-token': token, 'content-type': 'application/json', ...headers } });

describe('relay start-up', () => {
  it('creates ~/.agentbuddy (700) and a 64-hex token (600)', () => {
    expect(mode(join(home, '.agentbuddy'))).toBe(0o700);
    expect(mode(join(home, '.agentbuddy/token'))).toBe(0o600);
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it('keeps an existing token across restarts', async () => {
    const otherHome = mkdtempSync(join(tmpdir(), 'agentbuddy-relay-'));
    mkdirSync(join(otherHome, '.agentbuddy'));
    writeFileSync(join(otherHome, '.agentbuddy/token'), 'kept-token\n', { mode: 0o644 });
    const r = await startRelay(otherHome, await freePort());
    await r.stop();
    expect(readFileSync(join(otherHome, '.agentbuddy/token'), 'utf8')).toBe('kept-token\n');
    expect(mode(join(otherHome, '.agentbuddy/token'))).toBe(0o600);
    rmSync(otherHome, { recursive: true, force: true });
  });

  it('exits 1 with a message when the port is in use', async () => {
    const blocker = createServer();
    const port = await listen(blocker);
    await expect(startRelay(home, port)).rejects.toThrow(/port \d+ is in use \(set AGENTBUDDY_PORT\)/);
    await new Promise((r) => blocker.close(r));
  });

  it('listens on 127.0.0.1 only', async () => {
    const external = Object.values(networkInterfaces())
      .flat()
      .find((i) => i && i.family === 'IPv4' && !i.internal);
    if (!external) return; // no non-loopback interface on this machine
    await expect(http({ port: relay.port, host: external.address })).rejects.toThrow(/ECONNREFUSED/);
  });
});

describe('POST /events checks', () => {
  it('403 for a foreign Host header, on every route', async () => {
    for (const path of ['/events', '/stream', '/']) {
      const r = await http({ port: relay.port, path, method: path === '/events' ? 'POST' : 'GET', headers: { host: 'evil.example:4343' } });
      expect(r.status).toBe(403);
    }
    expect((await post(JSON.stringify(event), { host: 'localhost:1' })).status).toBe(403);
  });

  it('accepts localhost:<port> as Host', async () => {
    expect((await post(JSON.stringify(event), { host: `localhost:${relay.port}` })).status).toBe(204);
  });

  it('403 for any Origin header, even with the right token', async () => {
    expect((await post(JSON.stringify(event), { origin: `http://127.0.0.1:${relay.port}` })).status).toBe(403);
    expect((await post(JSON.stringify(event), { origin: 'null' })).status).toBe(403);
  });

  it('401 for a missing or wrong token', async () => {
    const r = await http({ port: relay.port, method: 'POST', path: '/events', body: JSON.stringify(event) });
    expect(r.status).toBe(401);
    expect((await post(JSON.stringify(event), { 'x-agentbuddy-token': 'x'.repeat(64) })).status).toBe(401);
    expect((await post(JSON.stringify(event), { 'x-agentbuddy-token': 'short' })).status).toBe(401);
    // (A leading space is not "near": HTTP strips it, so the relay sees the exact token.)
    for (const near of [token.slice(0, 10), token.slice(0, -1), `${token}0`, '']) {
      expect((await post(JSON.stringify(event), { 'x-agentbuddy-token': near })).status).toBe(401);
    }
  });

  it('413 for a body over 16 KB, declared or streamed', async () => {
    const big = JSON.stringify({ ...event, pad: 'x'.repeat(17_000) });
    expect((await post(big)).status).toBe(413);
    const chunked = await http({
      port: relay.port, method: 'POST', path: '/events', body: big, chunked: true,
      headers: { 'x-agentbuddy-token': token },
    });
    expect(chunked.status).toBe(413);
  });

  it('400 for bad JSON or an invalid event', async () => {
    expect((await post('{not json')).status).toBe(400);
    expect((await post(JSON.stringify({ ...event, kind: 'nope' }))).status).toBe(400);
    expect((await post(JSON.stringify({ ...event, text: 'a'.repeat(121) }))).status).toBe(400);
  });

  it('405 for wrong methods, 404 for unknown paths, no CORS headers', async () => {
    const replies = [
      await http({ port: relay.port, path: '/events' }),
      await http({ port: relay.port, path: '/stream', method: 'POST' }),
      await http({ port: relay.port, path: '/nope' }),
      await post(JSON.stringify(event)),
    ];
    expect(replies.map((r) => r.status)).toEqual([405, 405, 404, 204]);
    for (const r of replies) expect(Object.keys(r.headers).filter((h) => h.startsWith('access-control'))).toEqual([]);
  });
});

describe('intake, log and stream', () => {
  it('logs accepted events to today\'s file (600) and streams the list', async () => {
    const stream = openStream(relay.port);
    const headers = await stream.ready;
    expect(headers['content-type']).toMatch(/^text\/event-stream/);
    await stream.next(1); // current list on connect

    const claude = { ...event, agent: 'claude', session: 'e697…', kind: 'permission', text: undefined };
    expect((await post(JSON.stringify(claude))).status).toBe(204);
    const list = (await stream.next(2)) as Array<{ name: string; state: string; sessions: Array<{ key: string; state: string }> }>;
    const buddy = list.find((b) => b.name === 'Claude Code @ demo');
    expect(buddy?.state).toBe('WAITING_APPROVAL');
    expect(buddy?.sessions).toEqual([
      expect.objectContaining({ key: JSON.stringify(['claude', 'e697…']), state: 'WAITING_APPROVAL' }),
    ]);

    // A second session in the same folder shows up as its own session; the buddy stays WAITING_APPROVAL.
    const other = { ...event, agent: 'claude', session: 'e9a4…', kind: 'prompt', text: 'run ls', at: new Date().toISOString() };
    expect((await post(JSON.stringify(other))).status).toBe(204);
    const list2 = (await stream.next(3)) as typeof list;
    const buddy2 = list2.find((b) => b.name === 'Claude Code @ demo');
    expect(buddy2?.state).toBe('WAITING_APPROVAL');
    expect(buddy2?.sessions.map((s) => s.state)).toEqual(['WAITING_APPROVAL', 'WORKING']);
    stream.close();

    await new Promise((r) => setTimeout(r, 100));
    const file = join(home, '.agentbuddy', logFileName(new Date()));
    expect(mode(file)).toBe(0o600);
    const lines = readFileSync(file, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
    expect(lines.at(-2)).toEqual({ v: 1, agent: 'claude', session: 'e697…', kind: 'permission', at: event.at, cwd: '/Users/dev/demo' });
    expect(lines.at(-1)).toMatchObject({ agent: 'claude', session: 'e9a4…', kind: 'prompt', text: 'run ls' });
    // Rejected requests never reach the log.
    expect(lines.every((l) => l.kind !== 'nope' && !('pad' in l))).toBe(true);
    expect(readdirSync(join(home, '.agentbuddy')).filter((f) => f.startsWith('events-'))).toHaveLength(1);
  });
});

describe('Kiro progress from tasks.md', () => {
  // A temp project with a real spec, a spec symlinked to a file outside the project, and a too-large file.
  let work: string;
  let proj: string;
  const kiro = (kind: string, spec: string, at = new Date().toISOString()) => ({
    v: 1, agent: 'kiro', session: `sess_${spec}…`, kind, at, cwd: proj,
    task: { name: '1. A', specPath: `${proj}/.kiro/specs/${spec}/tasks.md` },
  });
  async function current() {
    const s = openStream(relay.port);
    const list = (await s.next(1)) as Array<{ cwd: string; progress?: unknown }>;
    s.close();
    return list.find((b) => b.cwd === proj)?.progress;
  }
  async function eventually(expected: unknown) {
    for (let i = 0; i < 40; i++) {
      if (JSON.stringify(await current()) === JSON.stringify(expected)) return;
      await new Promise((r) => setTimeout(r, 50));
    }
    expect(await current()).toEqual(expected);
  }

  beforeAll(() => {
    work = mkdtempSync(join(tmpdir(), 'agentbuddy-spec-'));
    proj = join(work, 'proj');
    mkdirSync(join(proj, '.kiro/specs/good'), { recursive: true });
    mkdirSync(join(proj, '.kiro/specs/evil'), { recursive: true });
    mkdirSync(join(proj, '.kiro/specs/big'), { recursive: true });
    mkdirSync(join(work, 'outside'));
    writeFileSync(join(proj, '.kiro/specs/good/tasks.md'), '- [x] 1. A\n  - [x] 1.1 a\n- [-] 2. B\n- [ ] 3. C\n');
    writeFileSync(join(work, 'outside/tasks.md'), '- [x] 1. secret\n');
    symlinkSync(join(work, 'outside/tasks.md'), join(proj, '.kiro/specs/evil/tasks.md'));
    writeFileSync(join(proj, '.kiro/specs/big/tasks.md'), '- [x] 1. A\n'.repeat(120_000));
  });
  afterAll(() => rmSync(work, { recursive: true, force: true }));

  it('shows task n/m from a valid tasks.md, and updates on stop after the file changes', async () => {
    expect((await post(JSON.stringify(kiro('task_start', 'good')))).status).toBe(204);
    await eventually({ done: 1, total: 3 });
    writeFileSync(join(proj, '.kiro/specs/good/tasks.md'), '- [x] 1. A\n- [x] 2. B\n- [ ] 3. C\n');
    const stop = { v: 1, agent: 'kiro', session: 'sess_chat…', kind: 'stop', at: new Date().toISOString(), cwd: proj };
    expect((await post(JSON.stringify(stop)))).toMatchObject({ status: 204 });
    await eventually({ done: 2, total: 3 });
  });

  it('gives progress unknown for a tasks.md symlinked outside cwd, or larger than 1 MB', async () => {
    expect((await post(JSON.stringify(kiro('task_start', 'evil')))).status).toBe(204);
    await eventually(null);
    expect((await post(JSON.stringify(kiro('task_start', 'good')))).status).toBe(204);
    await eventually({ done: 2, total: 3 });
    expect((await post(JSON.stringify(kiro('task_done', 'big')))).status).toBe(204);
    await eventually(null);
  });
});

describe('restore on start', () => {
  it('comes back with sessions, state and Kiro progress from the daily log', async () => {
    const home2 = mkdtempSync(join(tmpdir(), 'agentbuddy-restore-'));
    const proj = join(home2, 'proj');
    mkdirSync(join(proj, '.kiro/specs/s'), { recursive: true });
    writeFileSync(join(proj, '.kiro/specs/s/tasks.md'), '- [x] 1. A\n- [x] 2. B\n- [ ] 3. C\n');
    mkdirSync(join(home2, '.agentbuddy'));
    const t = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
    const log = [
      { v: 1, agent: 'kiro', session: 'sess_0bcd…', kind: 'task_start', at: t(6), cwd: proj, task: { name: '3. C', specPath: join(proj, '.kiro/specs/s/tasks.md') } },
      { v: 1, agent: 'kiro', session: 'sess_ce19…', kind: 'prompt', at: t(5), cwd: proj, text: 'hello' },
      { v: 1, agent: 'claude', session: 'e697…', kind: 'permission', at: t(1), cwd: '/Users/dev/demo' },
    ];
    writeFileSync(join(home2, '.agentbuddy', logFileName(new Date())), log.map((e) => JSON.stringify(e)).join('\n') + '\n');

    const r = await startRelay(home2, await freePort());
    expect(r.stdout()).toMatch(/restored 3 events from the last 24 hours/);
    let kiro: { state: string; sessions: unknown[]; progress?: unknown } | undefined;
    for (let i = 0; i < 40 && JSON.stringify(kiro?.progress) !== '{"done":2,"total":3}'; i++) {
      const s = openStream(r.port);
      const list = (await s.next(1)) as Array<{ name: string; state: string; sessions: unknown[]; progress?: unknown }>;
      s.close();
      kiro = list.find((b) => b.name === 'Kiro @ proj');
      expect(list.find((b) => b.name === 'Claude Code @ demo')?.state).toBe('WAITING_APPROVAL');
      await new Promise((res) => setTimeout(res, 50));
    }
    expect(kiro).toMatchObject({ state: 'WORKING', progress: { done: 2, total: 3 } });
    expect(kiro!.sessions).toHaveLength(2);
    await r.stop();
    rmSync(home2, { recursive: true, force: true });
  });
});

describe('static UI files', () => {
  it('serves files inside uiDir only, with CSP', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'agentbuddy-ui-'));
    mkdirSync(join(dir, 'ui'));
    writeFileSync(join(dir, 'ui/index.html'), '<p>ok</p>');
    writeFileSync(join(dir, 'secret.txt'), 'secret');
    const port = await freePort();
    const server = createRelayServer({ port, token: 't', uiDir: join(dir, 'ui'), onEvent() {}, onStream() {} });
    await new Promise<void>((r) => server.listen(port, '127.0.0.1', r));

    const index = await http({ port, path: '/' });
    expect(index.status).toBe(200);
    expect(index.body).toBe('<p>ok</p>');
    expect(index.headers['content-security-policy']).toBe("default-src 'self'");
    expect(index.headers['content-type']).toMatch(/^text\/html/);
    for (const path of ['/../secret.txt', '/%2e%2e/secret.txt', '/..%2fsecret.txt', '/%00', '/%zz']) {
      const r = await http({ port, path });
      expect(r.body).not.toContain('secret');
      expect([400, 404]).toContain(r.status);
    }

    await new Promise((r) => server.close(r));
    rmSync(dir, { recursive: true, force: true });
  });
});
