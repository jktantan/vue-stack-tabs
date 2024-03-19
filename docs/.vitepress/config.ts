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
          // { text: '在线预览', link: 'http://www.baidu.com' },
          // { text: '更新日志', link: '/zh/changelog' },
          {
            text: '代码',
            items: [
              { text: 'GitHub', link: 'https://github.com/jktantan/vue-stack-tabs.git' },
              { text: 'Gitee', link: 'https://gitee.com/jktantan/vue-stack-tabs' }
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
              { text: '滚动位置', link: '/zh/advance/scroll' }
            ]
          },
          {
            text: '更多',
            items: [
              { text: '配置属性', link: '/zh/more/properties' },
              { text: 'useStackTab', link: '/zh/more/useStackTab' },
              { text: 'useTabLoading', link: '/zh/more/useTabLoading' },
              { text: 'useTabRouter', link: '/zh/more/useTabRouter' }
            ]
          }
        ],
        outline: {
          label: '在此页面'
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
