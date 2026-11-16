// The app controller's ports on the demo page (submission Requirement 4, design "Host"): state, pop-ups
// and the ding go to the page; what only the desktop app can do becomes a notice. Nothing is stored.
// No DOM here: the host passes its outputs in.
import type { InboxRecord } from '../core/attention';
import type { AppSnapshot, PopupContent } from '../core/snapshot';
import type { ThemeId } from '../core/theme';
import type { Ports } from '../app/controller-ports';
import type { JumpPlan } from '../app/jump';
import { parseSettings } from '../app/settings-data';
import type { Settings } from '../app/settings-data';

/** What each bundle ID is called in a notice; others show the ID itself. */
export const APP_NAMES: Readonly<Record<string, string>> = {
  'dev.kiro.desktop': 'Kiro',
  'com.anthropic.claudefordesktop': 'the Claude app',
  'com.openai.codex': 'the Codex app',
  'com.microsoft.VSCode': 'VS Code',
  'com.apple.Terminal': 'Terminal',
};

export const DEMO_NOTICES = {
  jump: (bundleId: string) => `In the app, this brings ${APP_NAMES[bundleId] ?? bundleId} forward.`,
  notify: 'In the app, this posts a macOS notification.',
  desktopOnly: 'Works in the desktop app.',
} as const;

/** The app's defaults, not pinned on top: a web page cannot stay on top (Requirement 4.4). */
export function demoSettings(): Settings {
  return parseSettings({ alwaysOnTop: false });
}

/** The notice a jump plan gives on the demo page (Requirement 4.3). */
export function jumpNotice(plan: JumpPlan): string {
  return plan.kind === 'run' ? DEMO_NOTICES.jump(plan.bundleId) : plan.text;
}

export interface DemoOutputs {
  pushState(s: AppSnapshot): void;
  showPopup(session: string | null, content: PopupContent): void;
  closePopups(sessions: readonly string[]): void;
  ding(): void;
  notice(text: string): void;
  applyTheme(theme: ThemeId): void;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** The ports for `createController`; `now` is the browser clock unless a test passes its own. */
export function demoPorts(out: DemoOutputs, now: () => number = () => Date.now()): Ports & { inbox: readonly InboxRecord[] } {
  const inbox: InboxRecord[] = []; // memory only, gone with the tab (Requirement 4.5)
  return {
    inbox,
    now,
    dayKey: (ms) => {
      const d = new Date(ms);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    },
    formatTime: (ms, seconds) =>
      new Date(ms).toLocaleTimeString('en-GB', seconds ? { hour: '2-digit', minute: '2-digit', second: '2-digit' } : { hour: '2-digit', minute: '2-digit' }),
    appendInbox: (r) => void inbox.push(r),
    saveSettings: () => {}, // the controller keeps the settings; nothing is written (Requirement 4.5)
    pushState: (s) => out.pushState(s),
    setCount: () => {}, // there is no menu bar icon in a browser (Requirement 2.2)
    ding: () => out.ding(),
    showPopup: (session, content) => out.showPopup(session, content),
    closePopups: (sessions) => out.closePopups(sessions),
    notify: () => out.notice(DEMO_NOTICES.notify),
    jump: (plan) => out.notice(jumpNotice(plan)),
    notice: (text) => out.notice(text),
    applyAlwaysOnTop: () => out.notice(DEMO_NOTICES.desktopOnly),
    applyTheme: (theme) => out.applyTheme(theme),
    windowAction: () => out.notice(DEMO_NOTICES.desktopOnly),
  };
}
