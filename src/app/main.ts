// AgentBuddy desktop app: the Electron main process (messenger-app Requirements 4, 5, 8, 9, 12, 15, 16).
// Wires the plain modules (controller, relay link, jump, files) to windows, the tray and two programs.
import { execFile } from 'node:child_process';
import { mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { Menu, app } from 'electron';
import { parsePort } from '../core/config';
import { defaultHome, ensureHome } from '../relay/home';
import { startRelay } from '../relay/start';
import { SAVE_DELAY_MS, TICK_MS } from './config';
import { createController } from './controller';
import type { Ports } from './controller';
import { createInboxWriter, readInbox } from './inbox-file';
import { CH, POPUP_CHECKS, UI_CHECKS } from './ipc';
import { runJump } from './jump';
import type { Exec } from './jump';
import { NOTIFY_REFUSED, createNotifier } from './notify';
import { createPopups } from './popups';
import { registerAppScheme, serveAppScheme } from './protocol';
import { createRelayLink } from './relay-link';
import { installSecurity, onTrusted } from './security';
import { loadSettings, saveSettings } from './settings';
import type { Settings } from './settings';
import { createTray } from './tray';
import { createMainWindow } from './windows';

const port = parsePort(process.env['AGENTBUDDY_PORT']);
const uiDir = join(__dirname, '..', 'ui');
const home = defaultHome();

// Keep Electron's own data (caches, local storage) inside ~/.agentbuddy too (Requirement 16.4).
const electronData = join(home, 'electron');
mkdirSync(electronData, { recursive: true, mode: 0o700 });
app.setPath('userData', electronData);
app.enableSandbox();
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required'); // the ding needs no click (Requirement 8.7)
registerAppScheme();

const pad = (n: number) => String(n).padStart(2, '0');
const execAsync: Exec = (file, args, opts) =>
  new Promise((resolve, reject) =>
    execFile(file, [...args], { timeout: opts.timeout, shell: false }, (err, stdout) => (err ? reject(err) : resolve({ stdout: String(stdout) }))),
  );

let quitting = false;

async function main(): Promise<void> {
  app.dock?.hide(); // no Dock icon (Requirement 5.7)
  Menu.setApplicationMenu(Menu.buildFromTemplate([{ role: 'appMenu' }, { role: 'editMenu' }])); // Cmd+Q works (Requirement 5.6)
  installSecurity();
  serveAppScheme(uiDir);

  ensureHome(home);
  const settings = await loadSettings(home);
  const records = await readInbox(home, Date.now());
  const inbox = createInboxWriter(home, (code) => console.error(`inbox write failed: ${code}`));

  let pendingSave: Settings | null = null;
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  const writeSettings = async () => {
    clearTimeout(saveTimer);
    const s = pendingSave;
    pendingSave = null;
    if (s) await saveSettings(home, s).catch((e: NodeJS.ErrnoException) => console.error(`settings save failed: ${e.code ?? 'unknown'}`));
  };

  const mainWin = createMainWindow({ preload: join(__dirname, 'preload-main.cjs'), alwaysOnTop: settings.alwaysOnTop, isQuitting: () => quitting });
  const popups = createPopups({ preload: join(__dirname, 'preload-popup.cjs'), onAction: (session, action) => controller.onPopup(session, action) });
  const notice = (text: string) => (mainWin.isVisible() ? mainWin.send(CH.notice, { text }) : popups.show(null, { kind: 'notice', text }));
  const notifier = createNotifier({ onClick: (session) => controller.onClick({ kind: 'notification', key: session }), onRefused: () => notice(NOTIFY_REFUSED) });
  const tray = createTray({
    onShowList: () => (mainWin.show(), mainWin.send(CH.screen, 'list')),
    onShowInbox: () => (mainWin.show(), mainWin.send(CH.screen, 'inbox')),
    onQuit: () => app.quit(),
  });

  const ports: Ports = {
    now: () => Date.now(),
    dayKey: (ms) => {
      const d = new Date(ms);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    },
    formatTime: (ms, seconds) =>
      new Date(ms).toLocaleTimeString('en-GB', seconds ? { hour: '2-digit', minute: '2-digit', second: '2-digit' } : { hour: '2-digit', minute: '2-digit' }),
    appendInbox: (r) => inbox.append(r),
    saveSettings: (s) => {
      pendingSave = s;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => void writeSettings(), SAVE_DELAY_MS);
    },
    pushState: (s) => mainWin.send(CH.state, s),
    setCount: (n) => tray.setCount(n),
    ding: () => mainWin.send(CH.ding),
    showPopup: (session, content) => popups.show(session, content),
    closePopups: (keys) => popups.closeSessions(keys),
    notify: (session, title, body) => notifier.show(session, title, body),
    jump: (plan) => void runJump(plan, execAsync, notice),
    notice,
    applyAlwaysOnTop: (on) => mainWin.setAlwaysOnTop(on),
    windowAction: (a) => mainWin.action(a),
    isDirectory: (p) => {
      try {
        return statSync(p).isDirectory();
      } catch {
        return false;
      }
    },
  };
  const controller = createController({ settings, records, port }, ports);

  const fromMain = mainWin.owns;
  onTrusted(CH.ready, UI_CHECKS['ui:ready'], fromMain, () => controller.refresh());
  onTrusted(CH.click, UI_CHECKS['ui:click'], fromMain, (t) => controller.onClick(t));
  onTrusted(CH.hide, UI_CHECKS['ui:hide'], fromMain, (v) => controller.onHide(v.session));
  onTrusted(CH.setting, UI_CHECKS['ui:setting'], fromMain, (v) => controller.onSetting(v.key, v.value));
  onTrusted(CH.group, UI_CHECKS['ui:group'], fromMain, (v) => controller.onGroup(v.folder, v.open));
  onTrusted(CH.ackAll, UI_CHECKS['ui:ackAll'], fromMain, () => controller.onAckAll());
  onTrusted(CH.window, UI_CHECKS['ui:window'], fromMain, (v) => controller.onWindow(v.action));
  onTrusted(CH.popupClick, POPUP_CHECKS['popup:click'], popups.isPopup, (v, sender) => popups.handle(sender, v.action));

  const link = createRelayLink({
    port,
    start: (p) => startRelay({ port: p, uiDir, home, onMessage: (t) => console.error(t) }),
    onList: (list, baseline) => controller.onList(list, baseline),
    onLink: (m, c, code) => controller.onLink(m, c, code),
  });
  const tick = setInterval(() => controller.onTick(), TICK_MS);

  app.on('second-instance', () => mainWin.show()); // Requirement 4.2
  // Ctrl+C on `npm run app`, or a check script's SIGTERM, quits the same clean way as Cmd+Q.
  process.on('SIGINT', () => app.quit());
  process.on('SIGTERM', () => app.quit());
  app.on('before-quit', (e) => {
    if (quitting) return;
    quitting = true;
    e.preventDefault();
    clearInterval(tick);
    popups.closeAll();
    // Stop the app's own relay (an attached one keeps running), finish writes, then quit for real.
    void Promise.allSettled([link.stop(), inbox.flush(), writeSettings()]).finally(() => {
      tray.destroy();
      app.quit();
    });
  });
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  // Stay in the menu bar when the last window closes (Electron quits otherwise; O4 run A).
  app.on('window-all-closed', () => {});
  app
    .whenReady()
    .then(main)
    .catch((err: unknown) => {
      console.error(`app start failed: ${(err as NodeJS.ErrnoException | null)?.code ?? 'unknown'}`);
      app.exit(1);
    });
}
