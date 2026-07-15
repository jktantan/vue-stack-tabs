# vue-stack-tabs

[中文](./README.md) | [English](./README.en.md) | **Русский**

> Библиотека управления вкладками для Vue 3 на основе Vue Router. Реализует поведение TabPanel, аналогичное iframe, с использованием областей видимости Vue — **каждая вкладка имеет изолированную область компонентов**.

## Возможности

- **Вкладки на уровне маршрутов** — каждая вкладка владеет независимыми компонентами и кэшем
- **Стековая навигация внутри вкладки** — forward / backward внутри вкладки, аналогично стеку истории браузера
- **Обновление вкладок** — обновление одной или всех вкладок с полной пересборкой экземпляров компонентов
- **Вкладки iframe** — встраивание iframe-страниц с коммуникацией через postMessage
- **Сохранение сессии** — восстановление последних активных вкладок после обновления браузера
- **Запоминание позиции прокрутки** — автоматическое восстановление позиции прокрутки при переключении вкладок
- **Контекстное меню** — встроенные действия закрытия/обновления
- **Интернационализация** — встроенные китайский и английский языки, расширяемо
- **Модуль Nuxt 3/4** — работает из коробки

---

## Установка

```bash
# npm
npm install vue-stack-tabs

# pnpm
pnpm add vue-stack-tabs
```

---

## Быстрый старт (Vue 3)

### 1. Регистрация плагина

```ts
// main.ts
import { createApp } from 'vue'
import VueStackTabs from 'vue-stack-tabs'
import 'vue-stack-tabs/dist/vue-stack-tabs.css'
import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(router)
app.use(VueStackTabs)
app.mount('#app')
```

### 2. Настройка маршрутов

Вкладки зависят от Vue Router. Необходим родительский маршрут для размещения `<VueStackTabs>`:

```ts
// router.ts
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: () => import('./Layout.vue'),
      children: [
        { path: '', component: () => import('./pages/Home.vue') },
        { path: 'about', component: () => import('./pages/About.vue') },
        { path: 'settings', component: () => import('./pages/Settings.vue') },
        // маршрут-заглушка для iframe (обязательно)
        { path: 'iframe', component: () => import('vue-stack-tabs').then((m) => m.IFrame) }
      ]
    }
  ]
})

export default router
```

### 3. Использование компонента

```vue
<!-- Layout.vue -->
<template>
  <div style="width: 100%; height: 100vh">
    <VueStackTabs iframe-path="/iframe" :default-tabs="defaultTabs" :max="20" :contextmenu="true" />
  </div>
</template>

<script setup lang="ts">
import type { ITabData } from 'vue-stack-tabs'

const defaultTabs: ITabData[] = [
  {
    title: 'Главная',
    path: '/',
    closable: false,
    refreshable: true
  }
]
</script>
```

### 4. Открытие вкладок

```ts
import { useTabActions } from 'vue-stack-tabs'

const { openTab, closeTab, refreshTab } = useTabActions()

// Открыть новую вкладку
openTab({
  id: 'about', // необязательно, генерируется автоматически
  title: 'О приложении',
  path: '/about',
  query: { id: '1' } // необязательно
})

// Закрыть вкладку
closeTab('about')

// Обновить вкладку
refreshTab('about')
```

---

## Быстрый старт (Nuxt 3/4)

### 1. Регистрация модуля

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['vue-stack-tabs/nuxt'],
  vueStackTabs: {
    locale: 'en-US'
  },
  css: ['vue-stack-tabs/dist/vue-stack-tabs.css']
})
```

### 2. Использование в Layout

```vue
<!-- layouts/default.vue -->
<template>
  <div style="width: 100%; height: 100vh">
    <VueStackTabs iframe-path="/iframe" :default-tabs="defaultTabs" />
  </div>
</template>

<script setup lang="ts">
import type { ITabData } from 'vue-stack-tabs'

const defaultTabs: ITabData[] = [{ title: 'Главная', path: '/', closable: false, refreshable: true }]
</script>
```

### 3. Использование на страницах

```vue
<!-- pages/index.vue -->
<template>
  <div>
    <h1>Главная</h1>
    <button @click="openTab({ title: 'О приложении', path: '/about' })">Открыть страницу «О приложении»</button>
  </div>
