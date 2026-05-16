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
- [ ] **Discord Settings**: Add a setting option to enable/disable Discord Rich Presence and allow users to customize the activity details (e.g., showing board name, card title, etc.).
- [ ] **Installer Builds/Updates**: Rework the installer builds to support multiple platforms (Windows, macOS, Linux) and make sure that auto-updates work seamlessly across all platforms.

## 4.1. Advanced System Integrations
- [ ] **Localization (i18n)**: Prepare the app for multiple languages to expand user base.
- [ ] **Calendar Integration**: Export due dates to a `.ics` feed or sync directly with Google Calendar/Outlook.
- [ ] **Tray**: Add a setting to choose whether the app closes to the system tray instead of actual closing, and allow quick access to boards from the tray icon context menu.
- [ ] **System Startup**: Add a setting to launch the application minimized in the tray on system startup.
- [ ] **Notifications**: Implement desktop notifications for upcoming due dates or card assignments.

## 5. Performance & Scalability
- [ ] **Virtualized Lists**: For boards with many cards, implement virtualization to maintain smooth performance.
- [ ] **Database Optimization**: Review and optimize SQLite queries, especially for loading large boards or searching.
- [ ] **Lazy Loading**: Load board data on demand rather than all at once to improve startup times.

## 6. Community & Open Source
- [ ] **Plugin System**: Design a plugin architecture to allow third-party developers to extend functionality (e.g., custom card types, integrations). Also provide documentation and examples for plugin development.
- [ ] **Documentation**: Create comprehensive documentation for both users and developers, including API references for plugins.
- [ ] **Contribution Guidelines**: Establish clear guidelines for contributing to the project, including code style, testing requirements, and issue reporting.

## 7. Future Roadmap
- [ ] **Mobile Support**: Explore options for a mobile version of the app, either through a responsive web app or native mobile applications.
- [ ] **Collaboration Features**: Implement real-time collaboration for multiple users working on the same board, with presence indicators and conflict resolution.
- [ ] **Static Share**: Allow users to generate a static HTML export of a board for sharing without requiring the app, and also a QR Code share that will have the board data encoded in the QR code itself, allowing users to share boards easily without needing to export/import files.

## 8. Cloud Integration & Database Flexibility
- [ ] **Cloud Sync / Backup**: Offer an option to sync the SQLite database to cloud providers like Google Drive or Dropbox, or implement a custom sync server.
- [ ] **Database Connector**: Make the app compatible with most databases such as MySQL, PostgreSQL, MongoDB, etc. to allow users to connect their existing databases and use them as the backend for the app instead of SQLite local.
