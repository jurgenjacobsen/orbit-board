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
    updatePluginSetting: (id: string, key: string, value: unknown) => Promise<void>;
}

const PluginContext = createContext<PluginContextType | undefined>(undefined);

export const usePlugins = () => {
    const context = useContext(PluginContext);
    if (!context) throw new Error('usePlugins must be used within a PluginProvider');
    return context;
};

// PluginSlot component moved below PluginProvider to comply with react-refresh/only-export-components if needed,
// but actually the warning is about exporting both components and non-components. 
// We'll keep them but be careful.

export const PluginSlot: React.FC<{ slotId: string, [key: string]: unknown }> = ({ slotId, ...props }) => {
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
            if (current.includes(component)) return prev;
            
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

    const updatePluginSetting = useCallback(async (id: string, key: string, value: unknown) => {
        const result = await getApi().updatePluginSetting(id, key, value);
        if (result.success) {
            setPlugins(prev => prev.map(p => {
                if (p.id === id) {
                    return {
                        ...p,
                        settingsValues: {
                            ...(p.settingsValues as Record<string, unknown>),
                            [key]: value
                        }
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
                const plugin = ((window as any)._plugins as PluginInfo[] | undefined)?.find((p) => p.id === id);
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