</template>

<script setup>
import { useTabActions } from 'vue-stack-tabs'
const { openTab } = useTabActions()
</script>
```

---

## ESM-only и суб-вход iframe bridge

`vue-stack-tabs` начиная с текущей версии поддерживает только ESM import; `require('vue-stack-tabs')` больше не поддерживается.

Основное приложение продолжает использовать корневой вход:

```ts
import VueStackTabs from 'vue-stack-tabs'
import 'vue-stack-tabs/dist/vue-stack-tabs.css'
```

Для iframe-страниц используйте суб-вход без побочных эффектов стилей:

```ts
import { postOpenTab, onRefreshRequest } from 'vue-stack-tabs/iframe-bridge'

postOpenTab(
  { title: 'Детали заказа', path: '/orders/1' },
  { targetOrigin: 'https://parent.example.com' }
)

const off = onRefreshRequest(() => window.location.reload(), {
  allowedOrigins: ['https://parent.example.com']
})
```

Если `targetOrigin` не указан, по умолчанию используется `window.location.origin` страницы iframe, подходит для родительских страниц с тем же источником; для кросс-доменных родительских страниц необходимо явно передать `targetOrigin`. В продакшене рекомендуется явно передавать и `targetOrigin`, и `allowedOrigins`.

---

## Политика безопасности iframe

`VueStackTabs` поддерживает настройку атрибутов безопасности iframe:

```vue
<VueStackTabs
  iframe-path="/__iframe"
  iframe-sandbox="allow-scripts allow-forms allow-popups allow-downloads allow-same-origin"
  iframe-referrer-policy="strict-origin-when-cross-origin"
  iframe-allow="fullscreen"
  :iframe-load-timeout="15000"
/>
```

Sandbox по умолчанию сохраняет типичные возможности бизнес-страниц и ориентирован на совместимость, не на строгую изоляцию. Для строгой изоляции удалите `allow-same-origin` и продолжайте уменьшать токены sandbox по потребностям бизнеса.

---

## Справочник API

### useTabActions

Композабл для операций на уровне вкладок.

```ts
import { useTabActions } from 'vue-stack-tabs'

const {
  openTab, // (tab: ITabData, renew?: boolean) => Promise<string>
  closeTab, // (id: string) => string
  closeAllTabs, // () => void
  refreshTab, // (id: string) => void
  refreshAllTabs, // () => void
  activeTab, // (id: string, isRoute?: boolean) => void
  reset, // () => void
  tabs // Ref<ITabItem[]>
} = useTabActions()
```

| Метод                  | Описание                                                                          |
| ---------------------- | --------------------------------------------------------------------------------- |
| `openTab(tab, renew?)` | Открыть новую вкладку. При `renew=true` очищает стек страниц и открывает заново   |
| `closeTab(id)`         | Закрыть указанную вкладку, возвращает ID новой активной вкладки                    |
| `closeAllTabs()`       | Закрыть все закрываемые вкладки                                                   |
| `refreshTab(id)`       | Обновить указанную вкладку (заменяет ID кэша, пересоздаёт экземпляр компонента)      |
| `refreshAllTabs()`     | Обновить все вкладки                                                              |
| `activeTab(id)`        | Активировать указанную вкладку (переключить вкладку)                               |
| `reset()`              | Закрыть все вкладки и сбросить состояние                                          |

---

### useTabRouter

Стековая навигация внутри вкладки. **Можно использовать только внутри компонентов страниц во вкладке**.

```ts
import { useTabRouter } from 'vue-stack-tabs'

const { forward, backward, addScrollTarget } = useTabRouter()
```

| Метод                       | Описание                                                    |
| --------------------------- | ----------------------------------------------------------- |
| `forward(to)`               | Перейти вперёд к новой странице внутри текущей вкладки       |
| `backward(to, backQuery?)`  | Вернуться назад внутри текущей вкладки                      |
| `addScrollTarget(selector)` | Зарегистрировать CSS-селектор DOM для запоминания прокрутки  |

#### forward

```ts
// Перейти на страницу /detail
forward({ path: '/detail', query: { id: '123' } })

