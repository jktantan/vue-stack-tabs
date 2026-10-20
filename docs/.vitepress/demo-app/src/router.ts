/**
 * 演示应用路由。
 *
 * 与真实业务应用一致：history 模式（为了能在静态托管下直接刷新任意路径，
 * 这里使用 hash 模式，见文件末尾说明）。
 * `/iframe` 是 vue-stack-tabs 要求的 iframe 占位路由。
 */
import { createRouter, createWebHashHistory } from 'vue-router'
import { IFrame } from 'vue-stack-tabs'
import Shell from './Shell.vue'
import HomePage from './pages/HomePage.vue'
import ReportPage from './pages/ReportPage.vue'
import DetailPage from './pages/DetailPage.vue'
import FormPage from './pages/FormPage.vue'
import ScrollPage from './pages/ScrollPage.vue'
import NoticePage from './pages/NoticePage.vue'
import LoadingPage from './pages/LoadingPage.vue'
import NotFoundPage from './pages/NotFoundPage.vue'

export const router = createRouter({
  // hash 模式：演示站点部署在静态托管（GitHub Pages / Gitee Pages）上，
  // 无法为 `{base}demo/xxx` 提供 history fallback，hash 可保证任意路径直接刷新可用。
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      component: Shell,
      children: [
        { path: '', name: 'home', component: HomePage },
        { path: 'report', name: 'report', component: ReportPage },
        { path: 'report/:id', name: 'report-detail', component: DetailPage },
        { path: 'form', name: 'form', component: FormPage },
        { path: 'scroll', name: 'scroll', component: ScrollPage },
        { path: 'notice', name: 'notice', component: NoticePage },
        { path: 'loading', name: 'loading', component: LoadingPage },
        // iframe 占位路由：与 <VueStackTabs iframe-path="/iframe"> 保持一致
        { path: 'iframe', name: 'iframe', component: IFrame },
        { path: ':pathMatch(.*)*', name: 'not-found', component: NotFoundPage }
      ]
    }
  ]
})
