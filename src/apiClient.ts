/**
 * API client for GitHub Models inference API
 */

export async function callInferenceApi(apiKey: string, userPrompt: string, model: string): Promise<string> {
    const payload = JSON.stringify({
        messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: userPrompt }
        ],
        model: model
    });

    try {
        const response = await fetch('https://models.inference.ai.azure.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: payload
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.statusText}`);
        }

        const json = await response.json() as any;

        // Try typical response shapes
        if (json.choices && Array.isArray(json.choices) && json.choices[0]?.message?.content) {
            return String(json.choices[0].message.content);
        }
        if (json.output && Array.isArray(json.output) && json.output[0]?.content && json.output[0].content[0]?.text) {
            return String(json.output[0].content[0].text);
        }
        if (typeof json === 'string') {
            return json;
        }
        if (json.error) {
            throw new Error(`API Error: ${json.error.message || JSON.stringify(json.error)}`);
        }

        throw new Error(`Unexpected API response format: ${JSON.stringify(json).slice(0, 200)}`);
    } catch (e) {
        throw e;
    }
}

export default {
    callInferenceApi,
};
