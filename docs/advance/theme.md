# Theming

Every UI color and shadow in the library is controlled by CSS variables. The light-theme defaults are identical to the previous hard-coded values, so upgrading requires no configuration. To re-skin the component, override the variables instead of patching internal class names.

## Quick re-skin

Override variables at the document root or in any scope:

```css
:root {
  --stack-tab-accent: #4f46e5;
  --stack-tab-accent-active: #4338ca;
  --stack-tab-accent-contrast: #fff;
}
```

Changing the accent alone updates tab hover, the drag indicator, the scrollbar thumb, the primary badge and context-menu hover.

## Dark theme

A neutral dark palette is built in and can be activated in three ways:

```html
<!-- Common convention in the Element Plus / VueUse ecosystem -->
<html class="dark"></html>

<!-- Explicit theme marker -->
<html data-theme="dark"></html>

<!-- Scoped dark container -->
<div data-theme="dark">
  <vue-stack-tabs />
</div>
```

The dark block also sets `color-scheme: dark`, so native scrollbars and form controls follow. To customize the dark palette, override variables after the same selector:

```css
:root.dark {
  --stack-tab-accent: #818cf8;
  --stack-tab-surface: #0b1120;
  --stack-tab-surface-muted: #172033;
  --stack-tab-border: #263244;
}
```

## Variables

### Accent

| Variable                      | Light default | Used for                                                      |
| ----------------------------- | ------------- | ------------------------------------------------------------- |
| `--stack-tab-accent`          | `#409eff`     | Tab hover/active, drag indicator, scrollbar thumb, menu hover |
| `--stack-tab-accent-active`   | `#337ecc`     | Pressed accent                                                |
| `--stack-tab-accent-contrast` | `#ffffff`     | Text/icons on accent backgrounds, badge text                  |
| `--stack-tab-accent-shadow`   | `#409effcc`   | Drag indicator glow                                           |
| `--stack-tab-menu-hover-bg`   | `#409eff`     | Context-menu hover background (dark uses pressed accent)      |
| `--stack-tab-menu-hover-text` | `#ffffff`     | Context-menu hover text/icons (dark uses `#f8fafc`)           |

### Surfaces and borders

| Variable                    | Light default | Used for                                                              |
| --------------------------- | ------------- | --------------------------------------------------------------------- |
| `--stack-tab-surface`       | `#fff`        | Content area, active tab, header buttons, context menu, retry buttons |
| `--stack-tab-surface-muted` | `#fafafa`     | Inactive tabs, disabled buttons                                       |
| `--stack-tab-overlay`       | `#fff`        | Global loading overlay                                                |
| `--stack-tab-border`        | `#f0f0f0`     | Header bottom border, tab/menu/button borders                         |
| `--stack-tab-divider`       | `#a9a9a9`     | Context-menu divider                                                  |

### Text and icons

| Variable                    | Light default | Used for                                      |
| --------------------------- | ------------- | --------------------------------------------- |
| `--stack-tab-text`          | `#4d4d4d`     | Tab labels, menu items, iframe retry buttons  |
| `--stack-tab-text-strong`   | `#000`        | Label of the tab that opened the context menu |
| `--stack-tab-text-disabled` | `#aaa`        | Disabled text and icons                       |
| `--stack-tab-mask`          | `#4d4d4d`     | Close icon, scroll mask buttons, menu icons   |
| `--stack-tab-scrollbar`     | `#0000001a`   | Horizontal scrollbar                          |

### Shadows

Shadows use two layers: color layers control opacity, composite layers control geometry. Prefer overriding the composite layer for a complete replacement; override the color layer when only the intensity should change.

