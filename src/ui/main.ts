// UI entry: in the desktop app the list comes through the preload bridge; in a browser,
// from the relay's stream. (The app bridge here is a stop-gap until task 10.6 adds bridge.ts.)
import type { BuddyView } from '../core/buddies';
import type { AppSnapshot } from '../core/snapshot';
import { createBuddyList } from './screens/list';
import './styles/tokens.css';
import './styles/fonts.css';
import './styles/icons.css';

const RETRY_MS = 3000;

const tbody = document.querySelector<HTMLTableSectionElement>('#buddies tbody');
const notice = document.querySelector<HTMLElement>('#notice');
const list = tbody ? createBuddyList(tbody) : null;

function connect(): void {
  const source = new EventSource('/stream');

  source.addEventListener('buddies', (e) => {
    let data: unknown;
    try {
      data = JSON.parse((e as MessageEvent<string>).data);
    } catch {
      return;
    }
    if (!Array.isArray(data) || !list) return;
    list.render(data as BuddyView[]);
    if (notice) notice.hidden = true;
  });

  source.addEventListener('error', () => {
    if (notice) notice.hidden = false;
    // EventSource retries network errors itself, but gives up after an HTTP
    // error reply. Start over in that case so the list keeps retrying.
    if (source.readyState === EventSource.CLOSED) setTimeout(connect, RETRY_MS);
  });
}

interface AppBridge {
  onState(cb: (s: AppSnapshot) => void): void;
  ready(): void;
}
const app = (window as unknown as { agentbuddy?: AppBridge }).agentbuddy;
if (app) {
  app.onState((s) => {
    if (!list || !Array.isArray(s.buddies)) return;
    list.render(s.buddies);
    if (notice) notice.hidden = s.connection === 'ok';
  });
  app.ready();
} else {
  connect();
}
