// A pop-up frame of the demo page: takes the bridge of its pop-up (`?id=`) from the parent's host, then
// loads the app's own pop-up UI, unchanged (submission design "Overview").
import type { DemoHost, PopupBridge } from './host';

const host = (window.parent === window ? undefined : (window.parent as unknown as { agentbuddyDemo?: DemoHost }).agentbuddyDemo);
const bridge = host?.popupBridge(new URLSearchParams(location.search).get('id') ?? '');
if (bridge !== undefined) {
  (window as unknown as { agentbuddyPopup: PopupBridge }).agentbuddyPopup = bridge;
  void import('../ui/screens/popup');
}
