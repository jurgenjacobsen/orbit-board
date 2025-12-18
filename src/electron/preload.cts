const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('api', {
  // Board operations
  getBoards: () => ipcRenderer.invoke('db:getBoards'),
  getBoard: (id) => ipcRenderer.invoke('db:getBoard', id),
  createBoard: (board) => ipcRenderer.invoke('db:createBoard', board),
  updateBoard: (board) => ipcRenderer.invoke('db:updateBoard', board),
  deleteBoard: (id) => ipcRenderer.invoke('db:deleteBoard', id),

  // Column operations
  getColumns: (boardId) => ipcRenderer.invoke('db:getColumns', boardId),
  createColumn: (column) => ipcRenderer.invoke('db:createColumn', column),
  updateColumn: (column) => ipcRenderer.invoke('db:updateColumn', column),
  deleteColumn: (id) => ipcRenderer.invoke('db:deleteColumn', id),
  updateColumnsPositions: (columns) => ipcRenderer.invoke('db:updateColumnsPositions', columns),

  // Card operations
  getCards: (columnId) => ipcRenderer.invoke('db:getCards', columnId),
  getCardsByBoard: (boardId) => ipcRenderer.invoke('db:getCardsByBoard', boardId),
  createCard: (card) => ipcRenderer.invoke('db:createCard', card),
  updateCard: (card) => ipcRenderer.invoke('db:updateCard', card),
  deleteCard: (id) => ipcRenderer.invoke('db:deleteCard', id),
  updateCardsPositions: (cards) => ipcRenderer.invoke('db:updateCardsPositions', cards),

  // Label operations
  getLabels: (boardId) => ipcRenderer.invoke('db:getLabels', boardId),
  createLabel: (label) => ipcRenderer.invoke('db:createLabel', label),
  updateLabel: (label) => ipcRenderer.invoke('db:updateLabel', label),
  deleteLabel: (id) => ipcRenderer.invoke('db:deleteLabel', id),
  getCardLabels: (cardId) => ipcRenderer.invoke('db:getCardLabels', cardId),
  addLabelToCard: (cardId, labelId) => ipcRenderer.invoke('db:addLabelToCard', { cardId, labelId }),
  removeLabelFromCard: (cardId, labelId) => ipcRenderer.invoke('db:removeLabelFromCard', { cardId, labelId }),

  // Settings operations
  resetApplication: () => ipcRenderer.invoke('db:resetApplication'),
  getSetting: (key) => ipcRenderer.invoke('db:getSetting', key),
  // @ts-ignore
  setSetting: (key: any, value: any) => ipcRenderer.invoke('db:setSetting', { key, value }),

  // Export/Import
  exportData: () => ipcRenderer.invoke('db:exportData'),
  importData: () => ipcRenderer.invoke('db:importData'),

  // Levels
  completeTask: () => ipcRenderer.invoke('lvl:completeTask'),
  getCurrent: () => ipcRenderer.invoke('lvl:getCurrent')
} satisfies Window['api']);
