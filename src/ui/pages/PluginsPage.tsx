import { useEffect, useState } from "react";
import { getApi } from "../utils/mockApi";
import { useConfirm, useAlert } from "../hooks/useConfirm";
import type { PluginInfo, PluginSettingDefinition } from "../../types";
import { usePlugins } from "../components/PluginProvider";
import { Settings, Puzzle, CheckCircle2, XCircle, ChevronDown, ChevronUp } from "lucide-react";

export default function PluginsPage() {
    const { plugins, updatePluginSetting } = usePlugins();
    const [localPlugins, setLocalPlugins] = useState<PluginInfo[]>([]);
    const [expandedPlugin, setExpandedPlugin] = useState<string | null>(null);
    const confirm = useConfirm();
    const alert = useAlert();

    useEffect(() => {
        setLocalPlugins(plugins);
    }, [plugins]);

    const handleToggle = async (plugin: PluginInfo) => {
        const result = await getApi().togglePlugin(plugin.id, !plugin.enabled);
        if (result.success) {
            setLocalPlugins(prev => prev.map(p => 
                p.id === plugin.id ? { ...p, enabled: !p.enabled } : p
            ));
        } else {
            alert({
                title: 'Error',
                message: `Failed to ${plugin.enabled ? 'disable' : 'enable'} plugin: ${result.error}`,
                type: 'error'
            });
        }
    };

    const handleSettingChange = async (pluginId: string, key: string, value: any) => {
        await updatePluginSetting(pluginId, key, value);
    };

    const renderSettingInput = (plugin: PluginInfo, setting: PluginSettingDefinition) => {
        const value = plugin.settingsValues?.[setting.key] ?? setting.default;

        switch (setting.type) {
            case 'boolean':
                return (
                    <input
                        type="checkbox"
                        checked={!!value}
                        onChange={(e) => handleSettingChange(plugin.id, setting.key, e.target.checked)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                );
            case 'password':
                return (
                    <input
                        type="password"
                        value={value || ''}
                        onChange={(e) => handleSettingChange(plugin.id, setting.key, e.target.value)}
                        className="block w-full px-3 py-1 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                );
            case 'number':
                return (
                    <input
                        type="number"
                        value={value || 0}
                        onChange={(e) => handleSettingChange(plugin.id, setting.key, Number(e.target.value))}
                        className="block w-full px-3 py-1 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                );
            default:
                return (
                    <input
                        type="text"
                        value={value || ''}
                        onChange={(e) => handleSettingChange(plugin.id, setting.key, e.target.value)}
                        className="block w-full px-3 py-1 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                );
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50">
            <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Puzzle className="h-6 w-6 text-indigo-600" />
                    <h2 className="text-xl font-bold text-gray-900">Plugins</h2>
                </div>
            </header>

            <main className="flex-1 overflow-auto p-6">
                {localPlugins.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border-2 border-dashed border-gray-300">
                        <Puzzle className="h-12 w-12 text-gray-400 mb-2" />
                        <p className="text-gray-500 font-medium">No plugins found</p>
                        <p className="text-gray-400 text-sm">Plugins should be placed in the plugins folder.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 max-w-4xl mx-auto">
                        {localPlugins.map((plugin) => (
                            <div key={plugin.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
                                <div className="p-5 flex items-start justify-between">
                                    <div className="flex gap-4">
                                        <div className={`p-3 rounded-lg ${plugin.enabled ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>
                                            <Puzzle className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-gray-900 text-lg">{plugin.name}</h3>
                                                <span className="text-xs font-mono bg-gray-100 text-gray-500 px-2 py-0.5 rounded uppercase">v{plugin.version}</span>
                                            </div>
                                            <p className="text-gray-600 text-sm mt-1">{plugin.description}</p>
                                            <div className="flex items-center gap-4 mt-3">
                                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                                    Author: <span className="text-gray-600">{plugin.author || 'Unknown'}</span>
                                                </span>
                                                {plugin.enabled && (
                                                    <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                                                        <CheckCircle2 className="h-3 w-3" /> Active
                                                    </span>
                                                )}
                                                {!plugin.enabled && (
                                                    <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                                                        <XCircle className="h-3 w-3" /> Disabled
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-3">
                                        <button
                                            onClick={() => handleToggle(plugin)}
                                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                                                plugin.enabled 
                                                ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                                                : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                            }`}
                                        >
                                            {plugin.enabled ? 'Disable' : 'Enable'}
                                        </button>
                                        
                                        {plugin.settings && plugin.settings.length > 0 && (
                                            <button 
                                                onClick={() => setExpandedPlugin(expandedPlugin === plugin.id ? null : plugin.id)}
                                                className="text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1 text-sm"
                                            >
                                                <Settings className="h-4 w-4" />
                                                Settings
                                                {expandedPlugin === plugin.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {expandedPlugin === plugin.id && plugin.settings && (
                                    <div className="bg-gray-50 border-t border-gray-100 p-5 animate-in slide-in-from-top duration-200">
                                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Plugin Configuration</h4>
                                        <div className="space-y-4">
                                            {plugin.settings.map((setting) => (
                                                <div key={setting.key} className="flex flex-col gap-1.5">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-sm font-medium text-gray-700">{setting.label}</label>
                                                        {renderSettingInput(plugin, setting)}
                                                    </div>
                                                    {setting.description && (
                                                        <p className="text-xs text-gray-400">{setting.description}</p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
