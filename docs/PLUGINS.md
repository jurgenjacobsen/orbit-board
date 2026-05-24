# Orbit Board Plugin Documentation

Orbit Board supports a powerful plugin system that allows developers to extend both the Electron main process and the React renderer process.

## Plugin Structure

Plugins are stored in the `plugins` folder within the application's user data directory. Each plugin must be a subdirectory containing at least a `plugin.json` file.

### manifest: `plugin.json`

```json
{
  "id": "my-awesome-plugin",
  "name": "Awesome Plugin",
  "version": "1.0.0",
  "description": "Adds amazing features to Orbit Board",
  "author": "Your Name",
  "main": "main.js",
  "renderer": "renderer.js"
}
```

- **id**: A unique identifier for the plugin (kebab-case recommended).
- **name**: Display name of the plugin.
- **version**: Semantic versioning string.
- **main**: Path to the main process entry point (optional).
- **renderer**: Path to the renderer process entry point (optional).

---

## Main Process Plugin (`main.js`)

The main process script is loaded using dynamic `import()`. It should export an `init` function.

```javascript
/**
 * @param {Object} context
 * @param {Object} context.db - The LowDB database instance
 */
export async function init(context) {
    const { db } = context;
    console.log("Hello from Main Process Plugin!");
    
    // You can interact with the database directly
    // db.data.boards.push(...)
}

export async function deinit() {
    console.log("Cleaning up plugin...");
}
```

---

## Renderer Process Plugin (`renderer.js`)

The renderer script is loaded via a `<script>` tag in the UI. To avoid global namespace pollution and ensure initialization, the plugin should define its logic on the `window` object using a specific naming convention: `OrbitPlugin_{id}`.

```javascript
window.OrbitPlugin_my_awesome_plugin = {
    init: () => {
        console.log("Hello from Renderer Process Plugin!");
        
        // You can access the Orbit Board API
        // window.api.getBoards().then(console.log);
    }
};
```

### Loading Assets

You can load assets from your plugin folder using the `plugin://` protocol:

```javascript
const imageUrl = `plugin://my-awesome-plugin/assets/icon.png`;
```

---

## Development Tips

1. **Hot Reloading**: Currently, Electron main process changes require an app restart. Renderer changes can often be picked up by reloading the window (`Ctrl+R`).
2. **Debugging**: Use the Electron DevTools (`Ctrl+Shift+I`) to debug your renderer scripts. Main process logs will appear in the terminal/console where Orbit Board is running.
3. **API Access**: Plugins have full access to the `window.api` exposed by the preload script, allowing them to interact with the database, system settings, and more.
