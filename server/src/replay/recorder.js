import fs from 'node:fs'
import path from 'node:path'

const FIXTURE_DIR = path.join(import.meta.dirname, '../fixtures')

const safeName = (name) => String(name).toLowerCase().replace(/[^a-z0-9-]/g, '-') || 'golden-run'

export function saveFixture(run, name = 'golden-run') {
  fs.mkdirSync(FIXTURE_DIR, { recursive: true })
  const file = path.join(FIXTURE_DIR, `${safeName(name)}.json`)
  const fixture = {
    name: safeName(name),
    savedAt: new Date().toISOString(),
    idea: run.idea,
    capUsd: run.capUsd,
    events: run.bus.log,
  }
  fs.writeFileSync(file, JSON.stringify(fixture))
  return { file, events: fixture.events.length }
}

export function loadFixture(name = 'golden-run') {
  const file = path.join(FIXTURE_DIR, `${safeName(name)}.json`)
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

export function listFixtures() {
  if (!fs.existsSync(FIXTURE_DIR)) return []
  return fs
    .readdirSync(FIXTURE_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''))
    .filter((name) => name !== 'roster') // the standing roster is not a replay
}
