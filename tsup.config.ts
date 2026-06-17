import { createRequire } from 'node:module'
import { defineConfig } from 'tsup'

const pkg = createRequire(import.meta.url)('./package.json')

export default defineConfig({
  entry: ['src/cli.ts'],
  format: 'esm',
  target: 'node18',
  clean: true,
  banner: { js: '#!/usr/bin/env node' },
  define: { __SIMGRID_VERSION__: JSON.stringify(pkg.version) },
})
