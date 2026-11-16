// The main window frame of the demo page: takes its bridge from the parent's host, then loads the app's own
// main window UI, unchanged (submission design "Overview"). Opened on its own, it loads nothing, so it never
// falls back to the relay's stream (Requirement 1.4).
import type { AppBridge } from '../ui/bridge';
import type { DemoHost } from './host';

const host = (window.parent === window ? undefined : (window.parent as unknown as { agentbuddyDemo?: DemoHost }).agentbuddyDemo);
if (host !== undefined) {
  (window as unknown as { agentbuddy: AppBridge }).agentbuddy = host.mainBridge();
  void import('../ui/main');
} else {
  document.body.textContent = 'Open the demo page (index.html) instead.';
}
