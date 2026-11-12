// agentbuddy-hook end to end: spawns the built dist/hook.js with a temp HOME
// (Requirements 12.1–12.6, 13.1–13.7, 14.1–14.3; messenger-app Requirement 1.1, 1.2).
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TOKEN, errorLog, expectQuietExit, fakeRelay, fixture, freePort, homeDir, run, useTempHome } from './hook-helpers';

useTempHome();

describe('agentbuddy-hook', () => {
  it('POSTs the normalized event with the token, and logs nothing on success', async () => {
    const relay = await fakeRelay(true);
    const r = await run(['kiro'], { stdin: fixture('kiro-user-prompt-submit'), port: relay.port });
    await relay.close();
    expectQuietExit(r);
    expect(relay.received).toHaveLength(1);
    const { headers, body } = relay.received[0]!;
    expect(headers['x-agentbuddy-token']).toBe(TOKEN);
    expect(headers['content-type']).toBe('application/json');
    expect(headers['origin']).toBeUndefined();
    const event = JSON.parse(body);
    expect(event).toMatchObject({ v: 1, agent: 'kiro', kind: 'prompt', session: 'sess_ce19…', text: 'hello' });
    expect(Date.parse(event.at)).toBeGreaterThan(Date.now() - 5000);
    expect(errorLog()).toEqual([]);
  });

  it('passes CLAUDE_PROJECT_DIR on as projectDir', async () => {
    const relay = await fakeRelay(true);
    const r = await run(['claude'], { stdin: fixture('claude-stop'), port: relay.port, env: { CLAUDE_PROJECT_DIR: '/Users/dev/demo' } });
    await relay.close();
    expectQuietExit(r);
    expect(JSON.parse(relay.received[0]!.body)).toMatchObject({ agent: 'claude', kind: 'stop', projectDir: '/Users/dev/demo' });
  });

  it('passes __CFBundleIdentifier and TERM_PROGRAM on as bundleId and termProgram, for every agent', async () => {
    const relay = await fakeRelay(true);
    const env = { __CFBundleIdentifier: 'com.microsoft.VSCode', TERM_PROGRAM: 'vscode' };
    const runs = [
      await run(['kiro'], { stdin: fixture('kiro-stop'), port: relay.port, env }),
      await run(['claude'], { stdin: fixture('claude-stop'), port: relay.port, env }),
      await run(['codex', fixture('codex-turn-complete')], { port: relay.port, env }),
    ];
    await relay.close();
    for (const r of runs) expectQuietExit(r);
    expect(relay.received.map((x) => JSON.parse(x.body))).toEqual([
      expect.objectContaining({ agent: 'kiro', bundleId: 'com.microsoft.VSCode', termProgram: 'vscode' }),
      expect.objectContaining({ agent: 'claude', bundleId: 'com.microsoft.VSCode', termProgram: 'vscode' }),
      expect.objectContaining({ agent: 'codex', bundleId: 'com.microsoft.VSCode', termProgram: 'vscode' }),
    ]);
    expect(errorLog()).toEqual([]);
  });

  it('sends the event without malformed launcher values, and logs nothing', async () => {
    const relay = await fakeRelay(true);
    const env = { __CFBundleIdentifier: 'com.x; rm -rf ~', TERM_PROGRAM: 'vs code' };
    const r = await run(['kiro'], { stdin: fixture('kiro-stop'), port: relay.port, env });
    await relay.close();
    expectQuietExit(r);
    const event = JSON.parse(relay.received[0]!.body);
    expect(event).toMatchObject({ agent: 'kiro', kind: 'stop' });
    expect(event).not.toHaveProperty('bundleId');
    expect(event).not.toHaveProperty('termProgram');
    expect(errorLog()).toEqual([]);
  });

  it('reads the Codex payload from the last argv item without waiting for stdin', async () => {
    const relay = await fakeRelay(true);
    const r = await run(['codex', fixture('codex-turn-complete')], { keepStdinOpen: true, port: relay.port });
    await relay.close();
    expectQuietExit(r, 450); // well under the 500 ms stdin wait
    expect(JSON.parse(relay.received[0]!.body)).toMatchObject({ agent: 'codex', kind: 'stop', text: 'Created hello.txt.' });
  });

  it('sends nothing and logs nothing for a dropped payload', async () => {
    const relay = await fakeRelay(true);
    const r = await run(['codex', fixture('codex-title-turn')], { port: relay.port });
    await relay.close();
    expectQuietExit(r);
    expect(relay.received).toHaveLength(0);
    expect(errorLog()).toEqual([]);
  });

  it('exits 0 quickly when the relay is down', async () => {
    const r = await run(['claude'], { stdin: fixture('claude-stop'), port: await freePort() });
    expectQuietExit(r);
    expect(errorLog()).toEqual([expect.stringMatching(/ claude post_ECONNREFUSED$/)]);
  });

  it('aborts the POST after 300 ms when the relay never answers', async () => {
    const relay = await fakeRelay(false);
    const r = await run(['kiro'], { stdin: fixture('kiro-stop'), port: relay.port });
    await relay.close();
    expectQuietExit(r);
    expect(r.ms).toBeGreaterThan(300);
    expect(errorLog()).toEqual([expect.stringMatching(/ kiro post_timeout$/)]);
  });

  it('stops waiting for stdin after 500 ms and uses what arrived', async () => {
    const relay = await fakeRelay(true);
    const r = await run(['claude'], { stdin: fixture('claude-user-prompt-submit'), keepStdinOpen: true, port: relay.port });
    await relay.close();
    expectQuietExit(r);
    expect(r.ms).toBeGreaterThan(500);
    expect(relay.received).toHaveLength(1);
  });

  it('stays under 1 second with stdin held open and a relay that never answers', async () => {
    const relay = await fakeRelay(false);
    const r = await run(['kiro'], { stdin: fixture('kiro-stop'), keepStdinOpen: true, port: relay.port });
    await relay.close();
    expectQuietExit(r);
  });

  it('logs a non-2xx reply', async () => {
    const relay = await fakeRelay(401);
    const r = await run(['kiro'], { stdin: fixture('kiro-stop'), port: relay.port });
    await relay.close();
    expectQuietExit(r);
    expect(errorLog()).toEqual([expect.stringMatching(/ kiro http_401$/)]);
  });

  it('logs a missing token, an unknown agent, a missing Codex payload and oversized stdin', async () => {
    const port = await freePort();
    rmSync(join(homeDir(), '.agentbuddy/token'));
    expectQuietExit(await run(['kiro'], { stdin: fixture('kiro-stop'), port }));
    expectQuietExit(await run(['cursor'], { stdin: '{}', port }));
    expectQuietExit(await run([], { port }));
    expectQuietExit(await run(['codex'], { port }));
    expectQuietExit(await run(['claude'], { stdin: 'x'.repeat(1_100_000), port }));
    expect(errorLog().map((l) => l.split(' ').slice(1).join(' '))).toEqual([
      'kiro no_token',
      '- bad_agent',
      '- bad_agent',
      'codex no_payload',
      'claude too_large',
    ]);
  });

  it('writes only fixed codes to the error log, never payload text or the token', async () => {
    const port = await freePort();
    await run(['claude'], { stdin: fixture('claude-stop'), port });
    await run(['kiro'], { stdin: fixture('kiro-pre-task-exec'), port });
    const log = readFileSync(join(homeDir(), '.agentbuddy/hook-errors.log'), 'utf8');
    for (const line of log.trim().split('\n')) {
      expect(line).toMatch(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z (kiro|claude|codex|-) [a-z]+(_[A-Za-z0-9]+)*$/);
    }
    for (const secret of [TOKEN, 'hello.txt', '/Users/dev', 'sess_']) expect(log).not.toContain(secret);
  });

  it('creates the home folder for the log when it does not exist', async () => {
    rmSync(join(homeDir(), '.agentbuddy'), { recursive: true });
    expectQuietExit(await run(['kiro'], { stdin: fixture('kiro-stop'), port: await freePort() }));
    expect(errorLog()).toEqual([expect.stringMatching(/ kiro no_token$/)]);
  });
});
