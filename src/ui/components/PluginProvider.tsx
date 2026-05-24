import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { getApi } from '../utils/mockApi';
import type { PluginInfo } from '../../types';
import * as LucideIcons from 'lucide-react';

// Registry for plugin-contributed components
type PluginComponent = React.ComponentType<any>;

interface PluginContextType {
    plugins: PluginInfo[];
    isLoaded: boolean;
    registerComponent: (slotId: string, component: PluginComponent) => void;
    getComponents: (slotId: string) => PluginComponent[];
    updatePluginSetting: (id: string, key: string, value: any) => Promise<void>;
}

const PluginContext = createContext<PluginContextType | undefined>(undefined);

export const usePlugins = () => {
    const context = useContext(PluginContext);
    if (!context) throw new Error('usePlugins must be used within a PluginProvider');
    return context;
};

export const PluginSlot: React.FC<{ slotId: string, [key: string]: any }> = ({ slotId, ...props }) => {
    const { getComponents } = usePlugins();
    const components = getComponents(slotId);

    return (
        <>
            {components.map((Component, index) => (
                <Component key={`${slotId}-${index}`} {...props} />
            ))}
        </>
    );
};

export const PluginProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [plugins, setPlugins] = useState<PluginInfo[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [componentRegistry, setComponentRegistry] = useState<Record<string, PluginComponent[]>>({});
    const loadedScripts = useRef<Set<string>>(new Set());

    const registerComponent = useCallback((slotId: string, component: PluginComponent) => {
        setComponentRegistry(prev => {
            const current = prev[slotId] || [];
            // Use component name or a unique property to prevent duplication if possible
            // In development with StrictMode, the same function reference might be passed twice
            if (current.includes(component)) return prev;
            
            // Deduplicate by name if it's a named function
            if (component.name && current.some(c => c.name === component.name)) {
                return prev;
            }

            return {
                ...prev,
                [slotId]: [...current, component]
            };
        });
    }, []);

    const getComponents = useCallback((slotId: string) => {
        return componentRegistry[slotId] || [];
    }, [componentRegistry]);

    const updatePluginSetting = useCallback(async (id: string, key: string, value: any) => {
        const result = await getApi().updatePluginSetting(id, key, value);
        if (result.success) {
            setPlugins(prev => prev.map(p => {
                if (p.id === id) {
                    const newSettings = {
                        ...p.settingsValues,
                        [key]: value
                    };
                    return {
                        ...p,
                        settingsValues: newSettings
                    };
                }
                return p;
            }));
        }
    }, []);

    useEffect(() => {
        // Expose React and registration API to plugins
        (window as any).React = React;
        (window as any).Orbit = {
            registerComponent,
            updatePluginSetting,
            getPluginSettings: (id: string) => {
                const plugin = (window as any)._plugins?.find((p: any) => p.id === id);
                return plugin?.settingsValues || {};
            },
            Icons: LucideIcons
        };

        const initPlugins = async () => {
            const result = await getApi().getPlugins();
            if (result.success && result.data) {
                const activePlugins = result.data.filter(p => p.enabled);
                setPlugins(result.data);
                (window as any)._plugins = result.data; // Cache for getPluginSettings

                // Load renderer scripts
                for (const plugin of activePlugins) {
                    if (plugin.renderer) {
                        const scriptId = `plugin-script-${plugin.id}`;
                        if (loadedScripts.current.has(scriptId)) continue;
                        
                        try {
                            loadedScripts.current.add(scriptId);
                            const script = document.createElement('script');
                            script.id = scriptId;
                            script.src = `plugin://${plugin.id}/${plugin.renderer}?v=${Date.now()}`;
                            script.async = true;
                            script.onload = () => {
                                console.log(`Plugin renderer script loaded: ${plugin.id}`);
                                // Call plugin init if defined
                                const pluginIdClean = plugin.id.replace(/-/g, '_');
                                const pluginGlobal = (window as any)[`OrbitPlugin_${pluginIdClean}`];
                                if (pluginGlobal?.init) {
                                    pluginGlobal.init();
                                }
                            };
                            document.body.appendChild(script);
                        } catch (e) {
                            console.error(`Failed to load renderer script for plugin ${plugin.id}:`, e);
                        }
                    }
                }
            }
            setIsLoaded(true);
        };

        initPlugins();
    }, [registerComponent, updatePluginSetting]);

    return (
        <PluginContext.Provider value={{ plugins, isLoaded, registerComponent, getComponents, updatePluginSetting }}>
            {children}
        </PluginContext.Provider>
    );
};
