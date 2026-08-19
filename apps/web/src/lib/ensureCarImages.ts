import { copyFileSync, existsSync, mkdirSync } from 'fs'
import { resolve } from 'path'

const SRC = 'C:/Users/immar/.cursor/projects/empty-window/assets'
const DEST = resolve(process.cwd(), 'public/images/car')

const FILES: [string, string][] = [
  ['corolla-overview.png', 'overview.png'],
  ['corolla-trunk.png', 'trunk.png'],
  ['corolla-doors.png', 'doors.png'],
  ['corolla-engine.png', 'engine.png'],
]

export function ensureCarImages() {
  if (typeof window !== 'undefined') return
  mkdirSync(DEST, { recursive: true })
  for (const [srcName, destName] of FILES) {
    const from = resolve(SRC, srcName)
    const to = resolve(DEST, destName)
    if (existsSync(from)) copyFileSync(from, to)
  }
}

ensureCarImages()
