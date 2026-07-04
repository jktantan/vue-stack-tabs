import eslint from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      'dist',
      'dist-ssr',
      'node_modules',
      'coverage',
      '.claude',
      '.claude/**',
      '**/.nuxt/**',
      '**/.output/**',
      '**/dist/**',
      '**/*.d.ts',
      'docs/.vitepress/cache',
      '*.config.js',
      '*.config.ts'
    ]
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.vue'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser
      },
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.vue']
      }
    },
    rules: {
      'vue/multi-word-component-names': 'off'
    }
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        ...globals.node
      }
    }
  },
  {
    files: ['playgrounds/nuxt/**/*.vue', 'playgrounds/nuxt4/**/*.vue'],
    languageOptions: {
      globals: {
        useRoute: 'readonly'
      }
    }
  },
  eslintConfigPrettier
)
