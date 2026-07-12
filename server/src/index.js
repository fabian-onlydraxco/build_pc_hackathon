import express from 'express'
import cors from 'cors'
import { PORT, PROVIDER } from './config.js'
import { router } from './routes/runs.js'

const app = express()
app.use(cors())
app.use(express.json({ limit: '1mb' }))
app.use('/api', router)

app.listen(PORT, () => {
  const mode =
    PROVIDER === 'claude'
      ? 'claude (live)'
      : 'mock — no API key; add ANTHROPIC_API_KEY to server/.env for live mode'
  console.log(`\n  Glyde AI server · http://localhost:${PORT} · provider: ${mode}\n`)
})
