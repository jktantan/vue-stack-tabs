#!/usr/bin/env node
/**
 * 给 dist 下的声明文件补上显式扩展名。
 *
 * 背景：tsconfig.lib.json 用 module/moduleResolution = ESNext/Bundler 生成声明，
 * vite-plugin-dts 与 scripts/write-entry-dts.mjs 都会原样落盘无扩展名的相对导入。
 * 而 package.json 声明了 "type": "module"，发布后的 dist 声明文件在
 * moduleResolution = node16/nodenext 的消费者项目里会被当作 ESM 声明，
 * 相对导入必须带扩展名，否则报 TS2834；skipLibCheck 打开时更糟——
 * 解析失败被静默吞掉，export * from './model/TabModel' 一个名字都导不出来。
 *
 * 实现：用 TypeScript 编译器 API 解析每个声明文件，只改写「模块说明符」位置上的
 * 字符串字面量（import/export 声明、import('...') 类型、import x = require('...')、
 * declare module '...'），不做文本正则替换——注释与普通字符串里的示例代码不会被误伤。
 *
 * 处理规则（TypeScript 会把 './x.js' 映射到同目录的 './x.d.ts'）：
 *   './model/TabModel'      -> './model/TabModel.js'
 *   './i18n'（目录导入）     -> './i18n/index.js'
 *   '.'（组件 slot 自引用）  -> './index.js'
 *
 * 用法：
 *   node scripts/fix-dts-extensions.mjs          改写 dist（lib:build 末尾调用）
 *   node scripts/fix-dts-extensions.mjs --check   只校验不写入，缺失时以退出码 1 结束
 *
 * 保守原则：相对说明符找不到对应声明就抛错，避免悄悄发布坏产物。
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import ts from 'typescript'

const distDir = resolve(import.meta.dirname, '..', 'dist')
const checkOnly = process.argv.includes('--check')

const DECLARATION_EXTENSIONS = ['.d.ts', '.d.mts', '.d.cts']
const IMPORT_EXTENSION = { '.d.ts': '.js', '.d.mts': '.mjs', '.d.cts': '.cjs' }
// 已经带扩展名的说明符保持原样
const EXPLICIT_EXTENSION_RE = /[.](?:js|mjs|cjs|jsx|ts|mts|cts|tsx|json|vue)$/

function isDeclarationFileName(name) {
  return DECLARATION_EXTENSIONS.some((extension) => name.endsWith(extension))
}

function collectDeclarationFiles(dir) {
  const files = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...collectDeclarationFiles(fullPath))
    else if (isDeclarationFileName(entry.name)) files.push(fullPath)
  }
  return files
}

/**
 * 收集文件里所有「模块说明符」字符串字面量节点（只保留相对说明符）。
 */
function collectModuleSpecifiers(sourceFile) {
  const specifiers = []

  const push = (node) => {
    if (node && ts.isStringLiteral(node) && node.text.startsWith('.')) specifiers.push(node)
  }

  const visit = (node) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      push(node.moduleSpecifier)
    } else if (ts.isExternalModuleReference(node)) {
      // import x = require('./x')
      push(node.expression)
    } else if (ts.isModuleDeclaration(node)) {
      // declare module './x' { ... }
      push(node.name)
    } else if (ts.isImportTypeNode(node)) {
      // import('./x').Foo 与 typeof import('./x')
      if (ts.isLiteralTypeNode(node.argument)) push(node.argument.literal)
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      push(node.arguments[0])
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return specifiers
}

/**
 * 把一条相对说明符改写成显式形式；已经是显式形式时返回 null。
 */
