// UI entry. Relay mode only in this spec; demo mode arrives with the demo spec.

import type { BuddyView } from '../core/buddies';
import { createBuddyList } from './screens/list';

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

connect();
