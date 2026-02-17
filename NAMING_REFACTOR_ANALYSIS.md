# 命名规范化后的整体分析

## 一、文件重命名

| 原文件名 | 新文件名 | 状态 |
|----------|----------|------|
| `useTabpanel.tsx` | `useTabPanel.tsx` | ✅ 已重命名 |

**说明**：Windows 文件系统大小写不敏感，IDE 可能仍显示 `useTabpanel`，但实际是同一文件。若出现「找不到模块」可尝试：
- 关闭并重新打开文件
- 重启 IDE
- 或执行 `git status` 确认实际文件名

---

## 二、useTabPanel 对外导出变更

对外导出字段（供 StackTabs、useTabActions、useTabRouter、ContextMenu 使用）：

| 原导出名 | 新导出名 | 使用处 |
|----------|----------|--------|
| `initial` | `initialize` | StackTabs.vue |
| `initialed` | `isInitialized` | （内部状态，StackTabs 未使用） |
| `refreshExclude` | `excludedCacheIdsForRefresh` | StackTabs.vue |
| `markDeletableCache` | `markCacheForEviction` | useTabRouter.ts |
| `removeDeletableCache` | `evictMarkedCaches` | （内部调用，不外露） |

---

## 三、引用关系核对

```
useTabPanel.tsx (源)
├── StackTabs.vue         → initialize, excludedCacheIdsForRefresh, addPage, caches, refreshKey...
├── useTabActions.ts      → tabs, refreshKey, refreshTab, refreshAllTabs, removeTab...
├── useTabRouter.ts       → getTab, markCacheForEviction, getComponent, addPageScroller
└── ContextMenu/index.vue → removeLeftTabs, removeRightTabs, removeOtherTabs
```

---

## 四、可能的问题点

### 1. Windows 大小写

- `useTabpanel` vs `useTabPanel` 在 Windows 上是同一文件
- 若在大小写敏感环境（如 Linux CI）构建，需确认磁盘上实际为 `useTabPanel.tsx`

### 2. 文档引用

- `AGENTS.md`、`CONTRIBUTING.md`、`docs/zh/more/useTabActions.md` 已改为 `useTabPanel`
- 用户文档（如 `default-tabs`）未涉及内部 API，无变更

### 3. 未对外暴露的内部 API

以下仅内部使用，外部项目不受影响：

- `markCacheForEviction`
- `evictMarkedCaches`
- `addCache` / `removeCache`
- `addPageScroller`
- `initialize`（内部实现，对外表现为 `default-tabs` 行为）

---

## 五、验证命令

```bash
pnpm run type-check   # 类型检查
pnpm run lint         # 代码规范
pnpm run lib:build    # 构建
pnpm run dev          # 本地运行
```

当前：type-check、lint、lib:build 均已通过。

---

## 六、若仍有报错

请补充：

1. 报错类型：TypeScript / ESLint / 运行时
2. 具体文件和行号
3. 完整错误信息

便于进一步排查。
