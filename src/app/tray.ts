// The menu bar icon: the bubble as a template image, the count as its title, and a
// small menu (messenger-app Requirements 5.3, 5.4, 5.8).
import { Menu, Tray, nativeImage } from 'electron';
import { bubbleBitmap } from './icon';

export function createTray(o: { onShowList: () => void; onShowInbox: () => void; onQuit: () => void }) {
  const small = bubbleBitmap(1);
  const large = bubbleBitmap(2);
  const image = nativeImage.createFromBitmap(Buffer.from(small.data), { width: small.width, height: small.height, scaleFactor: 1 });
  image.addRepresentation({ scaleFactor: 2, width: large.width, height: large.height, buffer: Buffer.from(large.data) });
  image.setTemplateImage(true); // macOS tints it for light and dark menu bars
  const tray = new Tray(image);
  tray.setToolTip('AgentBuddy');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Show buddy list', click: o.onShowList },
      { label: 'Show inbox', click: o.onShowInbox },
      { type: 'separator' },
      { label: 'Quit AgentBuddy', click: o.onQuit },
    ]),
  );
  return {
    setCount(n: number): void {
      tray.setTitle(n > 0 ? String(n) : '');
    },
    destroy: () => tray.destroy(),
  };
}
