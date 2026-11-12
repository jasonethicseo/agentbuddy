// scripts/codex-notify.sh and scripts/probe.mjs with stub programs and a temp HOME.
import { spawn } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FIXTURES } from '../fixtures/payloads';

const ROOT = join(import.meta.dirname, '../..');
const WRAPPER = join(ROOT, 'scripts/codex-notify.sh');
const PROBE = join(ROOT, 'scripts/probe.mjs');
const PAYLOAD = FIXTURES.find((f) => f.id === 'codex-turn-complete')!.raw;

let dir: string;
let bin: string;

/** A stub program: records its arguments one per line, prints `out`, sleeps, exits with `code`. */
function stub(name: string, opts: { code?: number; out?: string; sleep?: number } = {}): string {
  const file = join(bin, name);
  const log = join(dir, `${name}.args`);
  writeFileSync(
    file,
    `#!/bin/sh\nfor a do printf '%s\\n' "$a"; done > '${log}'\n` +
      (opts.out ? `printf '%s\\n' '${opts.out}'\n` : '') +
      (opts.sleep ? `sleep ${opts.sleep}\n` : '') +
      `echo done >> '${log}.done'\nexit ${opts.code ?? 0}\n`,
  );
  chmodSync(file, 0o755);
  return file;
}
const argsOf = (name: string) => readFileSync(join(dir, `${name}.args`), 'utf8').trimEnd().split('\n');
const finished = (name: string) => existsSync(join(dir, `${name}.args.done`));

interface Result { code: number | null; ms: number; stdout: string; stderr: string }

function run(cmd: string, args: string[], opts: { withNode?: boolean; stdin?: string; keepStdinOpen?: boolean } = {}): Promise<Result> {
  return new Promise((resolve) => {
    const started = performance.now();
    const path = [bin, opts.withNode ? dirname(process.execPath) : '', '/usr/bin', '/bin'].filter(Boolean).join(':');
    const child = spawn(cmd, args, { env: { PATH: path, HOME: dir }, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.stdin.on('error', () => {});
    if (opts.stdin !== undefined) child.stdin.write(opts.stdin);
    if (!opts.keepStdinOpen) child.stdin.end();
    child.on('exit', (code) => {
      child.stdin.destroy();
      resolve({ code, ms: performance.now() - started, stdout, stderr });
    });
  });
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'agentbuddy-notify-'));
  bin = join(dir, 'bin');
  mkdirSync(bin);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe('codex-notify.sh', () => {
  it('runs the original program first with exactly its arguments, then agentbuddy-hook codex <payload>', async () => {
    const original = stub('original', { out: 'original says hi' });
    stub('agentbuddy-hook', { out: 'ours must not show' });
    const r = await run(WRAPPER, [original, 'turn-ended', PAYLOAD]);
    expect(r.code).toBe(0);
    expect(argsOf('original')).toEqual(['turn-ended', PAYLOAD]);
    expect(argsOf('agentbuddy-hook')).toEqual(['codex', PAYLOAD]);
    expect(r.stdout).toBe('original says hi\n'); // only the original program's output
    expect(r.stderr).toBe('');
  });

  it.each([0, 1, 3, 127])('keeps the original exit status %i', async (code) => {
    const original = stub('original', { code });
    stub('agentbuddy-hook', { code: 9 });
    expect((await run(WRAPPER, [original, 'turn-ended', PAYLOAD])).code).toBe(code);
  });

  it('keeps the original status and output when agentbuddy-hook is missing', async () => {
    const original = stub('original', { code: 2, out: 'x' });
    const r = await run(WRAPPER, [original, 'turn-ended', PAYLOAD]);
    expect([r.code, r.stdout, r.stderr]).toEqual([2, 'x\n', '']);
  });

  it('stops a hanging agentbuddy-hook after 0.9 seconds', async () => {
    const original = stub('original');
    stub('agentbuddy-hook', { sleep: 10 });
    const r = await run(WRAPPER, [original, 'turn-ended', PAYLOAD]);
    expect(r.code).toBe(0);
    expect(r.ms).toBeGreaterThan(800);
    expect(r.ms).toBeLessThan(1500);
  });

  it('waits for a slow original program as before; our part adds at most about 1 second', async () => {
    const original = stub('original', { sleep: 1.5, code: 4 });
    stub('agentbuddy-hook', { sleep: 10 });
    const r = await run(WRAPPER, [original, 'turn-ended', PAYLOAD]);
    expect(r.code).toBe(4);
    expect(finished('original')).toBe(true);
    expect(r.ms).toBeGreaterThan(1400 + 800);
    // 1.5 s original + at most 1 s ours, plus first-run scanning of the new stub files by macOS.
    expect(r.ms).toBeLessThan(1500 + 1000 + 700);
  });

  it('with only the payload, runs no original program and exits 0', async () => {
    stub('agentbuddy-hook');
    const r = await run(WRAPPER, [PAYLOAD]);
    expect(r.code).toBe(0);
    expect(argsOf('agentbuddy-hook')).toEqual(['codex', PAYLOAD]);
  });

  it('with --probe, also records the raw payload; without it, records nothing', async () => {
    const original = stub('original');
    stub('agentbuddy-hook');
    await run(WRAPPER, [original, 'turn-ended', PAYLOAD], { withNode: true });
    expect(existsSync(join(dir, '.agentbuddy/probe'))).toBe(false);
    await run(WRAPPER, ['--probe', original, 'turn-ended', PAYLOAD], { withNode: true });
    expect(argsOf('original')).toEqual(['turn-ended', PAYLOAD]); // --probe is not passed on
    const line = JSON.parse(readFileSync(join(dir, '.agentbuddy/probe/codex.jsonl'), 'utf8'));
    expect(line).toMatchObject({ agent: 'codex', source: 'argv', raw: PAYLOAD });
  });
});

describe('probe.mjs', () => {
  it('records the stdin payload to a 600 file, writes nothing to stdout, exits 0', async () => {
    const raw = FIXTURES.find((f) => f.id === 'claude-stop')!.raw;
    const r = await run(process.execPath, [PROBE, 'claude'], { stdin: raw });
    expect([r.code, r.stdout, r.stderr]).toEqual([0, '', '']);
    const file = join(dir, '.agentbuddy/probe/claude.jsonl');
    expect(statSync(file).mode & 0o777).toBe(0o600);
    expect(statSync(dirname(file)).mode & 0o777).toBe(0o700);
    expect(JSON.parse(readFileSync(file, 'utf8'))).toMatchObject({ agent: 'claude', source: 'stdin', argc: 0, raw });
  });

  it('exits within 1 second when stdin stays open', async () => {
    const r = await run(process.execPath, [PROBE, 'kiro'], { stdin: '{"partial":', keepStdinOpen: true });
    expect(r.code).toBe(0);
    expect(r.ms).toBeLessThan(1000);
    expect(JSON.parse(readFileSync(join(dir, '.agentbuddy/probe/kiro.jsonl'), 'utf8')).raw).toBe('{"partial":');
  });
});
