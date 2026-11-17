// The demo page (submission Requirement 1): intro text, Start demo, Replay, and the host the frames ask
// for their bridges. The scenario is bundled, so the page fetches nothing.
import '../ui/styles/themes.css';
import '../ui/styles/fonts.css';
import '../ui/styles/materials.css';
import './styles/demo.css';
import raw from '../../demo/events.json';
import { DEFAULT_THEME } from '../core/theme';
import { applyTheme } from '../ui/theme';
import { createHost } from './host';
import { parseScenario } from './scenario';

/** The demo video on YouTube; the link shows once this is set (Requirement 1.2). */
const VIDEO_URL: string = 'https://youtu.be/dd_SMLPNns4';

applyTheme(DEFAULT_THEME);
const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;

if (VIDEO_URL !== '') {
  $<HTMLAnchorElement>('.demo-video-link').href = VIDEO_URL;
  $('.demo-video').hidden = false;
}

const parsed = parseScenario(raw);
if (!parsed.ok) {
  $('.demo-error').hidden = false;
  $<HTMLButtonElement>('.demo-start-btn').disabled = true;
} else {
  const host = createHost({
    scenario: parsed.scenario,
    windowFrame: $<HTMLIFrameElement>('.demo-window'),
    popupLayer: $('.demo-popups'),
    onEnd: () => {
      $('.demo-end').hidden = false;
    },
    onTheme: applyTheme, // the page follows the skin chosen in the window
  });
  (window as unknown as { agentbuddyDemo: typeof host }).agentbuddyDemo = host;
  $('.demo-start-btn').addEventListener('click', () => {
    $('.demo-start').hidden = true;
    host.start();
    $<HTMLIFrameElement>('.demo-window').focus();
  });
  $('.demo-replay').addEventListener('click', () => {
    $('.demo-end').hidden = true;
    host.replay();
  });
}