function toExplicitSpecifier(filePath, specifier) {
  if (EXPLICIT_EXTENSION_RE.test(specifier)) return null

  const isRoot = specifier === '.'
  const basePath = isRoot ? distDir : resolve(dirname(filePath), specifier)
  const bareSpecifier = specifier.replace(/\/+$/, '')

  // 指向具体声明文件
  for (const declarationExtension of DECLARATION_EXTENSIONS) {
    if (existsSync(basePath + declarationExtension)) {
      return bareSpecifier + IMPORT_EXTENSION[declarationExtension]
    }
  }

  // 指向目录下的 index 声明
  for (const declarationExtension of DECLARATION_EXTENSIONS) {
    const indexFileName = 'index' + declarationExtension
    if (existsSync(join(basePath, indexFileName))) {
      const importName = 'index' + IMPORT_EXTENSION[declarationExtension]
      return isRoot ? './' + importName : bareSpecifier + '/' + importName
    }
  }

  throw new Error(
    '未找到声明文件：' +
      relative(distDir, filePath) +
      ' 里的 ' +
      specifier +
      '（解析为 ' +
      basePath +
      '）'
  )
}

/**
 * 读取字面量在源码中的原文（去掉两侧引号），用于保真替换与校验。
 */
function readLiteralText(source, literal, sourceFile) {
  return source.slice(literal.getStart(sourceFile) + 1, literal.getEnd() - 1)
}

/**
 * 计算一个声明文件需要的替换；返回空数组表示已经合规。
 */
function planEdits(filePath, source) {
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  )
  const edits = []

  for (const literal of collectModuleSpecifiers(sourceFile)) {
    const raw = readLiteralText(source, literal, sourceFile)
    const explicit = toExplicitSpecifier(filePath, raw)
    if (!explicit || explicit === raw) continue
    edits.push({
      start: literal.getStart(sourceFile) + 1,
      end: literal.getEnd() - 1,
      text: explicit,
      raw
    })
  }

  // 从后往前替换，避免偏移漂移
  edits.sort((a, b) => b.start - a.start)
  return edits
}

function applyEdits(source, edits) {
  let next = source
  for (const edit of edits) {
    next = next.slice(0, edit.start) + edit.text + next.slice(edit.end)
  }
  return next
}

function findBareRelativeSpecifiers(files) {
  const remaining = []
  for (const filePath of files) {
    const source = readFileSync(filePath, 'utf8')
    const sourceFile = ts.createSourceFile(
      filePath,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS
    )
    for (const literal of collectModuleSpecifiers(sourceFile)) {
      const raw = readLiteralText(source, literal, sourceFile)
      if (!EXPLICIT_EXTENSION_RE.test(raw)) {
        remaining.push(relative(distDir, filePath) + ' -> ' + raw)
      }
    }
  }
  return remaining
}

if (!existsSync(distDir)) {
  throw new Error('dist 不存在，请先执行打包步骤：' + distDir)
}

const declarationFiles = collectDeclarationFiles(distDir)
const pending = []

for (const filePath of declarationFiles) {
  const source = readFileSync(filePath, 'utf8')
  const edits = planEdits(filePath, source)
  if (edits.length === 0) continue
  pending.push({ filePath, edits })
  if (!checkOnly) writeFileSync(filePath, applyEdits(source, edits))
}

if (checkOnly) {
  if (pending.length === 0) {
    console.log('d.ts 扩展名检查通过：' + declarationFiles.length + ' 个声明文件均使用显式扩展名')
    process.exit(0)
  }
  const specifierCount = pending.reduce((total, item) => total + item.edits.length, 0)
  console.error(
    'd.ts 扩展名检查未通过：' +
      pending.length +
      ' 个文件、共 ' +
      specifierCount +
      ' 处相对说明符缺少扩展名'
  )
  for (const item of pending) {
    console.error(
      '  ' + relative(distDir, item.filePath) + ': ' + item.edits.map((edit) => edit.raw).join(', ')
    )
  }
  process.exit(1)
}

const remaining = findBareRelativeSpecifiers(declarationFiles)
if (remaining.length > 0) {
  throw new Error('仍有未补扩展名的相对导入：\n  ' + remaining.join('\n  '))
}

const changedFiles = pending.length
const changedSpecifiers = pending.reduce((total, item) => total + item.edits.length, 0)

console.log(
  'd.ts 扩展名修正完成：' +
    changedFiles +
    '/' +
    declarationFiles.length +
    ' 个文件，共 ' +
    changedSpecifiers +
    ' 处说明符'
)
