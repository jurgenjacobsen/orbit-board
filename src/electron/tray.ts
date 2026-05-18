import { BrowserWindow, Menu, Tray, app } from "electron";
import { getAssetPath } from "./pathResolver.js";
import path from "path";

export async function createTray(mainWindow: BrowserWindow, db: any) {
  const tray = new Tray(
    path.join(
      getAssetPath(),
      process.platform === 'darwin' ? 'iconTemplate.png' : 'icon_rounded.png'
    )
  );

  tray.on('double-click', () => {
    mainWindow.show();
    if (app.dock) {
        app.dock.show();
    }
  });

  const updateContextMenu = async () => {
    await db.read();
    const boards = db.data.boards.filter((b: any) => !b.deleted_at && !b.archived);

    const boardItems = boards.slice(0, 5).map((board: any) => ({
      label: board.name,
      click: () => {
        mainWindow.show();
        if (app.dock) app.dock.show();
        // We need a way to navigate in the renderer. 
        // For now, showing the window is a good start. 
        // In a real app we might send an IPC message to navigate.
        mainWindow.webContents.send('navigate', `/board/${board.id}`);
      }
    }));

    const template: any[] = [
      {
          label: 'Orbit Board' + " ".repeat(10),
          enabled: false,
      },
      { type: 'separator' },
      {
          label: 'Show',
          click: () => {
              mainWindow.show();
              if (app.dock) {
                  app.dock.show();
              }
          },
      },
      { type: 'separator' },
    ];

    if (boardItems.length > 0) {
      template.push({ label: 'Recent Boards', enabled: false });
      template.push(...boardItems);
      template.push({ type: 'separator' });
    }

    template.push({
        label: 'Quit',
        click: () => app.quit(),
    });

    tray.setContextMenu(Menu.buildFromTemplate(template));
  };

  await updateContextMenu();

  // Update menu when boards change (heuristic)
  // In a real app, we'd use an event emitter or observer
  setInterval(updateContextMenu, 60000); // Refresh every minute
}
