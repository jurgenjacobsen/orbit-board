# Orbit Board - Suggested Features & Plan

## 1. Technical Debt & Code Quality
- [x] **TypeScript Strictness**: Replace `any` types throughout the codebase (especially in `types.d.ts` and `src/electron/main.ts`) with properly defined interfaces or `unknown` where applicable. The current ESLint run highlights ~90 instances of `any`.
- [x] **Exhaustive Dependencies in React Hooks**: Fix missing dependencies in `useEffect` hooks (e.g., in `BoardPage.tsx`).
- [x] **End-to-End Testing**: Expand Playwright tests (in `e2e/`) to cover full user flows: board creation, column addition, card drag-and-drop, and data persistence.

## 2. Core Features Enhancement
- [x] **Rich Text Support for Cards**: Integrate a Markdown or rich-text editor for card descriptions to allow formatting, lists, and links.
- [x] **Card Attachments**: Allow users to attach files or images to cards.
- [x] **Search and Filtering**: Implement a global search to find cards by title, description, or label across all boards. Filter the current board by labels or due dates.
- [x] **Archive & Recycle Bin**: Instead of hard-deleting cards or boards, introduce an archive feature to restore accidentally deleted items. Recycle bin will hold deleted items for 30 days before permanent deletion.

## 3. UI / UX Polish
- [x] **Change Pages**: Change the "Overview" page to a "Boards" page that lists all boards with options to create, rename, or delete them.
- [x] **New Overview Page**: Create a new "Overview" page that aggregates cards from all boards, showing upcoming due dates and recent activity.
- [x] **Profile Page**: Add a profile page where users can manage their account settings, view activity logs, and customize their experience. With user profile inputs such as name, profile picture, username. As section there will also be a block similar to the github activity that shows user activity across all boards, such as recently updated cards, created cards, etc. (hitmap of user activity across all boards).
- [x] **Small UI Tweaks**: Add version number next to the "© 2026 Orbit Board".
- [x] **Keyboard Shortcuts**: Add extensive keyboard navigation for power users (e.g., creating a card with `C`, navigating columns with arrow keys). Add 
- [x] **Sidebar Current Position**: Highlighting: Highlight the current board in the sidebar for better navigation context.

## 3.1 UI Rework Details
- [x] **Custom Modals**: Replace native `window.prompt` and `window.confirm` dialogs with custom-styled modals that match the app's design language.

## 4. System Integrations
- [x] **Discord Rich Presence**: Integrate with Discord to show current board activity in the user's status.
- [x] **Discord Settings**: Add a setting option to enable/disable Discord Rich Presence and allow users to customize the activity details (e.g., showing board name, card title, etc.).
- [x] **System Startup**: Add a setting to launch the application minimized in the tray on system startup.
- [x] **Tray**: Tray icon for quick functions. Add a setting to choose whether the app closes to the system tray instead of actual closing, and allow quick access to boards from the tray icon context menu.
- [x] **Notifications**: Implement desktop notifications for upcoming due dates or card assignments. (Notifications should have the app icon, a title, and a message. Clicking the notification should open the app and navigate to the relevant card or board. Also add a setting to allow users to choose which notifications they want to receive, such as due date reminders, card assignments, etc., and also an option to set how far in advance they want to receive due date reminders, such as 10 minutes before, 30 minutes before, 1 hour before, etc.)

## 4.1. Advanced System Integrations
- [x] **Calendar Integration**: Export due dates to a `.ics` feed or sync directly with Google Calendar/Outlook. Each exported event will include the card title and board, description, and a link to open the card in the app. (This export option may be from all cards, one board, column, or card level, allowing users to export specific subsets of their tasks to their calendar.)
- [x] ***Installer Builds/Updates**: Rework, the installer builds to have the most customizable installer for first time installing, supporting multiple platforms (Windows, macOS, Linux) and make sure that auto-updates work seamlessly across all platforms. Also add a setting to allow users to choose whether they want to receive updates automatically or manually check for updates. Any update should also have a changelog that users can view before installing the update, and also an option to defer the update for a certain period of time in case they want to wait before updating. The update must download in the background and not interrupt the user while they are using the app, and also allow users to choose when to install the update (e.g., "Install now", "Remind me later", "Skip this version"). And it should install itself without requiring the user to download from Github and to go through the installer process again, and also allow users to roll back to a previous version if they encounter any issues with the new update. 

## 5. Performance & Scalability
- [x] **Virtualized Lists**: For boards with many cards, implement virtualization to maintain smooth performance.
- [x] **Database Optimization**: Review and optimize SQLite queries, especially for loading large boards or searching.
- [x] **Lazy Loading**: Load board data on demand rather than all at once to improve startup times.

## 6. Community & Open Source
- [x] **Contribution Guidelines**: Establish clear guidelines for contributing to the project, including code style, testing requirements, and issue reporting. (CONTRIBUTING.md)
- [x] **Plugin System**: Design a plugin architecture to allow third-party developers to extend functionality (e.g., custom card types, integrations). Provide documentation and examples for plugin development.
- [x] **Documentation**: Create comprehensive documentation for both users and developers, including API references for plugins.

## 7. Second Row of Features
- [x] **Calendar Page**: Add a calendar view that shows all cards with due dates in a calendar format, allowing users to see their schedule at a glance and easily drag and drop cards to change their due dates.
- [x] **Sample Plugin**: Develop a sample plugin such as a weather plugin that shows the current weather in the calendar page using a public weather API (openweathermap.org) to demonstrate how to create plugins and encourage community development.
- [ ] **Improve Due Dates**: Add time selection for due dates, not just dates. Parse the due date input to allow natural language (e.g., "tomorrow at 5pm", "next Monday", etc.) and also add a visual indicator on cards that are overdue or due soon.
- [ ] **Collaboration Features**: Implement real-time collaboration for multiple users working on the same board, with presence indicators and conflict resolution.
- [ ] **Static Share**: Allow users to generate a static HTML export of a board for sharing without requiring the app, and also a QR Code share that will have the board data encoded in the QR code itself, allowing users to share boards easily without needing to export/import files.
- [ ] **Localization (i18n)**: Prepare the app for multiple languages to expand user base.

## 8. Cloud Integration & Database Flexibility
- [ ] **Cloud Sync / Backup**: Offer an option to sync the SQLite database to cloud providers like Google Drive or Dropbox, or implement a custom sync server.
- [ ] **Database Connector**: Make the app compatible with most databases such as MySQL, PostgreSQL, MongoDB, etc. to allow users to connect their existing databases and use them as the backend for the app instead of SQLite local.
