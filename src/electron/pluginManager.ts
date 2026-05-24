import fs from 'fs';
import path from 'path';
import { getPluginsPath } from './pathResolver.js';
import type { PluginInfo, PluginMetadata } from '../types.js';
import type { LowDatabase } from './database.js';

export class PluginManager {
    private pluginsPath: string;
    private db: LowDatabase;
    private loadedPlugins: Map<string, any> = new Map();

    constructor(db: LowDatabase) {
        this.db = db;
        this.pluginsPath = getPluginsPath();
        this.ensurePluginsFolder();
    }

    private ensurePluginsFolder() {
        if (!fs.existsSync(this.pluginsPath)) {
            fs.mkdirSync(this.pluginsPath, { recursive: true });
        }
    }

    async getPlugins(): Promise<PluginInfo[]> {
        const plugins: PluginInfo[] = [];
        if (!fs.existsSync(this.pluginsPath)) return [];

        const dirs = fs.readdirSync(this.pluginsPath, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory());

        for (const dir of dirs) {
            const pluginDirPath = path.join(this.pluginsPath, dir.name);
            const metadataPath = path.join(pluginDirPath, 'plugin.json');

            if (fs.existsSync(metadataPath)) {
                try {
                    const metadata: PluginMetadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
                    const dbPlugin = this.db.data.plugins?.find(p => p.id === metadata.id);
                    
                    // Merge default settings with stored values
                    const settingsValues: Record<string, any> = {};
                    metadata.settings?.forEach(s => {
                        settingsValues[s.key] = s.default;
                    });
                    
                    if (dbPlugin?.settings) {
                        Object.assign(settingsValues, dbPlugin.settings);
                    }

                    plugins.push({
                        ...metadata,
                        path: pluginDirPath,
                        enabled: dbPlugin ? dbPlugin.enabled : true,
                        settingsValues
                    });
                } catch (e) {
                    console.error(`Error loading plugin metadata at ${metadataPath}:`, e);
                }
            }
        }
        return plugins;
    }

    async updatePluginSetting(id: string, key: string, value: any): Promise<void> {
        if (!this.db.data.plugins) this.db.data.plugins = [];
        const index = this.db.data.plugins.findIndex(p => p.id === id);
        if (index !== -1) {
            if (!this.db.data.plugins[index].settings) {
                this.db.data.plugins[index].settings = {};
            }
            this.db.data.plugins[index].settings![key] = value;
        } else {
            this.db.data.plugins.push({ id, enabled: true, settings: { [key]: value } });
        }
        await this.db.write();

        // Notify loaded plugin of setting change if it has a handler
        const pluginModule = this.loadedPlugins.get(id);
        if (pluginModule && pluginModule.onSettingChange) {
            try {
                await pluginModule.onSettingChange(key, value);
            } catch (e) {
                console.error(`Error notifying plugin ${id} of setting change:`, e);
            }
        }
    }

    async togglePlugin(id: string, enabled: boolean): Promise<void> {
        if (!this.db.data.plugins) this.db.data.plugins = [];
        const index = this.db.data.plugins.findIndex(p => p.id === id);
        if (index !== -1) {
            this.db.data.plugins[index].enabled = enabled;
        } else {
            this.db.data.plugins.push({ id, enabled });
        }
        await this.db.write();
        
        if (enabled) {
            await this.loadPlugin(id);
        } else {
            // Note: True unloading of modules in Node.js/ESM is complex.
            // For now, we suggest a restart or handle 'deinit' if the plugin supports it.
            const pluginModule = this.loadedPlugins.get(id);
            if (pluginModule && pluginModule.deinit) {
                try {
                    await pluginModule.deinit();
                } catch (e) {
                    console.error(`Error deinitializing plugin ${id}:`, e);
                }
            }
            this.loadedPlugins.delete(id);
        }
    }

    async loadPlugins() {
        const plugins = await this.getPlugins();
        for (const plugin of plugins) {
            if (plugin.enabled) {
                await this.loadPlugin(plugin.id);
            }
        }
    }

    private async loadPlugin(id: string) {
        if (this.loadedPlugins.has(id)) return;

        const plugins = await this.getPlugins();
        const plugin = plugins.find(p => p.id === id);
        if (!plugin || !plugin.main) return;

        const mainPath = path.join(plugin.path, plugin.main);
        if (fs.existsSync(mainPath)) {
            try {
                // Using file:// protocol for ESM dynamic import on Windows/Unix
                const mainUrl = `file://${mainPath.replace(/\\/g, '/')}`;
                const pluginModule = await import(mainUrl);
                if (pluginModule.init) {
                    await pluginModule.init({
                        db: this.db,
                        // Future: pass an API object with restricted/wrapped methods
                    });
                }
                this.loadedPlugins.set(id, pluginModule);
                console.log(`Plugin ${id} loaded successfully`);
            } catch (e) {
                console.error(`Failed to load plugin ${id}:`, e);
            }
        }
    }
}
