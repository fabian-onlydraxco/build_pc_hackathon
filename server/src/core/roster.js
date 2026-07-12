import fs from 'node:fs'
import path from 'node:path'
import { CAPS } from '../config.js'

// The CEO's standing roster: agents hired "for all projects". Every future
// company automatically staffs them into the matching department. Persisted
// so the roster survives server restarts.
const FILE = path.join(import.meta.dirname, '../fixtures/roster.json')

let roster = []
try {
  roster = JSON.parse(fs.readFileSync(FILE, 'utf8'))
} catch {
  roster = []
}

export const getRoster = () => roster

export function addToRoster(entry) {
  roster.push({
    deptKey: entry.deptKey,
    name: entry.name,
    role: entry.role,
    task: entry.task,
    persona: entry.persona || '',
  })
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true })
    fs.writeFileSync(FILE, JSON.stringify(roster, null, 2))
  } catch {
    // persistence is best-effort; the in-memory roster still applies
  }
}

const DEPT_HINTS = {
  cfo: 'financ',
  cmo: 'market',
  clo: 'legal',
  cro: 'research',
  cdo: 'develop',
}

// Mutates a freshly composed org so roster agents join the right department.
export function attachRosterHires(org) {
  if (!roster.length || !org.chiefs?.length) return org
  let total = 1 + org.chiefs.length + org.chiefs.reduce((n, c) => n + c.hires.length, 0)

  for (const [index, entry] of roster.entries()) {
    if (total >= CAPS.maxAgents) break
    const hint = DEPT_HINTS[entry.deptKey] || entry.deptKey
    const chief =
      org.chiefs.find((c) => c.id === entry.deptKey) ||
      org.chiefs.find((c) => c.title.toLowerCase().includes(hint)) ||
      org.chiefs[0]
    if (!chief || chief.hires.length >= CAPS.maxEmployeesPerChief) continue
    chief.hires.push({
      id: `${chief.id}-roster-${index}`,
      role: entry.role,
      task: entry.task,
      roster: true,
      persona: entry.persona,
      name: entry.name,
    })
    total++
  }
  return org
}
