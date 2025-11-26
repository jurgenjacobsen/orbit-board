# Orbit Board

A local kanban board application powered by Electron, Angular, Tailwind CSS, and SQLite. Supports multiple boards, drag & drop, labels, due dates, dark mode, and offline autosave.

![Orbit Board](https://img.shields.io/badge/Electron-Angular-blue)

## Features

- 📋 **Multiple Boards** - Create and manage multiple kanban boards
- 🎯 **Drag & Drop** - Easily reorder cards and columns with Angular CDK
- 🏷️ **Labels** - Categorize cards with customizable colored labels
- 📅 **Due Dates** - Track deadlines with visual indicators
- 📝 **Notes** - Add descriptions and private notes to cards
- 💾 **Autosave** - Changes are automatically saved to SQLite
- 🌙 **Dark Mode** - Toggle between light and dark themes
- 📤 **Import/Export** - Backup and restore data as JSON
- 🔒 **Offline First** - Works completely offline

## Tech Stack

- **Frontend**: Angular 17 (standalone components)
- **Desktop**: Electron
- **Styling**: Tailwind CSS
- **Database**: SQLite (better-sqlite3)
- **Drag & Drop**: Angular CDK

## Project Structure

```
orbit-board/
├── electron/
│   ├── main.js           # Electron main process
│   └── preload.js        # Context bridge for IPC
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   ├── board-list/     # Board listing page
│   │   │   ├── board-view/     # Kanban board view
│   │   │   ├── card/           # Card component
│   │   │   ├── card-modal/     # Card editing modal
│   │   │   ├── column/         # Column component
│   │   │   └── header/         # App header
│   │   ├── models/
│   │   │   └── index.ts        # TypeScript interfaces
│   │   ├── services/
│   │   │   ├── board.service.ts    # Board/Column/Card operations
│   │   │   ├── electron.service.ts # IPC bridge
│   │   │   └── theme.service.ts    # Dark mode handling
│   │   ├── app.component.ts
│   │   ├── app.config.ts
│   │   └── app.routes.ts
│   ├── styles.css          # Global styles + Tailwind
│   └── index.html
├── angular.json
├── package.json
├── tailwind.config.js
└── tsconfig.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
# Clone the repository
git clone https://github.com/jurgenjacobsen/orbit-board.git
cd orbit-board

# Install dependencies
npm install
```

### Development

```bash
# Run Angular development server
npm start

# Run Electron with Angular in development mode
npm run electron:dev
```

### Build for Production

```bash
# Build Angular for production
npm run build:prod

# Build Electron distributables
npm run electron:build
```

## Data Model

### Board
- `id`: Unique identifier
- `name`: Board name
- `description`: Optional description
- `created_at`, `updated_at`: Timestamps

### Column
- `id`: Unique identifier
- `board_id`: Reference to parent board
- `name`: Column name
- `position`: Order position

### Card
- `id`: Unique identifier
- `column_id`: Reference to parent column
- `title`: Card title
- `description`: Detailed description
- `notes`: Private notes
- `due_date`: Due date
- `position`: Order position

### Label
- `id`: Unique identifier
- `name`: Label name
- `color`: Hex color code
- `board_id`: Reference to parent board

## IPC Communication

The app uses Electron's IPC for secure communication between the Angular frontend and the SQLite database:

- **Main Process** (`electron/main.js`): Handles database operations
- **Preload Script** (`electron/preload.js`): Exposes safe APIs via contextBridge
- **Renderer** (`electron.service.ts`): Angular service for IPC calls

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.
