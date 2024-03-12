import { defineConfig } from 'vitepress'
import { tasklist } from '@mdit/plugin-tasklist'
export default defineConfig({
  markdown: {
    config(md) {
      md.use(tasklist)
    }
  },
  locales: {
    root: {
      label: 'English',
      lang: 'en'
    },
    zh: {
      label: '简体中文',
      lang: 'cmn-Hans-CN',
      themeConfig: {
        nav: [
          { text: '教程', link: '/zh/guide/' },
          { text: 'API', items: [{ text: 'useStackTab', link: '/zh/api/useStackTab' }] },
          { text: '在线预览', link: 'http://www.baidu.com' },
          { text: '更新日志', link: '/zh/changelog' },
          {
            text: '代码',
            items: [
              { text: 'GitHub', link: 'https://github.com/jktantan/vue-stack-tabs.git' },
              { text: 'Gitee', link: '/zh/api/useStackTab' }
            ]
          }
        ],
        sidebar: [
          {
            text: '开始',
            items: [{ text: '简介', link: '/zh/guide/' }]
          },
          {
            text: '基础',
            items: [
              { text: '安装', link: '/zh/base/install' },
              { text: '入门', link: '/zh/base/introduction' },
              { text: 'Nuxt', link: '/zh/base/nuxt' },
              { text: '页签操作', link: '/getting-started' },
              { text: '页签规则', link: '/getting-started' },
              { text: 'Iframe页签', link: '/getting-started' }
            ]
          },
          {
            text: '基础',
            items: [
              { text: '安装', link: '/introduction' },
              { text: '入门', link: '/getting-started' },
              { text: 'Nuxt', link: '/getting-started' },
              { text: '页签操作', link: '/getting-started' },
              { text: '页签规则', link: '/getting-started' },
              { text: 'Iframe页签', link: '/getting-started' }
            ]
          }
        ],
        outline:{
          label:'在此页面'
        },
        docFooter: {
          next: '下一页',
          prev: '上一页'
        }
      }
    }
  },
  lang: 'zh-CN',
  title: 'Vue Stack Tabs',
  description: 'Vue Stack Tabs',
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
          zh: {
            translations: {
              button: {
                buttonText: '搜索文档',
                buttonAriaLabel: '搜索文档'
              },
              modal: {
                noResultsText: '无法找到相关结果',
                resetButtonTitle: '清除查询条件',
                footer: {
                  selectText: '选择',
                  navigateText: '切换',
                  closeText: '关闭'
                }
              }
            }
          }
        }
      }
    },
    nav: [{ text: 'Guide', link: '/guide/' }]
  }
})
