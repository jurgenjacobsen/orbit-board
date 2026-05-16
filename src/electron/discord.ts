import DiscordRPC from 'discord-rpc';

const clientId = '1505150344651477083'; // Placeholder or User's Client ID

let rpc: DiscordRPC.Client | null = null;
let isReady = false;

export function initDiscordRPC() {
    rpc = new DiscordRPC.Client({ transport: 'ipc' });

    rpc.on('ready', () => {
        console.log('Discord RPC ready');
        isReady = true;
        setActivity('Idle', 'Browsing boards');
    });

    rpc.login({ clientId }).catch(err => {
        console.error('Failed to connect to Discord RPC:', err);
    });
}

export function setActivity(details: string, state: string) {
    if (!rpc || !isReady) return;

    rpc.setActivity({
        details,
        state,
        startTimestamp: new Date(),
        largeImageKey: 'icon',
        largeImageText: 'Orbit Board',
        instance: false,
    }).catch(err => {
        console.error('Failed to set Discord activity:', err);
    });
}

export function clearActivity() {
    if (!rpc || !isReady) return;
    rpc.clearActivity().catch(err => {
        console.error('Failed to clear Discord activity:', err);
    });
}
