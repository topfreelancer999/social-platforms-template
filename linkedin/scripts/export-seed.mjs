import { writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

async function main() {
  const seedPath = pathToFileURL(join(root, 'src/mocks/seed/index.ts')).href
  const { initialSeed } = await import(seedPath)
  const out = join(root, '..', 'linkedin-api', 'data', 'seed.json')
  writeFileSync(out, JSON.stringify(initialSeed, null, 2))
  console.log('Wrote', out)
}

main().catch(console.error)
