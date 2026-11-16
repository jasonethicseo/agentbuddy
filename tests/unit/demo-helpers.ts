// Helpers for the demo tests: the scenario file, and a replay run on the real controller with fake ports,
// stepped like the host does (submission design "Replay", "Host").
import { readFileSync } from 'node:fs';
import type { BuddyView } from '../../src/core/buddies';
import type { PopupContent } from '../../src/core/snapshot';
import { createController } from '../../src/app/controller';
import type { Ports } from '../../src/app/controller';
import { parseSettings } from '../../src/app/settings-data';
import { parseScenario, stampEvents } from '../../src/demo/scenario';
import type { Scenario } from '../../src/demo/scenario';
import { createDriver } from '../../src/demo/replay';

export const START = Date.parse('2026-11-20T10:00:00.000Z');

export function rawScenario(): unknown {
  return JSON.parse(readFileSync(new URL('../../demo/events.json', import.meta.url), 'utf8'));
}

export function scenario(): Scenario {
  const parsed = parseScenario(rawScenario());
  if (!parsed.ok) throw new Error(parsed.errors.join('; '));
  return parsed.scenario;
}

export interface Ping {
  ms: number;
  session: string | null;
  state: string;
}

/** Run the scenario: baseline at START, then one step at each time in `stepsMs` (after START, increasing). */
export function runDemo(stepsMs: readonly number[]) {
  let now = START;
  const pings: Ping[] = [];
  const dings: number[] = [];
  const lists: Array<{ ms: number; views: BuddyView[] }> = [];
  const noop = () => {};
  const ports: Ports = {
    now: () => now,
    dayKey: (ms) => new Date(ms).toISOString().slice(0, 10),
    formatTime: (ms, s) => new Date(ms).toISOString().slice(11, s ? 19 : 16),
    appendInbox: noop,
    saveSettings: noop,
    pushState: noop,
    setCount: noop,
    ding: () => void dings.push(now - START),
    showPopup: (session: string | null, c: PopupContent) => void pings.push({ ms: now - START, session, state: c.kind === 'ping' ? c.state : 'notice' }),
    closePopups: noop,
    notify: noop,
    jump: noop,
    notice: noop,
    applyAlwaysOnTop: noop,
    applyTheme: noop,
    windowAction: noop,
  };
  const controller = createController({ settings: parseSettings({ alwaysOnTop: false }), records: [], port: 0 }, ports);
  controller.onLink('demo', 'ok');
  const driver = createDriver(stampEvents(scenario(), START), START);
  const baseline = driver.start();
  controller.onList(baseline, true);
  lists.push({ ms: 0, views: baseline });
  for (const ms of stepsMs) {
    now = START + ms;
    const views = driver.step(now);
    if (views === null) continue;
    controller.onList(views, false);
    lists.push({ ms, views });
  }
  return { pings, dings, lists };
}

/** Steps every `everyMs` up to `untilMs`. */
export function evenSteps(everyMs: number, untilMs: number): number[] {
  const out: number[] = [];
  for (let ms = everyMs; ms <= untilMs; ms += everyMs) out.push(ms);
  return out;
}
