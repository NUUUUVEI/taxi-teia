/**
 * Runs the website against the local Supabase stack instead of the live
 * project. Start the stack first from the repo root with `supabase start`.
 *
 * Variables set here win over .env.local (next.config.mjs only fills in what
 * is missing), so the Google Maps key still comes from .env.local while every
 * booking lands in the local database.
 */
import { execSync, spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

let status
try {
  status = execSync('supabase status -o env', { cwd: root, encoding: 'utf8' })
} catch {
  console.error('Local Supabase is not running. From the repo root run: supabase start')
  process.exit(1)
}

const vars = Object.fromEntries(
  status
    .split(/\r?\n/)
    .map((line) => line.match(/^([A-Z_]+)="?(.*?)"?$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2]])
)

const env = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: vars.API_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: vars.ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: vars.SERVICE_ROLE_KEY,
  NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
}

console.log(`Website → local Supabase at ${vars.API_URL} (Studio: ${vars.STUDIO_URL})`)

const next = spawn('npx', ['next', 'dev', '-p', '3000'], {
  cwd: resolve(root, 'apps/web'),
  env,
  stdio: 'inherit',
  shell: true,
})
next.on('exit', (code) => process.exit(code ?? 0))
