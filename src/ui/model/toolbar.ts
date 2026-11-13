// The toolbar under the title bar as plain data (retro-skin Requirement 6, B1 and B4; design "Toolbar"). Pure.
// One tab stop with a roving tabindex over all four buttons; the arrow keys, Home and End move focus only.
import type { ThemeId } from '../../core/theme';
import type { Tab } from './chrome';
export const TOOLS = ['list', 'inbox', 'settings', 'skin'] as const;
export type Tool = (typeof TOOLS)[number];
export const TOOL_LABELS: Readonly<Record<Tool, string>> = { list: 'Buddies', inbox: 'Inbox', settings: 'Settings', skin: 'Skin' };
/** The button index a key moves focus to, or null for any other key (Requirement 6.6). */
export function rovingTarget(key: string, index: number, count: number): number | null {
  switch (key) {
    case 'ArrowRight':
      return (index + 1) % count;
    case 'ArrowLeft':
      return (index - 1 + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}
export interface ToolVM {
  tool: Tool;
  /** `aria-current="page"` and the pressed look: the open screen's button; never `skin` (Requirement 6.2, 6.4). */
  current: boolean;
  tabIndex: 0 | -1;
}
/**
 * Per button: whether it is current and whether it is the tab stop. The tab stop moves to the open screen's
 * button only when the screen changed, so a re-render never takes the arrow-key position away (Requirement 6.5).
 */
export function toolbarView(tab: Tab, previousTab: Tab | null, rovingIndex: number): { tools: ToolVM[]; rovingIndex: number } {
  const index = previousTab !== tab ? TOOLS.indexOf(tab) : Math.min(Math.max(rovingIndex, 0), TOOLS.length - 1);
  return {
    tools: TOOLS.map((tool, i) => ({ tool, current: tool === tab, tabIndex: i === index ? 0 : -1 })),
    rovingIndex: index,
  };
}
/** Where `Skin` puts keyboard focus: the checked skin radio in Settings (Requirement 6.4). */
export const skinFocusId = (theme: ThemeId): string => `theme:${theme}`;
