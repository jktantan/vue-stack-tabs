# src/lib 稳定修 Bug 优先重构设计

日期：2026-06-25

## 背景

本项目的库源码位于 `src/lib/`，而不是仓库根目录的 `lib/`。当前库的公共入口、组件、组合式函数和测试配置已经形成稳定对外契约：

- 库入口：`src/lib/index.ts`
- 主组件：`src/lib/StackTabs.vue`
- 标签头组件：`src/lib/components/TabHeader/*`
- 右键菜单组件：`src/lib/components/ContextMenu/*`
- 核心状态机：`src/lib/hooks/useTabPanel.tsx`
- 事件总线：`src/lib/hooks/useTabEventBus.ts`
- 类型模型：`src/lib/model/TabModel.ts`

本轮设计目标不是大型架构迁移，而是修复现有公开 API 中“已经暴露但未正确生效”的行为问题，并用测试锁定回归。

## 目标

采用完全兼容的稳定修 Bug 路线：

1. 让 `contextmenu` prop 真正控制 tab 右键菜单。
2. 让 `TabScrollMode` 真正控制标签栏滚动方式。
3. 轻量收敛事件名常量，减少裸字符串和类型断言。
4. 为上述行为补充回归测试。

完成后，用户原有代码不需要迁移，但对应配置会按文档和类型表达的语义正常工作。

## 兼容性边界

### 必须保持不变

- 包入口不变：`src/lib/index.ts` 仍是库入口。
- 导出名不变：
  - `VueStackTabs`
  - `IFrame`
  - `useTabActions`
  - `useTabRouter`
  - `useTabLoading`
  - `TabHeaderButton`
  - `postOpenTab`
  - `onRefreshRequest`
  - `MSG_REFRESH`
  - `MSG_OPEN_TAB`
  - `TabModel` 相关类型
- props 名称不变：
  - `contextmenu`
  - `scrollMode`
  - `iframePath`
  - `max`
  - `height`
  - `width`
  - `transition`
  - `cache`
  - `initialTabs`
- 默认行为不变：
  - `contextmenu` 默认仍启用。
  - `scrollMode` 默认仍按当前默认值。
  - `max` 默认仍是 `20`。
  - tab 打开、关闭、刷新、iframe 刷新协议不改。
- 文档中的现有用法继续可用，不要求用户迁移代码。

### 本轮不做

- 不拆 `useTabPanel.tsx`。
- 不把全局单例状态改成实例级状态。
- 不调整包产物路径或构建配置。
- 不重命名组件、hook、事件、类型。
- 不大改视觉样式。
- 不重写 iframe 通信架构。
- 不引入新运行时依赖。

## 设计方案

### 方案选择

采用“行为对齐补丁包”方案。

该方案优先修复明确的行为偏差，避免扩大到长期架构改造。它相比“局部组件拆分”或“实例隔离预备”风险更低，更符合本轮“稳定修 Bug 优先、完全兼容”的目标。

## 修复 1：`contextmenu` 行为对齐

### 现状问题

当前设计链路大致是：

```text
StackTabs.vue
  props.contextmenu
    ↓
TabHeader/index.vue
  props.contextmenu
    ↓
ContextMenu/index.vue
  props.contextMenu
```

实际问题：

- `StackTabs` 和 `TabHeader` 暴露的是 `contextmenu`，但运行时没有完整打通到 `ContextMenu`。
- `contextmenu={false}` 没有真正禁用右键菜单。
- 自定义菜单配置无法可靠传递到 `ContextMenu`。
- `@contextmenu.prevent` 基本无条件绑定，导致禁用语义失效。

### 目标行为

#### 默认启用

以下写法应保持右键菜单启用：

```vue
<VueStackTabs />
<VueStackTabs :contextmenu="true" />
```

预期：

- 右键 tab 时打开默认菜单。
- 默认菜单能力不变，包括刷新、关闭、关闭其他、关闭左侧、关闭右侧、关闭全部、新窗口打开等现有能力。
- 菜单文本和 i18n key 不变。

#### 显式禁用

