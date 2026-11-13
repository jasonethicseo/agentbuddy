// The app's state and decisions: pings, pop-up and notification content, acknowledgements,
// hiding, settings and jumps (messenger-app Requirements 5.3, 7.4, 8, 9.5–9.8, 10, 12.1–12.2, 13, 14).
// No timers and no I/O of its own: everything goes through `Ports`, so tests use fakes.
import type { BuddyView, SessionView } from '../core/buddies';
import { ackRecords, foldInbox, hide, isHidden, menuCount, pingRecord, refreshHidden, unackedSessions } from '../core/attention';
import type { InboxEntry, InboxRecord, MenuCount } from '../core/attention';
import { detectPings } from '../core/pings';
import type { AppSnapshot, Connection, RelayMode, SettingKey } from '../core/snapshot';
import type { ThemeId } from '../core/theme';
import type { ClickFrom, Ports } from './controller-ports';
import type { PopupAction, WindowAction } from './ipc';
import { NOTICES, planJump } from './jump';
import { notificationBody, popupContent } from './ping-content';
import { MAX_CLOSED_GROUPS } from './settings';
import type { Settings } from './settings';


export type { ClickFrom, Ports } from './controller-ports';



/** A view without agent text, for hide-text (Requirement 7.4). */
function stripText(b: BuddyView): BuddyView {
  const { statusText: _t, ...rest } = b;
  return { ...rest, sessions: b.sessions.map(({ statusText: _s, title: _n, ...s }) => s) };
}

export function createController(init: { settings: Settings; records: readonly InboxRecord[]; port: number }, ports: Ports) {
  let settings = init.settings;
  let day = ports.dayKey(ports.now());
  let records: InboxRecord[] = init.records.filter((r) => ports.dayKey(Date.parse(r.at)) === day);
  let entries: InboxEntry[] = foldInbox(records);
  let views: BuddyView[] = [];
  let prev: BuddyView[] | null = null;
  let mode: RelayMode = 'connecting';
  let connection: Connection = 'disconnected';
  let errorCode: string | undefined;

  const iso = () => new Date(ports.now()).toISOString();
  const sessions = () => views.flatMap((b) => b.sessions);
  const text = () => ({ hideText: settings.hideText, formatTime: ports.formatTime });

  function add(r: InboxRecord): void {
    records.push(r);
    ports.appendInbox(r);
  }

  function setSettings(next: Settings): void {
    settings = next;
    ports.saveSettings(settings);
  }

  function snapshot(count: MenuCount): AppSnapshot {
    const strip = settings.hideText;
    const { hidden: marks, ...pub } = settings;
    const s: AppSnapshot = {
      mode,
      port: init.port,
      connection,
      buddies: strip ? views.map(stripText) : views,
      hidden: sessions().filter((x) => isHidden(marks, x)).map((x) => x.key),
      unacked: [...unackedSessions(entries)],
      inbox: strip ? entries.map(({ title: _t, ...e }) => e) : entries,
      settings: { ...pub, closedGroups: [...pub.closedGroups] },
      count,
    };
    if (connection === 'error' && errorCode !== undefined) s.errorCode = errorCode;
    return s;
  }

  function update(): void {
    entries = foldInbox(records);
    const count = menuCount(views, entries);
    ports.setCount(count.total);
    ports.pushState(snapshot(count));
  }

  function ack(keys: readonly string[]): void {
    for (const r of ackRecords(entries, keys, iso())) add(r);
    if (keys.length > 0) ports.closePopups(keys);
    entries = foldInbox(records);
  }

  const jumpTo = (key: string) => ports.jump(planJump(views, key));

  return {
    /** Every new list from the relay link; `baseline` lists never ping (Requirement 8.2). */
    onList(list: BuddyView[], baseline: boolean): void {
      const pings = detectPings(baseline ? null : prev, list);
      prev = views = list;
      const hidden = refreshHidden(settings.hidden, list, ports.now());
      if (hidden !== settings.hidden) setSettings({ ...settings, hidden });
      const at = iso();
      for (const p of pings) {
        add(pingRecord(p, at)); // always, whatever the settings (Requirement 8.4)
        if (settings.popups) ports.showPopup(p.session, popupContent(text(), views, p, ports.now()));
        if (settings.macNotifications) ports.notify(p.session, p.buddyName, notificationBody(text(), p));
      }
      if (pings.length > 0 && settings.sound) ports.ding(); // once per list (Requirement 8.5)
      update();
    },
    onLink(m: RelayMode, c: Connection, code?: string): void {
      mode = m;
      connection = c;
      errorCode = code;
      update();
    },
    /** Rows, inbox entries and notifications: acknowledge first, then jump (Requirements 10.2, 10.3, 10.7, 12.1). */
    onClick(t: ClickFrom): void {
      if (t.kind === 'buddy') {
        const b = views.find((v) => v.key === t.key);
        if (b === undefined) ports.notice(NOTICES.gone);
        else {
          ack(b.sessions.map((s) => s.key));
          jumpTo(b.sessions[0]!.key);
        }
      } else {
        ack([t.key]);
        jumpTo(t.key);
      }
      update();
    },
    /** A pop-up button: Go there jumps, × acknowledges, Later does nothing (Requirement 9.5). */
    onPopup(session: string, action: PopupAction): void {
      if (action === 'go') return this.onClick({ kind: 'session', key: session });
      if (action === 'close') {
        ack([session]);
        update();
      }
    },
    onAckAll(): void {
      ack([...unackedSessions(entries)]);
      update();
    },
    /** × on a session row or a one-session buddy row: hide until a later event, and acknowledge (Requirements 13.1, 13.2). */
    onHide(key: string): void {
      const s: SessionView | undefined = sessions().find((x) => x.key === key);
      if (s === undefined) return;
      setSettings({ ...settings, hidden: hide(settings.hidden, s, ports.now()) });
      ack([key]);
      update();
    },
    onWindow(action: WindowAction): void {
      ports.windowAction(action);
    },
    onSetting(key: SettingKey, value: boolean): void {
      setSettings({ ...settings, [key]: value });
      if (key === 'alwaysOnTop') ports.applyAlwaysOnTop(value);
      update();
    },
    /** A new theme: saved, sent to the windows, nothing else (themes Requirement 2.6). */
    onTheme(theme: ThemeId): void {
      if (theme === settings.theme) return;
      setSettings({ ...settings, theme });
      ports.applyTheme(theme);
      update();
    },
    /** The "me" status message: kept in the settings file only, sent nowhere else (Requirement 18.5). */
    onStatus(text: string): void {
      if (text === settings.myStatus) return;
      setSettings({ ...settings, myStatus: text });
      update();
    },
    onGroup(folder: string, open: boolean): void {
      const closed = new Set(settings.closedGroups);
      if (open) closed.delete(folder);
      else closed.add(folder);
      setSettings({ ...settings, closedGroups: [...closed].slice(-MAX_CLOSED_GROUPS) });
      update();
    },
    /** Every 30 s: a new day empties the inbox of earlier days; old hidden marks expire. */
    onTick(): void {
      let changed = false;
      const today = ports.dayKey(ports.now());
      if (today !== day) {
        day = today;
        records = records.filter((r) => ports.dayKey(Date.parse(r.at)) === day);
        changed = true;
      }
      const hidden = refreshHidden(settings.hidden, views, ports.now());
      if (hidden !== settings.hidden) {
        setSettings({ ...settings, hidden });
        changed = true;
      }
      if (changed) update();
    },
    /** The window (re)loaded: send it the current state. */
    refresh: update,
  };
}

export type Controller = ReturnType<typeof createController>;
