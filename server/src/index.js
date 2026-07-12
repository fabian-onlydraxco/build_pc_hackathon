import express from 'express'
import cors from 'cors'
import { PORT, PROVIDER, OPENROUTER_MODEL } from './config.js'
import { initOpenRouter } from './llm/openrouter.js'
import { router } from './routes/runs.js'

const app = express()
app.use(cors())
app.use(express.json({ limit: '1mb' }))
app.use('/api', router)

app.listen(PORT, async () => {
  let mode
  if (PROVIDER === 'openrouter') {
    mode = `openrouter (live) · ${OPENROUTER_MODEL}`
  } else if (PROVIDER === 'claude') {
    mode = 'claude (live)'
  } else {
    mode = 'mock — no API key; add OPENROUTER_API_KEY or ANTHROPIC_API_KEY to server/.env for live mode'
  }
  console.log(`\n  Glyde AI server · http://localhost:${PORT} · provider: ${mode}\n`)

  if (PROVIDER === 'openrouter') {
    const pricing = await initOpenRouter()
    if (pricing.ok) {
      console.log(`  pricing: ${pricing.name} · $${pricing.inPerM}/M in · $${pricing.outPerM}/M out (live from OpenRouter)\n`)
    } else {
      console.log(`  pricing: ${pricing.note}\n`)
    }
  }
})