以下写法应禁用右键菜单：

```vue
<VueStackTabs :contextmenu="false" />
```

预期：

- 右键 tab 不打开菜单。
- 不触发菜单状态更新。
- 不影响正常左键激活 tab。
- 不影响关闭按钮、刷新按钮等其他操作。

#### 自定义菜单传递

以下写法应能传递自定义菜单：

```ts
const contextmenu = [
  {
    key: 'pin',
    title: 'Pin tab',
    handler: tab => {
      // 用户逻辑
    },
  },
]
```

预期：

- 自定义菜单能传到 `ContextMenu`。
- 点击自定义项能拿到当前 tab 数据。
- 默认菜单是合并还是替换，以当前 `ContextMenu` 组件既有实现语义为准。
- 本轮不新增新的菜单 API。

### 内部设计

保留 `contextmenu` prop 名称和运行时兼容性，新增内部归一化逻辑：

```text
StackTabs.contextmenu
  ↓ 原样透传
TabHeader.contextmenu
  ↓ normalizeContextmenu()
ContextMenu.contextMenu
```

归一化规则：

- `false`：禁用右键菜单。
- `true` 或 `undefined`：启用默认菜单。
- `IContextMenu[]`：启用右键菜单，并把数组传递给 `ContextMenu`。
- 其他对象：为兼容旧类型声明，保守处理为启用默认菜单，不抛异常。

实现时避免把 `contextmenu` API 重新设计成本轮任务的一部分。

## 修复 2：`TabScrollMode` 行为对齐

### 现状问题

父组件已经根据 `scrollMode` 计算：

```text
scrollMode
  ↓
isScrollWheel
isScrollButton
  ↓
TabHeaderScroll
```

但 `TabHeaderScroll` 内部没有真正用这两个开关控制行为：

- 滚轮事件没有尊重 `isScrollWheel`。
- 左右按钮显示没有尊重 `isScrollButton`。
- `BUTTON`、`WHEEL`、`BOTH` 的实际行为与枚举语义不一致。

### 目标行为

| scrollMode | 滚轮滚动 | 左右按钮 |
| --- | --- | --- |
| `WHEEL` | 启用 | 禁用 |
| `BUTTON` | 禁用 | 启用 |
| `BOTH` | 启用 | 启用 |

默认 `scrollMode` 的值不改变，只让默认模式对应的行为正确执行。

### 内部设计

保持现有 prop 和枚举不变，只修内部条件判断：

```text
TabHeader/index.vue
  scrollMode
    ↓
  isScrollWheel / isScrollButton
    ↓
TabHeaderScroll.vue
  - wheel handler 只在 isScrollWheel=true 时执行
  - 左右按钮只在 isScrollButton=true 且存在溢出时显示
```

## 修复 3：事件名类型轻量收敛

### 现状问题

事件总线中存在多个字符串事件名，部分已经进入统一定义，部分仍散落在组件和 hook 中，例如：

- `PAGE_LOADING`
- `TAB_ACTIVE`
- `FORWARD`
- `BACKWARD`
- `REFRESH_IFRAME_POSTMESSAGE`

这会增加误拼和类型断言风险。

### 目标行为

- 事件名文本不变。
- 事件 payload 不变。
- 触发时机不变。
- 只把实际使用的事件名加入统一事件常量或类型定义。
- 替换局部裸字符串。
- 不改变事件总线实现和注入机制。

## 预计变更文件

主要文件：

```text
src/lib/components/TabHeader/index.vue
src/lib/components/TabHeader/TabHeaderScroll.vue
src/lib/components/ContextMenu/index.vue
src/lib/hooks/useTabEventBus.ts
src/lib/model/TabModel.ts
src/lib/components/**/*.spec.ts
```

按需最小触碰：

```text
src/lib/StackTabs.vue
```

明确不预计触碰：

```text
src/lib/hooks/useTabPanel.tsx
src/lib/hooks/useTabActions.ts
src/lib/hooks/useTabRouter.ts
src/lib/utils/iframeBridge.ts
vite.config.*
package.json
```