// Добавить тот же маршрут в стек (один маршрут может быть добавлен многократно, каждый с независимым кэшем)
forward({ path: '/list', query: { page: '2' } })
```

#### backward

```ts
// Вернуться на 1 шаг назад (по умолчанию)
backward(1)

// Вернуться на N шагов
backward(3)

// Вернуться к определённому пути (автоматический поиск в стеке)
backward('/list')

// Вернуться с параметрами (целевая страница получает через props._back)
backward('/list', { result: 'success', data: { id: 1 } })
```

**Получение параметров на целевой странице:**

```vue
<script setup>
// Объявить props для получения параметров обратной навигации
defineProps<{ _back?: { result: string; data: any } }>()
</script>
```

---

### useTabLoading

Управление состоянием загрузки страницы. **Можно использовать только внутри компонентов страниц во вкладке**.

```ts
import { useTabLoading } from 'vue-stack-tabs'

const { openTabLoading, closeTabLoading } = useTabLoading()

// Показать оверлей загрузки
openTabLoading()

// Закрыть после завершения асинхронной операции
fetchData().finally(() => closeTabLoading())
```

> Загрузка автоматически закрывается при размонтировании компонента — ручная очистка не требуется.

---

## Свойства (Props)

Свойства компонента `<VueStackTabs>`:

| Свойство               | Тип                         | По умолчанию            | Описание                                                      |
| ----------------------- | --------------------------- | ----------------------- | ------------------------------------------------------------- |
| `iframePath`            | `string`                    | **Обязательно**         | Путь маршрута-заглушки для iframe                              |
| `iframeSandbox`         | `string`                    | `allow-scripts allow-forms allow-popups allow-downloads allow-same-origin` | Политика sandbox для iframe; по умолчанию совместимость, не строгая изоляция — удалите `allow-same-origin` для строгой изоляции; пустая строка отключает sandbox (не рекомендуется) |
| `iframeReferrerPolicy`  | `ReferrerPolicy`            | `strict-origin-when-cross-origin`                                          | Атрибут referrerpolicy для iframe                             |
| `iframeAllow`           | `string`                    | `''`                                                                       | Атрибут allow для iframe, например `fullscreen`               |
| `iframeLoadTimeout`     | `number`                    | `15000`                                                                    | Тайм-аут загрузки iframe в мс                                |
| `defaultTabs`           | `ITabData[]`                | `[]`                    | Начальный список вкладок                                      |
| `max`                   | `number`                    | `20`                    | Максимальное количество вкладок                                |
| `contextmenu`           | `boolean \| object`         | `true`                  | Включить контекстное меню                                      |
| `pageTransition`        | `string`                    | `'stack-tab-swap'`      | Имя анимации перехода при навигации вперёд                     |
| `pageTransitionBack`    | `string`                    | `'stack-tab-swap-back'` | Имя анимации перехода при навигации назад                      |
| `tabTransition`         | `string \| TransitionProps` | `'stack-tab-zoom'`      | Эффект перехода при добавлении/удалении вкладок                |
| `tabScrollMode`         | `TabScrollMode`             | `'both'`                | Режим прокрутки панели вкладок: `'wheel'` / `'button'` / `'both'` |
| `width`                 | `string`                    | `'100%'`                | Ширина контейнера                                              |
| `height`                | `string`                    | `'100%'`                | Высота контейнера                                              |
| `i18n`                  | `string`                    | `'zh-CN'`               | Локаль интернационализации                                     |
| `globalScroll`          | `boolean`                   | `false`                 | Включить запоминание прокрутки на уровне страницы              |
| `sessionPrefix`         | `string`                    | `''`                    | Префикс ключа sessionStorage                                  |
| `iframeAllowedOrigins`  | `string[]`                  | Тот же источник         | Разрешённые источники для iframe postMessage                   |

---

## События (Events)

| Событие        | Параметры      | Описание                                      |
| -------------- | -------------- | --------------------------------------------- |
| `onActive`     | `(id: string)` | Срабатывает при активации вкладки              |
| `onPageLoaded` | —              | Срабатывает при загрузке компонента страницы   |

---

## Вкладки iframe

### Открытие вкладки iframe

```ts
openTab({
  title: 'Внешняя страница',
  path: 'https://example.com',
  iframe: true
})
```

### Операции внутри iframe-страниц

Внутри вкладки iframe можно взаимодействовать с хост-контейнером через `postMessage` для открытия новых вкладок или обработки действий обновления.

#### 1. Использование утилит Bridge (рекомендуется)

Если iframe-страница может ссылаться на код библиотеки (или импортировать инструменты из `iframeBridge.ts`), рекомендуется этот подход:

```ts
import { postOpenTab, onRefreshRequest } from 'vue-stack-tabs/iframe-bridge'

