import { useEffect, useState } from "react";
import { getApi } from "../utils/mockApi";
import { useAlert } from "../hooks/useConfirm";
import type { PluginInfo, PluginSettingDefinition } from "../../types";
import { usePlugins } from "../components/PluginProvider";
import { Settings, Puzzle, CheckCircle2, XCircle, ChevronDown, ChevronUp } from "lucide-react";

export default function PluginsPage() {
    const { plugins, updatePluginSetting } = usePlugins();
    const [localPlugins, setLocalPlugins] = useState<PluginInfo[]>([]);
    const [expandedPlugin, setExpandedPlugin] = useState<string | null>(null);
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
            });
        }
    };

    const handleSettingChange = async (pluginId: string, key: string, value: unknown) => {
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
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer ml-2"
                    />
                );
            case 'password':
                return (
                    <input
                        type="password"
                        value={(value as string) || ''}
                        onChange={(e) => handleSettingChange(plugin.id, setting.key, e.target.value)}
                        className="block w-full px-3 py-1 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                );
            case 'number':
                return (
                    <input
                        type="number"
                        value={(value as number) || 0}
                        onChange={(e) => handleSettingChange(plugin.id, setting.key, Number(e.target.value))}
                        className="block w-full px-3 py-1 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                );
            default:
                return (
                    <input
                        type="text"
                        value={(value as string) || ''}
                        onChange={(e) => handleSettingChange(plugin.id, setting.key, e.target.value)}
                        className="block w-full px-3 py-1 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                );
        }
    };

    return (
        <div className="mt-4">
            <header className='pt-4 border-b border-gray-300 mx-6 mb-10 pb-2 flex items-start justify-between gap-4'>
                <div className="flex items-baseline gap-4">
                    <h2 className='text-3xl font-extrabold text-gray-900 mb-2 uppercase tracking-tight'>Plugins</h2>
                    <p className='text-gray-500 tracking-wide truncate'>
                        Manage your plugins and their settings here.
                    </p>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {localPlugins.map((plugin) => (
                            <div key={plugin.id} className="bg-white rounded-lg border border-gray-300 overflow-hidden transition-all hover:shadow-sm">
                                <div className="p-5 flex items-start justify-between">
                                    <div className="flex gap-4">
                                        <div className={`h-22 w-22 rounded-lg ${plugin.enabled ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-400'} flex items-center justify-center`}>
                                            <Puzzle className="" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-lg">{plugin.name}</h3>
                                                <span className="text-xs font-mono bg-gray-100 text-gray-500 px-4 py-1 rounded uppercase">v{plugin.version}</span>
                                            </div>
                                            <p className="text-gray-700 text-sm mt-2">{plugin.description}</p>
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
                                    <div className="flex flex-col items-end gap-4">
                                        <button
                                            onClick={() => handleToggle(plugin)}
                                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer w-full ${
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
                                                className="text-gray-400 hover:text-gray-600 bg-gray-100 transition-colors flex items-center justify-between gap-1 text-sm cursor-pointer px-4 py-2 rounded-lg text-center w-full"
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
                                                <div key={setting.key} className="w-full">
                                                    <div className="">
                                                        <label className="text-sm font-medium text-gray-700 mb-1">{setting.label}</label>
                                                        {renderSettingInput(plugin, setting)}
                                                    </div>
                                                    {setting.description && (
                                                        <p className="text-xs text-gray-400 mt-2">{setting.description}</p>
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
