// Optional macOS notifications, off by default (messenger-app Requirements 8.8, 8.9).
// Run from source, macOS refused them in O4 (UNErrorDomain error 1): a failure shows one notice per run.
import { Notification } from 'electron';

export const NOTIFY_REFUSED = 'macOS did not allow the notification (System Settings › Notifications)';

export function createNotifier(o: { onClick: (session: string) => void; onRefused: () => void }) {
  const live = new Set<Notification>(); // kept until clicked or closed, so the click is not lost
  let warned = false;
  const refuse = () => {
    if (warned) return;
    warned = true;
    o.onRefused();
  };
  return {
    show(session: string, title: string, body: string): void {
      if (!Notification.isSupported()) return refuse();
      const n = new Notification({ title, body, silent: true }); // the ding is the sound
      live.add(n);
      n.on('click', () => {
        live.delete(n);
        o.onClick(session);
      });
      n.on('close', () => live.delete(n));
      n.on('failed', () => {
        live.delete(n);
        refuse();
      });
      n.show();
    },
  };
}
