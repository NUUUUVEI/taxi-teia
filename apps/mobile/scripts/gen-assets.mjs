// Generates minimal PNG placeholder assets for Expo
// Run once: node scripts/gen-assets.mjs
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

mkdirSync(join(root, 'assets'), { recursive: true })

// Minimal 1x1 PNG (black) – valid PNG binary
const pixel = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108020000009001' +
  '2e000000034944415478016360000000020001e221bc330000000049454e44ae426082',
  'hex'
)

writeFileSync(join(root, 'assets', 'icon.png'), pixel)
writeFileSync(join(root, 'assets', 'splash.png'), pixel)
writeFileSync(join(root, 'assets', 'adaptive-icon.png'), pixel)
writeFileSync(join(root, 'assets', 'favicon.png'), pixel)

console.log('Assets created in apps/mobile/assets/')
