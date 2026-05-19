# Contributing to Orbit Board
First off, thank you for considering contributing to Orbit Board! It's people like you that make Orbit Board such a great tool.

## Code of Conduct
By participating in this project, you agree to abide by our standards of professional and respectful communication.

## How Can I Contribute?

### Reporting Bugs

- **Check if it's already reported**: Search the [issues](https://github.com/jurgenjacobsen/orbit-board/issues) to see if the bug has already been reported.
- **Provide a clear description**: Include steps to reproduce, what you expected to happen, and what actually happened.
- **Include environment details**: Mention your OS version and Orbit Board version.

### Suggesting Enhancements

- **Check if it's already suggested**: Search the [issues](https://github.com/jurgenjacobsen/orbit-board/issues).
- **Explain the "Why"**: Describe why this feature would be useful to most users.

### Your First Code Contribution

1. Fork the repository.
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/orbit-board.git`
3. Install dependencies: `npm install`
4. Create a branch: `git checkout -b feat/your-feature-name` or `fix/your-bug-name`
5. Make your changes and commit them (see [Commit Message Guidelines](#commit-message-guidelines)).
6. Push to your fork: `git push origin feat/your-feature-name`
7. Open a Pull Request.

## Development Setup

### Scripts
- `npm run dev`: Starts both React (Vite) and Electron in development mode.
- `npm run build`: Compiles the application for production.
- `npm run dist:mac | dist:win | dist:linux`: Creates platform-specific distributable packages.
- `npm run test:unit`: Runs unit tests using Vitest.
- `npm run test:e2e`: Runs end-to-end tests using Playwright.
- `npm run transpile:electron`: Transpiles the Electron TypeScript files.

### Code Style
- **Prettier**: We use Prettier for formatting. Ensure your editor is configured to use the project's `.prettierrc` (Tab Width: 4).
- **ESLint**: We use ESLint to maintain code quality. Run `npx eslint .` to check for issues.
- **TypeScript**: Always use strict typing. Avoid using `any`. Use interfaces and types defined in `src/types.ts` or `types.d.ts`.

### UI Styling
- **Tailwind CSS**: Use Tailwind for styling.
- **Consistency**: Maintain the existing UI aesthetic. Use the same spacing, colors, and component patterns found in `src/ui/components`.

## Testing Requirements
- **Unit Tests**: Add tests for new utility functions or complex logic in `src/`.
- **E2E Tests**: For new features that involve user interaction, add a Playwright test in the `e2e/` directory.
- **Verification**: Ensure all tests pass before submitting a PR:
  ```bash
  npm run test:unit
  npm run test:e2e
  ```

## Commit Message Guidelines

We use [Gitmoji](https://gitmoji.dev/) for our commit messages to make them more readable and expressive.

Examples:
- `✨ feat: Add support for card attachments`
- `🐛 fix: Resolve crash when deleting last board`
- `🎨 style: Improve layout of BoardPage`
- `📝 docs: Update contribution guidelines`
- `🔧 chore: Update dependencies`

## Pull Request Process
1. Ensure your code follows the established style and passes all tests.
2. Update the `CHANGELOG.md`, `README.md` or `docs/` if you've added new features.
3. Your PR should have a descriptive title and a clear summary of changes.
4. Link any related issues (e.g., `Closes #123`).
5. Wait for a maintainer to review your PR.

Thank you for your contribution!
