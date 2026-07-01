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
