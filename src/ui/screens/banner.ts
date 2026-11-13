// The TIP banner above the status bar (retro-skin Requirement 9). Built-in tips only, set with textContent;
// the banner changes only on a click (or when the user's own action made the shown tip stop applying).
import type { ThemeId } from '../../core/theme';
import { button, el } from '../dom';
import type { BannerVM } from '../model/banner';
import { icon } from '../sprites/icons';
import { sprite } from '../sprites/render';
export interface BannerActions {
  /** A click on the banner: its tip's action, or the next tip when it has none (Requirement 9.5). */
  run(vm: BannerVM): void;
  /** `▶`: the next tip (Requirement 9.6). */
  next(): void;
}
export function renderBanner(root: HTMLElement, theme: ThemeId, vm: BannerVM | null, a: BannerActions): void {
  root.hidden = vm === null;
  if (vm === null) return root.replaceChildren();
  const main = button('banner-main', '', () => a.run(vm), 'banner:main');
  const body = el('span', 'banner-body', vm.body);
  if (vm.berry) body.append(' ', icon('berry', 10));
  main.append(el('span', 'banner-head', vm.headline), body);
  const next = button('banner-next', '▶', () => a.next(), 'banner:next');
  next.setAttribute('aria-label', 'Next tip');
  root.replaceChildren(sprite(theme, 'banner', null, 28), main, next);
}
