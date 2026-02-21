import { ModelTier } from '../types/index.js';

export const DEFAULT_MODELS: Record<ModelTier, string> = {
    [ModelTier.Primary]: 'claude-sonnet-4-20250514',
    [ModelTier.Secondary]: 'claude-haiku-35-20241022',
    [ModelTier.Tertiary]: 'gpt-4o-mini',
};

export function resolveModel(tier: ModelTier, agentOverride?: string): string {
    if (agentOverride && agentOverride.trim() !== '') {
        return agentOverride.trim();
    }
    return DEFAULT_MODELS[tier];
}

export function getAvailableTiers(): ModelTier[] {
    return [ModelTier.Primary, ModelTier.Secondary, ModelTier.Tertiary];
}
