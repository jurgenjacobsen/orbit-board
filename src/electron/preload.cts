const electron = require('electron');

electron.contextBridge.exposeInMainWorld("electron", {
    subscribeStatistics: (callback) =>  {
        electron.ipcRenderer.on('statistics', (_: unknown, stats: any) => {
            callback(stats);
        })
    },
    getStaticData: () => electron.ipcRenderer.invoke('getStaticData'),
} satisfies Window['electron']);
