import { defineConfig } from 'vitepress'
import { tasklist } from '@mdit/plugin-tasklist'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  base: '/vue-stack-tabs/',
  vite: {
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('../../src', import.meta.url))
      }
    },
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler'
        }
      }
    }
  },
  markdown: {
    config(md) {
      md.use(tasklist)
    }
  },
  locales: {
    root: {
      label: 'English',
      lang: 'en',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/guide/' },
          { text: 'Demo', link: '/demo' },
          {
            text: 'Links',
            items: [
              { text: 'GitHub', link: 'https://github.com/jktantan/vue-stack-tabs' },
              { text: 'Gitee', link: 'https://gitee.com/jktantan/vue-stack-tabs' }
            ]
          }
        ],
        sidebar: [
          { text: 'Getting Started', items: [{ text: 'Introduction', link: '/guide/' }] },
          {
            text: 'Basics',
            items: [
              { text: 'Installation', link: '/base/install' },
              { text: 'Getting Started', link: '/base/introduction' },
              { text: 'Nuxt', link: '/base/nuxt' },
              { text: 'Tab Operations', link: '/base/tab' },
              { text: 'In-Tab Operations', link: '/base/operator' }
            ]
          },
          {
            text: 'Advanced',
            items: [
              { text: 'Transitions', link: '/advance/transition' },
              { text: 'Custom Slots', link: '/advance/slot' },
              { text: 'Initial Tabs', link: '/advance/initial' },
              { text: 'i18n', link: '/advance/language' },
              { text: 'Scroll Position', link: '/advance/scroll' },
              { text: 'iframe Bridge', link: '/advance/iframe-bridge' }
            ]
          },
          {
            text: 'Reference',
            items: [
              { text: 'Props', link: '/more/properties' },
              { text: 'useTabActions', link: '/more/useTabActions' },
              { text: 'useTabLoading', link: '/more/useTabLoading' },
              { text: 'useTabRouter', link: '/more/useTabRouter' }
            ]
          },
          { text: 'Live Demo', link: '/demo' }
        ]
      }
    },
    zh: {
      label: '简体中文',
      lang: 'zh-CN',
      themeConfig: {
        nav: [
          { text: '教程', link: '/zh/guide/' },
          { text: '演示', link: '/zh/demo' },
          {
            text: '链接',
            items: [
              { text: 'GitHub', link: 'https://github.com/jktantan/vue-stack-tabs' },
              { text: 'Gitee', link: 'https://gitee.com/jktantan/vue-stack-tabs' }
            ]
          }
        ],
        sidebar: [
          { text: '开始', items: [{ text: '简介', link: '/zh/guide/' }] },
          {
            text: '基础',
            items: [
              { text: '安装', link: '/zh/base/install' },
              { text: '入门', link: '/zh/base/introduction' },
              { text: 'Nuxt', link: '/zh/base/nuxt' },
              { text: '页签操作', link: '/zh/base/tab' },
              { text: '签内操作', link: '/zh/base/operator' }
            ]
          },
          {
            text: '进阶',
            items: [
              { text: '过渡效果', link: '/zh/advance/transition' },
              { text: '自定义插槽', link: '/zh/advance/slot' },
              { text: '初始化页签', link: '/zh/advance/initial' },
              { text: '国际化', link: '/zh/advance/language' },
              { text: '滚动位置', link: '/zh/advance/scroll' },
              { text: 'iframe 通信', link: '/zh/advance/iframe-bridge' }
            ]
          },
          {
            text: '参考',
            items: [
              { text: '配置属性', link: '/zh/more/properties' },
              { text: 'useTabActions', link: '/zh/more/useTabActions' },
              { text: 'useTabLoading', link: '/zh/more/useTabLoading' },
              { text: 'useTabRouter', link: '/zh/more/useTabRouter' }
            ]
          },
          { text: '在线演示', link: '/zh/demo' }
        ],
        outline: { label: '在此页面' },
        docFooter: { next: '下一页', prev: '上一页' }
      }
    }
  },
  title: 'Vue Stack Tabs',
  description: 'A multi-tab management library for Vue 3 and Vue Router',
  head: [['link', { rel: 'icon', href: '/img/logo.svg' }]],
  themeConfig: {
    logo: '/img/logo.svg',
    footer: {
      message: 'Released under the Apache License.',
      copyright: 'Copyright © 2024-present tantan'
    },
    search: {
      provider: 'local',
      options: {
        locales: {
          en: {
            translations: {
              button: { buttonText: 'Search', buttonAriaLabel: 'Search' },
              modal: {
                noResultsText: 'No results found',
                resetButtonTitle: 'Reset',
                footer: { selectText: 'Select', navigateText: 'Navigate', closeText: 'Close' }
              }
            }
          },
          zh: {
            translations: {
              button: { buttonText: '搜索文档', buttonAriaLabel: '搜索文档' },
              modal: {
                noResultsText: '无法找到相关结果',
                resetButtonTitle: '清除查询条件',
                footer: { selectText: '选择', navigateText: '切换', closeText: '关闭' }
              }
            }
          }
        }
      }
    }
  }
})
