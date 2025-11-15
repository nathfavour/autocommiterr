import { BunFile } from 'bun';

export interface ModelInfo {
    id: string;
    name: string;
    friendly_name?: string;
    publisher?: string;
    summary?: string;
    task?: string;
    tags?: string[];
}

// Curated list of common chat-completion models for defaults
const DEFAULT_MODELS: ModelInfo[] = [
    { id: 'gpt-4o-mini', name: 'gpt-4o-mini', friendly_name: 'OpenAI GPT-4o mini', summary: 'Fast & cost-effective, great for most tasks', publisher: 'Azure OpenAI Service' },
    { id: 'gpt-4o', name: 'gpt-4o', friendly_name: 'OpenAI GPT-4o', summary: 'High quality, most capable model', publisher: 'Azure OpenAI Service' },
    { id: 'Phi-3-mini-128k-instruct', name: 'Phi-3-mini-128k-instruct', friendly_name: 'Phi-3 mini 128k', summary: 'Lightweight, efficient open model', publisher: 'Microsoft' },
    { id: 'Mistral-large', name: 'Mistral-large', friendly_name: 'Mistral Large', summary: 'Powerful open-source model', publisher: 'Mistral AI' },
];

/**
 * Fetch available models from GitHub Models API
 */
export async function fetchAvailableModels(apiKey: string): Promise<ModelInfo[]> {
    try {
        const response = await fetch('https://models.inference.ai.azure.com/models', {
            method: 'GET',
            headers: {
                'Accept': 'application/vnd.github+json',
                'Authorization': `Bearer ${apiKey}`,
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });

        if (!response.ok) {
            console.error(`Failed to fetch models: ${response.statusText}`);
            return DEFAULT_MODELS;
        }

        const json = await response.json();
        if (Array.isArray(json)) {
            const models = json
                .filter((m: any) => m.id && m.name && m.task === 'chat-completion')
                .map((m: any) => ({
                    id: m.name,
                    name: m.name,
                    friendly_name: m.friendly_name || m.name,
                    publisher: m.publisher,
                    summary: m.summary,
                    task: m.task,
                    tags: m.tags
                }));
            return models.length > 0 ? models : DEFAULT_MODELS;
        }
    } catch (e) {
        console.error('Autocommiter: failed to fetch models', e);
    }
    return DEFAULT_MODELS;
}

/**
 * Get config directory path for storing settings
 */
function getConfigDir(): string {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '/tmp';
    return `${homeDir}/.autocommiter`;
}

/**
 * Get cached models from disk
 */
export async function getCachedModels(): Promise<ModelInfo[]> {
    try {
        const configDir = getConfigDir();
        const modelsFile = Bun.file(`${configDir}/models.json`);
        
        if (await modelsFile.exists()) {
            const cached = await modelsFile.json();
            return Array.isArray(cached) ? cached : DEFAULT_MODELS;
        }
    } catch (e) {
        console.error('Autocommiter: failed to read cached models', e);
    }
    return DEFAULT_MODELS;
}

/**
 * Update cached models on disk
 */
export async function updateCachedModels(models: ModelInfo[]): Promise<void> {
    try {
        const configDir = getConfigDir();
        await Bun.write(`${configDir}/models.json`, JSON.stringify(models, null, 2));
    } catch (e) {
        console.error('Autocommiter: failed to cache models', e);
    }
}

/**
 * Get selected model ID from config
 */
export async function getSelectedModelId(): Promise<string> {
    try {
        const configDir = getConfigDir();
        const configFile = Bun.file(`${configDir}/config.json`);
        
        if (await configFile.exists()) {
            const config = await configFile.json();
            return config.selectedModel || 'gpt-4o-mini';
        }
    } catch (e) {
        console.error('Autocommiter: failed to read config', e);
    }
    return 'gpt-4o-mini';
}

/**
 * Set selected model ID in config
 */
export async function setSelectedModelId(modelId: string): Promise<void> {
    try {
        const configDir = getConfigDir();
        let config: any = {};
        
        try {
            const configFile = Bun.file(`${configDir}/config.json`);
            if (await configFile.exists()) {
                config = await configFile.json();
            }
        } catch { }
        
        config.selectedModel = modelId;
        await Bun.write(`${configDir}/config.json`, JSON.stringify(config, null, 2));
    } catch (e) {
        console.error('Autocommiter: failed to write config', e);
    }
}

/**
 * Get the API key from config
 */
export async function getApiKey(): Promise<string | null> {
    try {
        const configDir = getConfigDir();
        const configFile = Bun.file(`${configDir}/config.json`);
        
        if (await configFile.exists()) {
            const config = await configFile.json();
            return config.apiKey || null;
        }
    } catch (e) {
        console.error('Autocommiter: failed to read API key', e);
    }
    return null;
}

/**
 * Set the API key in config
 */
export async function setApiKey(apiKey: string): Promise<void> {
    try {
        const configDir = getConfigDir();
        let config: any = {};
        
        try {
            const configFile = Bun.file(`${configDir}/config.json`);
            if (await configFile.exists()) {
                config = await configFile.json();
            }
        } catch { }
        
        config.apiKey = apiKey;
        await Bun.write(`${configDir}/config.json`, JSON.stringify(config, null, 2));
    } catch (e) {
        console.error('Autocommiter: failed to write API key', e);
    }
}

/**
 * Get gitmoji enabled setting
 */
export async function getGitmojiEnabled(): Promise<boolean> {
    try {
        const configDir = getConfigDir();
        const configFile = Bun.file(`${configDir}/config.json`);
        
        if (await configFile.exists()) {
            const config = await configFile.json();
            return config.enableGitmoji === true;
        }
    } catch (e) {
        console.error('Autocommiter: failed to read gitmoji setting', e);
    }
    return false;
}

/**
 * Set gitmoji enabled setting
 */
export async function setGitmojiEnabled(enabled: boolean): Promise<void> {
    try {
        const configDir = getConfigDir();
        let config: any = {};
        
        try {
            const configFile = Bun.file(`${configDir}/config.json`);
            if (await configFile.exists()) {
                config = await configFile.json();
            }
        } catch { }
        
        config.enableGitmoji = enabled;
        await Bun.write(`${configDir}/config.json`, JSON.stringify(config, null, 2));
    } catch (e) {
        console.error('Autocommiter: failed to write gitmoji setting', e);
    }
}

export default {
    fetchAvailableModels,
    getCachedModels,
    updateCachedModels,
    getSelectedModelId,
    setSelectedModelId,
    getApiKey,
    setApiKey,
    getGitmojiEnabled,
    setGitmojiEnabled,
};