const parentOrigin = 'https://parent.example.com'

// Открыть вкладку
postOpenTab(
  {
    title: 'Новая страница',
    path: '/detail',
    query: { id: '1' }
  },
  { targetOrigin: parentOrigin }
)

// Слушать запросы на обновление
const off = onRefreshRequest(
  () => {
    // Пользовательская логика обновления
    location.reload()
  },
  { allowedOrigins: [parentOrigin] }
)
```

#### 2. Нативная интеграция

Если невозможно импортировать утилиты библиотеки или требуется нулевая зависимость, используйте нативный API:

```ts
const parentOrigin = 'https://parent.example.com'

// Открыть вкладку
window.parent.postMessage(
  {
    type: 'vue-stack-tabs:openTab',
    payload: {
      title: 'Нативная новая страница',
      path: '/detail'
    }
  },
  parentOrigin
)

// Слушать запросы на обновление
window.addEventListener('message', (ev) => {
  if (ev.origin !== parentOrigin) return
  if (ev.source !== window.parent) return
  if (ev.data?.type === 'vue-stack-tabs:refresh') {
    // Выполнить обновление
    location.reload()
  }
})
```

### Режимы обновления iframe

При вызове `openTab` можно указать поведение обновления через `iframeRefreshMode`:

- `postMessage` (по умолчанию): хост отправляет сообщение `vue-stack-tabs:refresh` в iframe; внутренняя страница сама решает, как обновляться (более плавная анимация).
- `reload`: хост напрямую сбрасывает `src` или `key` iframe для принудительной перезагрузки браузером (подходит для кросс-доменных или немодифицируемых страниц).

---

## Интернационализация

Встроенные языки: `zh-CN` (китайский), `en-US` (английский).

```ts
// Переключить язык
app.use(VueStackTabs, [{ locale: 'en-US' }])
```

Пользовательский языковой пакет:

```ts
app.use(VueStackTabs, [
  {
    locale: 'ru-RU',
    messages: {
      'VueStackTab.close': 'Закрыть',
      'VueStackTab.refresh': 'Обновить'
      // ...
    }
  }
])
```

---

## Определения типов

```ts
/** Данные, передаваемые при открытии вкладки */
interface ITabData {
  id?: string // ID вкладки (автоматически генерируемый UUID, если не указан)
  title: string // Заголовок вкладки
  path: string // Путь маршрута или URL iframe
  query?: Record<string, string> // Параметры маршрута
  closable?: boolean // Можно ли закрыть (по умолчанию true)
  refreshable?: boolean // Можно ли обновить (по умолчанию true)
  iframe?: boolean // Является ли вкладкой iframe (по умолчанию false)
  iframeRefreshMode?: 'postMessage' | 'reload' // Способ обновления iframe
}

/** Режим прокрутки панели вкладок */
enum TabScrollMode {
  WHEEL = 'wheel',
  BUTTON = 'button',
  BOTH = 'both'
}
```

---

## Структура проекта

```
src/lib/
├── StackTabs.vue           # Главный компонент
├── index.ts                # Точка входа и экспорты
├── hooks/                  # Основная логика
│   ├── useTabActions.ts    # Публичный API
│   ├── useTabRouter.ts     # Навигация внутри вкладки
│   ├── useTabLoading.ts    # Состояние загрузки
│   └── useTabPanel.tsx     # Ядро движка
├── model/TabModel.ts       # Определения типов
├── components/             # UI-компоненты
├── nuxt/                   # Модуль Nuxt
└── assets/style/           # Стили
```

Подробное описание архитектуры см. в [`ARCHITECTURE.md`](./ARCHITECTURE.md).

---

## Лицензия

[LGPL-2.1](./LICENSE)
