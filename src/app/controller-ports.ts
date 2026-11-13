// What the controller needs from the outside world (messenger-app design, `controller.ts`).
// Types only; main.ts gives the real ports, tests give fakes.
import type { InboxRecord } from '../core/attention';
import type { AppSnapshot, ClickTarget, PopupContent } from '../core/snapshot';
import type { ThemeId } from '../core/theme';
import type { WindowAction } from './ipc';
import type { JumpPlan } from './jump';
import type { Settings } from './settings';

export interface Ports {
  now(): number;
  /** Local date `YYYY-MM-DD` of a time. */
  dayKey(ms: number): string;
  /** Local `HH:MM`, or `HH:MM:SS` with `seconds`. */
  formatTime(ms: number, seconds: boolean): string;
  appendInbox(r: InboxRecord): void;
  saveSettings(s: Settings): void;
  pushState(s: AppSnapshot): void;
  setCount(total: number): void;
  ding(): void;
  showPopup(session: string | null, content: PopupContent): void;
  closePopups(sessions: readonly string[]): void;
  notify(session: string, title: string, body: string): void;
  jump(plan: JumpPlan): void;
  notice(text: string): void;
  applyAlwaysOnTop(on: boolean): void;
  /** Send a new theme to the open pop-ups and the native window (themes Requirement 2.5). */
  applyTheme(theme: ThemeId): void;
  windowAction(action: WindowAction): void;
}

export type ClickFrom = ClickTarget | { kind: 'notification'; key: string };