## 测试策略

本轮遵循测试先行：先添加能暴露当前行为偏差的失败测试，再实现最小修复。

### `contextmenu` 测试

建议位置：

```text
src/lib/components/TabHeader/index.spec.ts
src/lib/components/ContextMenu/index.spec.ts
```

覆盖：

1. 默认启用：未传 `contextmenu` 或传 `true` 时，右键 tab 能打开默认菜单。
2. 显式禁用：传 `false` 时，右键 tab 不打开菜单，但左键激活仍工作。
3. 自定义菜单：传 `IContextMenu[]` 时，菜单项能渲染，点击时 handler 收到当前 tab。

### `TabScrollMode` 测试

建议位置：

```text
src/lib/components/TabHeader/TabHeaderScroll.spec.ts
```

覆盖：

1. `WHEEL`：`isScrollWheel=true`、`isScrollButton=false` 时，wheel 能改变滚动位置，按钮不渲染。
2. `BUTTON`：`isScrollWheel=false`、`isScrollButton=true` 时，wheel 不改变滚动位置，溢出时按钮渲染。
3. `BOTH`：`isScrollWheel=true`、`isScrollButton=true` 时，wheel 能滚动，溢出时按钮渲染。

测试不依赖真实布局，应手动 mock `clientWidth`、`scrollWidth`、`scrollLeft` 等属性，避免 jsdom 布局不稳定。

### 事件名收敛验证

不需要复杂 UI 测试，主要通过类型检查和现有测试验证：

- 事件名常量被统一引用。
- 不新增裸字符串事件。
- 类型检查通过。
- 现有测试通过。

## 验证命令

最低验证：

```bash
pnpm test
pnpm type-check
pnpm build
pnpm test:coverage
```

覆盖率验证是完成前检查项。若现有项目基础覆盖率暂时低于 80%，实施结果必须明确记录当前覆盖率、缺口原因，以及本轮新增/修改代码对应测试是否已覆盖。

## 风险与处理

### 风险 1：`contextmenu` 历史类型过宽

如果直接收紧类型，可能导致用户代码 TypeScript 报错。

处理：

- 不做破坏性类型收紧。
- 内部新增归一化函数处理运行时输入。
- 对未知对象输入启用默认菜单，不抛异常。

### 风险 2：DOM 尺寸和滚动测试不稳定

`TabHeaderScroll` 依赖横向溢出、`scrollLeft`、`clientWidth`、`scrollWidth` 等浏览器布局属性。

处理：

- 测试中手动定义布局属性。
- 只验证逻辑开关，不做像素级视觉测试。

### 风险 3：事件类型整理扩大范围

如果尝试完整泛型化事件总线，容易演变成架构重构。

处理：

- 只收敛事件名常量。
- 不改 payload、触发时机、注入机制。

### 风险 4：默认菜单合并或替换语义不明确

如果 `ContextMenu` 已有隐含语义，本轮不能擅自改变。

处理：

- 以当前组件实际逻辑为准。
- 本轮只修“自定义菜单能传到组件”。
- 测试锁定现有语义，而不是创造新语义。

## 回滚策略

推荐拆成三个独立实施步骤：

1. `test: cover tab header contextmenu and scroll mode`
   - 只添加失败测试。
2. `fix: align contextmenu and scroll mode behavior`
   - 实现最小行为修复。
3. `refactor: centralize tab event names`
   - 轻量事件名整理，可独立回滚。

如果第三步引发意外，直接回滚第三步，不影响前两个行为修复。

## 成功标准

- 用户现有代码无需迁移。
- `contextmenu` 默认启用、显式禁用和自定义菜单传递行为正确。
- `TabScrollMode.WHEEL`、`TabScrollMode.BUTTON`、`TabScrollMode.BOTH` 行为正确。
- 事件名没有新增裸字符串。
- `pnpm test` 通过。
- `pnpm type-check` 通过。
- `pnpm build` 通过。
- `pnpm test:coverage` 已执行，并记录覆盖率结果；本轮新增/修改代码具备对应回归测试。