| Variable                            | Light default                        | Used for                              |
| ----------------------------------- | ------------------------------------ | ------------------------------------- |
| `--stack-tab-shadow-color`          | `#0009`                              | Tab shadows and inset utility classes |
| `--stack-tab-shadow-soft`           | `#0000001a`                          | Soft context-menu shadow              |
| `--stack-tab-shadow-tab`            | `-5px 0 5px -5px` + `5px 0 5px -5px` | Active tab shadow                     |
| `--stack-tab-shadow-tab-left`       | `-5px 0 5px -5px`                    | `.stack-tab__shadow-left`             |
| `--stack-tab-shadow-tab-right`      | `5px 0 5px -5px`                     | `.stack-tab__shadow-right`            |
| `--stack-tab-shadow-menu`           | `5px 5px 5px`                        | Context-menu shadow                   |
| `--stack-tab-shadow-drop`           | `0 0 6px`                            | Drag indicator glow                   |
| `--stack-tab-shadow-inset-top`      | `inset 0 5px 5px -5px`               | Content top scroll shadow             |
| `--stack-tab-shadow-inset-bottom`   | `inset 0 -5px 5px -5px`              | Content bottom scroll shadow          |
| `--stack-tab-shadow-inset-vertical` | One at top and bottom                | Content vertical scroll shadow        |
| `--stack-tab-shadow-inset-left`     | `inset 5px 0 5px -5px`               | Content left scroll shadow            |
| `--stack-tab-shadow-inset-right`    | `inset -5px 0 5px -5px`              | Content right scroll shadow           |
| `--stack-tab-shadow-inset-all`      | One on each side                     | Content horizontal scroll shadow      |

The `.stack-tab__shadow-inset-*` utilities consume the matching `--stack-tab-shadow-inset-*` composite variable; the dark theme widens their geometry to 12/14px while the color still comes from `--stack-tab-shadow-color`.

### Badge, loading and iframe

| Variable                           | Light default | Used for                             |
| ---------------------------------- | ------------- | ------------------------------------ |
| `--stack-tab-badge-default`        | `#ef4f4f`     | Default badge                        |
| `--stack-tab-badge-primary`        | `#409eff`     | Primary badge                        |
| `--stack-tab-loading-accent`       | 60% of accent | Loading spinner (follows the accent) |
| `--stack-tab-iframe-loading-bg`    | `#f5f5f5`     | iframe loading background            |
| `--stack-tab-iframe-loading-color` | `#999`        | iframe loading text                  |
| `--stack-tab-iframe-error-bg`      | `#ffffffeb`   | iframe error background              |
| `--stack-tab-iframe-error-color`   | `#666`        | iframe error text                    |

### Layout and size

| Variable                               | Default | Used for                               |
| -------------------------------------- | ------- | -------------------------------------- |
| `--stack-tab-font-size`                | `14px`  | Tab, context-menu and iframe text size |
| `--stack-tab-head-height`              | `40px`  | Tab header height                      |
| `--stack-tab-context-menu-item-height` | `30px`  | Context-menu item height               |
| `--stack-tab-context-menu-padding`     | `8px`   | Context-menu padding                   |

Three size presets are built in and activated with `data-stack-tab-size` (scoped containers work too):

```html
<html data-stack-tab-size="small"></html>
<!-- normal / large work the same way; variables can also be overridden directly -->
```

| Preset   | Font size | Header height | Menu item height | Menu padding |
| -------- | --------- | ------------- | ---------------- | ------------ |
| `small`  | 12px      | 32px          | 26px             | 6px          |
| `normal` | 14px      | 40px          | 30px             | 8px          |
| `large`  | 16px      | 48px          | 36px             | 10px         |

## Scoped overrides

Variables are declared on `:root`; overriding them in any scope only affects that subtree:

```css
.side-layout {
  --stack-tab-accent: #10b981;
}
```

## Notes

- Light-theme defaults match the old hard-coded values, so the visual result is unchanged after upgrading.
- Dark backgrounds swallow black shadows, so the dark theme uses an outline + accent glow + top highlight instead, and raises `--stack-tab-border` to `#334155`. Override `--stack-tab-shadow-tab` / `--stack-tab-shadow-menu` to make the shadows stronger or softer.
- These variables are a public API from `2.4.0` on: they are only added, never renamed.
