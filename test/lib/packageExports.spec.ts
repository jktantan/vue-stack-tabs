/// <reference types="node" />

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

interface PackageExportEntry {
  types?: string
  import?: string
  default?: string
  require?: string
}

interface PackageJsonShape {
  type?: string
  main?: string
  module?: string
  typings?: string
  exports?: Record<string, string | PackageExportEntry>
}

const readPackageJson = (): PackageJsonShape =>
  JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as PackageJsonShape

describe('package exports', () => {
  it('root export is ESM-only and does not advertise CommonJS require', () => {
    const pkg = readPackageJson()
    const rootExport = pkg.exports?.['.'] as PackageExportEntry

    expect(pkg.type).toBe('module')
    expect(rootExport.import).toBe('./dist/vue-stack-tabs.es.js')
    expect(rootExport.types).toBe('./dist/index.d.ts')
    expect(rootExport.require).toBeUndefined()
    expect(pkg.main).toBe('./dist/vue-stack-tabs.es.js')
    expect(pkg.module).toBe('./dist/vue-stack-tabs.es.js')
  })

  it('packaged smoke script resolves exports from an isolated temp package directory', () => {
    const script = readFileSync(join(process.cwd(), 'scripts', 'verify-packaged.mjs'), 'utf8')

    expect(script).toContain("fs.mkdtempSync(join(tmpdir(), 'vue-stack-tabs-packaged-'))")
    expect(script).toContain("join(tempProjectDir, 'node_modules', 'vue-stack-tabs')")
    expect(script).toContain('./node_modules/vue-stack-tabs/package.json')
    expect(script).toContain('await runNodeScript(')
    expect(script).toContain('tempProjectDir')
  })

  it('packaged smoke script verifies root, iframe, Nuxt module, and Nuxt runtime ESM imports', () => {
    const script = readFileSync(join(process.cwd(), 'scripts', 'verify-packaged.mjs'), 'utf8')

    expect(script).toContain("await import('vue-stack-tabs')")
    expect(script).toContain("await import('vue-stack-tabs/iframe-bridge')")
    expect(script).toContain("await import('vue-stack-tabs/nuxt')")
    expect(script).toContain(
      "await import('./node_modules/vue-stack-tabs/dist/nuxt/runtime/plugin.mjs')"
    )
  })

  it('exposes side-effect-free iframe bridge and dist Nuxt module subpaths', () => {
    const pkg = readPackageJson()
    const iframeBridgeExport = pkg.exports?.['./iframe-bridge'] as PackageExportEntry
    const nuxtExport = pkg.exports?.['./nuxt'] as PackageExportEntry

    expect(iframeBridgeExport).toEqual({
      types: './dist/iframe-bridge.d.ts',
      import: './dist/iframe-bridge.mjs'
    })
    expect(nuxtExport).toEqual({
      types: './dist/nuxt/module.d.ts',
      import: './dist/nuxt/module.mjs'
    })
  })
})
