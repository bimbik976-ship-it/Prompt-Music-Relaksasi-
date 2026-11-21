import { MODEL_CONFIG, ChatModelOption, ModelProvider } from '../config/models';
import { ApiKeyManager } from './apiKeyManager';

export async function loadAvailableChatModels(): Promise<ChatModelOption[]> {
  const fallback = Object.values(MODEL_CONFIG);
  const key = ApiKeyManager.getInstance().getActiveKeys()[0]?.rawKey;
  if (!key) return fallback;
  try {
    const response = await fetch('/api/kie/models', { headers: { Authorization: `Bearer ${key}` } });
    if (!response.ok) return fallback;
    const payload = await response.json();
    if (!Array.isArray(payload?.data)) return fallback;
    const discovered: ChatModelOption[] = payload.data.map((item: any) => {
      const provider = item.provider as ModelProvider;
      const known = MODEL_CONFIG[item.id];
      return known || {
        gatewayId: item.id,
        uiName: item.name || item.id,
        description: `${provider} model dari katalog aktif KIE.ai.`,
        provider,
        accent: provider === 'OpenAI' ? 'blue' : provider === 'Gemini' ? 'violet' : 'emerald'
      };
    }).filter((item: ChatModelOption) => item.gatewayId && ['OpenAI', 'Gemini', 'Claude'].includes(item.provider));
    // Retain the current app's three GPT aliases if KIE's live list omits them.
    const merged = [...discovered];
    for (const id of ['gpt-6-astra', 'gpt-5-6-luna', 'gpt-5-5']) {
      if (!merged.some((item) => item.gatewayId === id)) merged.push(MODEL_CONFIG[id]);
    }
    return merged;
  } catch { return fallback; }
}
