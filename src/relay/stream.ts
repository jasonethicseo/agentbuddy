// Server-Sent Events: the full buddy list on connect and on every change.

import type { ServerResponse } from 'node:http';
import type { BuddyView } from '../core/state';

export interface Stream {
  add(res: ServerResponse, list: BuddyView[]): void;
  broadcast(list: BuddyView[]): void;
  close(): void;
  readonly size: number;
}

const message = (list: BuddyView[]) => `event: buddies\ndata: ${JSON.stringify(list)}\n\n`;

export function createStream(heartbeatMs: number): Stream {
  const clients = new Set<ServerResponse>();
  const heartbeat = setInterval(() => {
    for (const res of clients) res.write(': ping\n\n');
  }, heartbeatMs);
  heartbeat.unref();

  return {
    add(res, list) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-store',
        Connection: 'keep-alive',
        'X-Content-Type-Options': 'nosniff',
      });
      res.write(message(list));
      clients.add(res);
      res.on('close', () => clients.delete(res));
    },
    broadcast(list) {
      const data = message(list);
      for (const res of clients) res.write(data);
    },
    close() {
      clearInterval(heartbeat);
      for (const res of clients) res.end();
      clients.clear();
    },
    get size() {
      return clients.size;
    },
  };
}
