# React Webview Vite Templates

A small npm workspace containing distinct VS Code + React webview architectures.

## Packages

```text
packages/
├── single-webview/
├── separate-webview-ui/
├── multi-webview/
└── scaffold/
```

| Package | Purpose |
| --- | --- |
| `single-webview` | One React webview in the same npm package as the VS Code extension |
| `separate-webview-ui` | Extension host with a separately managed `webview-ui/` frontend |
| `multi-webview` | Multiple React webviews with shared UI, theme, messaging, and multi-entry Vite builds |
| `scaffold` | Generator-style baseline with a separate `webview-ui/` directory |

The `single-webview` package represents the same project state as the previous root implementation, so the root itself is not duplicated as a workspace package.

## Install

```bash
npm install
```

## Build all packages

```bash
npm run build
```

## Typecheck

```bash
npm run typecheck
```

## Lint

```bash
npm run lint
```

## Test

```bash
npm test
```

Commands run only in workspaces that define the corresponding script.

## Develop one template

```bash
npm run dev:single
npm run dev:separate-ui
npm run dev:multi
npm run dev:scaffold
```

Equivalent npm workspace selection is also available:

```bash
npm run dev --workspace react-webview-vite-multi-webview
```

Each package owns its own source, documentation, VS Code configuration, Vite configuration, and any nested frontend application it needs.
