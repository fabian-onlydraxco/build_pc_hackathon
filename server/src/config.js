import 'dotenv/config'

export const PORT = Number(process.env.PORT || 5171)

// Provider: explicit override, else auto — Claude when a key exists, mock otherwise.
export const PROVIDER =
  process.env.LLM_PROVIDER || (process.env.ANTHROPIC_API_KEY ? 'claude' : 'mock')

export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''

// Which model runs each tier. Swap freely — only this file knows model names.
export const MODELS = {
  coo: 'claude-sonnet-5',
  chief: 'claude-sonnet-5',
  employee: 'claude-haiku-4-5-20251001',
}

// USD per million tokens — verify against current pricing before a live run.
export const PRICES = {
  'claude-sonnet-5': { inPerM: 3, outPerM: 15 },
  'claude-haiku-4-5-20251001': { inPerM: 1, outPerM: 5 },
  mock: { inPerM: 3, outPerM: 15 },
}

export const CAPS = {
  maxChiefs: 5,
  maxEmployeesPerChief: 3,
  maxAgents: 18,
  runCapUsd: 2,
  callTimeoutMs: 60_000,
  defaultChiefBudgetUsd: 0.25,
  // Used to decide whether the NEXT call would breach an envelope.
  estimatedCallUsd: 0.06,
}

export const AUTONOMY = {
  ASK_ALL: 'ask-all',
  ASK_BIG: 'ask-big',
  AUTO: 'auto',
}
