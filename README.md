# React Webview Vite Templates

This repository is an npm workspace containing the implementations represented by the repository branches.

Each branch is preserved as a package under `packages/*`.

## Workspace layout

```text
packages/
├── main/
├── docs-separate-webview-ui-tutorial/
├── docs-simplify-webview-how-to/
├── feat-multi-webview-template/
└── scaffold-separate-webview-ui-directory/
```

## Branch mapping

| Source branch | Workspace package | Package name |
| --- | --- | --- |
| `main` | `packages/main` | `react-webview-vite-main` |
| `docs/separate-webview-ui-tutorial` | `packages/docs-separate-webview-ui-tutorial` | `react-webview-vite-docs-separate-webview-ui-tutorial` |
| `docs/simplify-webview-how-to` | `packages/docs-simplify-webview-how-to` | `react-webview-vite-docs-simplify-webview-how-to` |
| `feat/multi-webview-template` | `packages/feat-multi-webview-template` | `react-webview-vite-feat-multi-webview-template` |
| `scaffold/separate-webview-ui-directory` | `packages/scaffold-separate-webview-ui-directory` | `react-webview-vite-scaffold-separate-webview-ui-directory` |

The imported packages retain the source branch contents. Their root `package.json` names are made unique so npm can manage all of them as workspaces.

## Install

From the repository root:

```bash
npm install
```

## Build all packages

```bash
npm run build
```

The root command runs each workspace's own `build` script when present.

## Typecheck all packages

```bash
npm run typecheck
```

## Lint all packages

```bash
npm run lint
```

## Run one package

Use npm's workspace selector:

```bash
npm run dev --workspace react-webview-vite-main
```

or:

```bash
npm run dev --workspace react-webview-vite-feat-multi-webview-template
```

Convenience aliases are also available:

```bash
npm run dev:main
npm run dev:multi-webview
```

## Package ownership

Each package remains self-contained. Package-specific README files, docs, Vite configuration, VS Code extension files, scripts, and nested frontend folders stay with that package.
