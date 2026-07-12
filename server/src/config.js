import 'dotenv/config'

export const PORT = Number(process.env.PORT || 5171)

export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''
export const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || ''
export const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-oss-120b:free'

// Provider: explicit override, else auto — OpenRouter when its key exists,
// then Claude, then the keyless mock.
export const PROVIDER =
  process.env.LLM_PROVIDER ||
  (OPENROUTER_API_KEY ? 'openrouter' : ANTHROPIC_API_KEY ? 'claude' : 'mock')

// Which model runs each tier. Swap freely — only this file knows model names.
export const MODELS =
  PROVIDER === 'openrouter'
    ? { coo: OPENROUTER_MODEL, chief: OPENROUTER_MODEL, employee: OPENROUTER_MODEL }
    : {
        coo: 'claude-sonnet-5',
        chief: 'claude-sonnet-5',
        employee: 'claude-haiku-4-5-20251001',
      }

// USD per million tokens. OpenRouter entries are refreshed from the live
// pricing API at boot (see llm/openrouter.js) — these are only fallbacks.
export const PRICES = {
  'claude-sonnet-5': { inPerM: 3, outPerM: 15 },
  'claude-haiku-4-5-20251001': { inPerM: 1, outPerM: 5 },
  [OPENROUTER_MODEL]: { inPerM: 0.325, outPerM: 1.95 },
  mock: { inPerM: 3, outPerM: 15 },
}

export const CAPS = {
  maxChiefs: 5,
  maxEmployeesPerChief: 3,
  maxAgents: 18,
  runCapUsd: 2,
  callTimeoutMs: 240_000,
  defaultChiefBudgetUsd: 0.25,
  // Used to decide whether the NEXT call would breach an envelope — scaled to
  // the provider's realistic per-call cost so reservations don't cry wolf.
  estimatedCallUsd: Number(process.env.ESTIMATED_CALL_USD) || (PROVIDER === 'openrouter' ? 0.005 : 0.06),
}

export const AUTONOMY = {
  ASK_ALL: 'ask-all',
  ASK_BIG: 'ask-big',
  AUTO: 'auto',
}
