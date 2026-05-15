const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('api', {
  // Board operations
  getBoards: (options?: any) => ipcRenderer.invoke('db:getBoards', options),
  getBoard: (id: string) => ipcRenderer.invoke('db:getBoard', id),
  createBoard: (board: any) => ipcRenderer.invoke('db:createBoard', board),
  updateBoard: (board: any) => ipcRenderer.invoke('db:updateBoard', board),
  archiveBoard: (id: string) => ipcRenderer.invoke('db:archiveBoard', id),
  restoreBoard: (id: string) => ipcRenderer.invoke('db:restoreBoard', id),
  bulkRestoreBoards: (ids: string[]) => ipcRenderer.invoke('db:bulkRestoreBoards', ids),
  deleteBoard: (id: string, permanent?: boolean) => ipcRenderer.invoke('db:deleteBoard', { id, permanent }),
  bulkDeleteBoards: (ids: string[], permanent?: boolean) => ipcRenderer.invoke('db:bulkDeleteBoards', { ids, permanent }),
  emptyRecycleBin: () => ipcRenderer.invoke('db:emptyRecycleBin'),

  // Column operations
  getColumns: (boardId: string, options?: any) => ipcRenderer.invoke('db:getColumns', { boardId, options }),
  createColumn: (column: any) => ipcRenderer.invoke('db:createColumn', column),
  updateColumn: (column: any) => ipcRenderer.invoke('db:updateColumn', column),
  deleteColumn: (id: string, permanent?: boolean) => ipcRenderer.invoke('db:deleteColumn', { id, permanent }),
  archiveColumn: (id: string) => ipcRenderer.invoke('db:archiveColumn', id),
  restoreColumn: (id: string) => ipcRenderer.invoke('db:restoreColumn', id),
  updateColumnsPositions: (columns: any) => ipcRenderer.invoke('db:updateColumnsPositions', columns),

  // Card operations
  getCards: (columnId: string, options?: any) => ipcRenderer.invoke('db:getCards', { columnId, options }),
  getCardsByBoard: (boardId: string, options?: any) => ipcRenderer.invoke('db:getCardsByBoard', { boardId, options }),
  createCard: (card: any) => ipcRenderer.invoke('db:createCard', card),
  updateCard: (card: any) => ipcRenderer.invoke('db:updateCard', card),
  deleteCard: (id: string, permanent?: boolean) => ipcRenderer.invoke('db:deleteCard', { id, permanent }),
  archiveCard: (id: string) => ipcRenderer.invoke('db:archiveCard', id),
  restoreCard: (id: string) => ipcRenderer.invoke('db:restoreCard', id),
  updateCardsPositions: (cards: any) => ipcRenderer.invoke('db:updateCardsPositions', cards),
  searchCards: (query: string) => ipcRenderer.invoke('db:searchCards', query),

  // Attachment operations
  getAttachments: (cardId: string) => ipcRenderer.invoke('db:getAttachments', cardId),
  addAttachment: (cardId: string, file: any) => ipcRenderer.invoke('db:addAttachment', { cardId, file }),
  removeAttachment: (id: string) => ipcRenderer.invoke('db:removeAttachment', id),


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
  getSetting: (key: string) => ipcRenderer.invoke('db:getSetting', key),
  setSetting: (key: string, value: string) => ipcRenderer.invoke('db:setSetting', { key, value }),

  // Export/Import
  exportData: () => ipcRenderer.invoke('db:exportData'),
  importData: () => ipcRenderer.invoke('db:importData'),
  getOverviewData: () => ipcRenderer.invoke('db:getOverviewData'),
  getUserProfile: () => ipcRenderer.invoke('db:getUserProfile'),
  updateUserProfile: (profile: any) => ipcRenderer.invoke('db:updateUserProfile', profile),
  getActivityStats: () => ipcRenderer.invoke('db:getActivityStats')
} satisfies Window['api']);
