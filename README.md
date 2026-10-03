# React Webview Vite Templates

Learn how to build VS Code webviews with **React**, **Vite**, **Tailwind CSS**, and the **VS Code Webview API**.

This repository contains several complete examples. Start with the one that matches what you want to build.

## Which example should I use?

| Example | Start here when... |
| --- | --- |
| [**Single Webview**](./packages/single-webview/README.md) | you are learning VS Code webviews or your extension needs one React interface |
| [**Separate Webview UI**](./packages/separate-webview-ui/README.md) | you want the React frontend kept in its own `webview-ui/` application |
| [**Multiple Webviews**](./packages/multi-webview/README.md) | your extension needs several React webviews that share components, styles, and messaging |
| [**Scaffold**](./packages/scaffold/README.md) | you want to begin closer to the project created by the VS Code extension generator |

If this is your first time building a React webview, start with:

**[Single Webview →](./packages/single-webview/README.md)**

## Learning path

A good progression is:

```text
1. Single Webview
   ↓
2. Separate Webview UI
   ↓
3. Multiple Webviews
```

### 1. Single Webview

Learn the core model:

```text
VS Code extension
      ↕ messages
React webview
```

You will work with:

- `createWebviewPanel()`
- React inside a VS Code webview
- `acquireVsCodeApi()`
- extension ↔ webview messaging
- Vite builds
- Tailwind CSS
- VS Code theme variables
- browser preview

**[Open the Single Webview tutorial →](./packages/single-webview/README.md)**

### 2. Separate Webview UI

Learn how to separate the two applications clearly:

```text
extension/
    Node.js

webview-ui/
    React + browser
```

This is useful when the frontend has its own dependencies, configuration, and development workflow.

**[Open the Separate Webview UI tutorial →](./packages/separate-webview-ui/README.md)**

### 3. Multiple Webviews

Learn how one extension can contain several related React interfaces:

```text
VS Code extension
├── Dashboard
├── Settings
└── shared webview code
```

This example covers:

- multiple Vite entry points
- shared React components
- shared message types
- reusable webview panel creation
- shared CSS
- webview-specific CSS
- shared VS Code theme tokens

**[Open the Multiple Webviews tutorial →](./packages/multi-webview/README.md)**

### Scaffold

Use the scaffold when you want to see a more generator-oriented starting point before the project is organized into one of the other patterns.

**[Open the Scaffold tutorial →](./packages/scaffold/README.md)**

## Repository layout

```text
packages/
├── single-webview/
├── separate-webview-ui/
├── multi-webview/
└── scaffold/
```

Each package contains its own runnable example and README tutorial.

## Install

Clone the repository, then install from the root:

```bash
npm install
```

The root is an npm workspace, so one install makes the workspace packages available.

## Run an example

### Single webview

```bash
npm run dev:single
```

### Separate webview UI

```bash
npm run dev:separate-ui
```

### Multiple webviews

```bash
npm run dev:multi
```

### Scaffold

```bash
npm run dev:scaffold
```

Follow the README inside each package for the exact exercise and expected behavior.

## Build and check the examples

Run a command across the workspace packages:

```bash
npm run build
npm run typecheck
npm run lint
npm test
```

The root scripts use npm workspaces:

```bash
npm run build --workspaces --if-present
```

Packages that do not define a particular script are skipped.

## Workspace helper

The repository also includes a small workspace CLI:

```text
scripts/run-workspaces.mjs
```

It uses **Commander** for CLI options and **fzf** fuzzy matching for selecting examples.

For example:

```bash
npm run workspaces:run -- build --filter multi
```

Exact selection:

```bash
npm run workspaces:run -- build --workspace multi-webview
```

See what would run:

```bash
npm run workspaces:run -- build --list
```

The normal `npm run build`, `npm run lint`, `npm run typecheck`, and `npm test` commands remain the simplest choice for most exercises.

## What you should understand by the end

After working through these examples, you should be able to explain:

```text
Extension host
→ runs in Node.js
→ can use the VS Code API

Webview
→ runs in a browser
→ can use React and the DOM

Messages
→ connect the two runtimes
```

You should also be able to decide when to use:

- one webview
- a separately managed frontend
- multiple shared webviews

Start with **[Single Webview](./packages/single-webview/README.md)** and build from there.
