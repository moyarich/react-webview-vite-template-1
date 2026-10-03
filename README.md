# React Webview Vite Templates

A monorepo of VS Code extension templates for React webviews.

The packages are organized by **architecture**, so you can start with the structure that matches the extension you are building instead of reshaping a single example later.

## Choose a template

| Template | Use it when... | Structure |
| --- | --- | --- |
| [`single-webview`](./packages/single-webview) | your extension has one React webview and you want the smallest setup | extension + React live in one npm package |
| [`separate-webview-ui`](./packages/separate-webview-ui) | the React UI should behave like its own frontend application | extension package + nested `webview-ui/` package |
| [`multi-webview`](./packages/multi-webview) | your extension has multiple related React webviews that should share components, theme tokens, messaging, and dependencies | one package + multiple Vite webview entries |
| [`scaffold`](./packages/scaffold) | you want a generator-style baseline to build from | conventional VS Code scaffold + separate `webview-ui/` |

### Quick choice

```text
One webview?
├─ yes → single-webview
└─ no
   └─ Multiple related webviews?
      ├─ yes → multi-webview
      └─ no / frontend is independently managed → separate-webview-ui
```

The `scaffold` package is useful when you want to see the less-opinionated starting point.

## Repository structure

```text
.
├── package.json
├── scripts/
│   └── run-workspaces.mjs
└── packages/
    ├── single-webview/
    ├── separate-webview-ui/
    ├── multi-webview/
    └── scaffold/
```

The repository root is only the npm workspace and orchestration layer.

Each template owns its own:

- extension source
- React source
- Vite configuration
- TypeScript configuration
- VS Code contribution points
- development scripts
- documentation
- browser-preview setup where supported

## Install

From the repository root:

```bash
npm install
```

npm discovers the template packages through:

```json
{
  "workspaces": ["packages/*"]
}
```

## Work on one template

You usually do **not** need to run every template.

### Single webview

```bash
npm run dev:single
```

### Separate frontend package

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

You can also use npm's workspace selector directly:

```bash
npm run dev --workspace react-webview-vite-multi-webview
```

## Run repository-wide checks

The default root scripts use npm's native workspace support:

```bash
npm run build
npm run typecheck
npm run lint
npm test
```

For example:

```json
{
  "build": "npm run build --workspaces --if-present",
  "typecheck": "npm run typecheck --workspaces --if-present",
  "lint": "npm run lint --workspaces --if-present",
  "test": "npm test --workspaces --if-present"
}
```

This is the shortest and most familiar way to run the same script across every workspace that defines it.

### Rich workspace runner

The repository also keeps:

```text
scripts/run-workspaces.mjs
```

and exposes it as a package binary:

```json
{
  "bin": {
    "run-workspaces": "./scripts/run-workspaces.mjs"
  }
}
```

Use it when you want explicit per-package output:

```bash
npm run workspaces:run -- build
```

or, when the package binary is available on your PATH:

```bash
run-workspaces build
```

Example output:

```text
RUN  multi-webview — npm run build
PASS multi-webview

SKIP scaffold — script "build" is not defined

Workspace "build" complete: 3 ran, 1 skipped.
```

The CLI is useful for local diagnostics and CI logs because it reports `RUN`, `SKIP`, `PASS`, and `FAIL` explicitly.

## Template details

### `single-webview`

Use this for the common case: one extension, one React panel.

```text
single-webview/
├── src/
│   ├── extension.ts
│   └── webview/
├── vite.extension.config.ts
└── vite.webview.config.ts
```

The extension host and React webview use separate build configurations but share one npm package.

Good fit for:

- settings panels
- inspectors
- custom editors with one primary UI
- small extension dashboards

### `separate-webview-ui`

Use this when the browser UI should have a stronger application boundary.

```text
separate-webview-ui/
├── src/
│   └── extension.ts
└── webview-ui/
    ├── package.json
    ├── vite.config.ts
    └── src/
```

Good fit when the frontend needs its own:

- dependencies
- ESLint configuration
- TypeScript project
- browser-oriented development workflow
- independent build lifecycle

### `multi-webview`

Use this when one extension contains several related webviews.

```text
multi-webview/
└── src/
    ├── extension/
    ├── shared/
    └── webviews/
        ├── dashboard/
        ├── settings/
        └── shared/
```

The example demonstrates:

- multiple Vite entry points
- reusable webview panel creation
- shared message contracts
- shared VS Code API wrapper
- browser preview shim
- private `--webview-*` theme tokens
- shared CSS plus per-webview CSS

This is the best starting point when multiple views belong to the same extension and should reuse the same React infrastructure.

### `scaffold`

This package keeps a more generator-oriented project shape.

Use it as a reference when you want to compare the template architecture with a conventional VS Code extension scaffold before applying the Vite/webview patterns.

## Browser preview

The Vite-based templates include browser-preview patterns so React UI work does not require reopening a VS Code webview for every change.

The shared wrapper chooses between:

```text
inside VS Code
→ acquireVsCodeApi()

normal browser
→ preview shim
```

The shim is only for frontend development. Real VS Code API behavior still has to be verified in the Extension Development Host.

## Theme model

The React components use application-owned CSS variables such as:

```css
--webview-background
--webview-foreground
--webview-button-background
```

The shared CSS maps VS Code theme variables into those tokens when available and provides normal-browser defaults otherwise.

```text
React component
→ --webview-* token
→ browser default
   or
→ VS Code --vscode-* value
```

This keeps reusable components independent from the host environment.

## Adding another template

Add a self-contained package under:

```text
packages/<template-name>/
```

Give it a unique package name and its own README.

The root workspace discovers it automatically through `packages/*`.

If the package defines `build`, `typecheck`, `lint`, or `test`, the root workspace runner will include it in the corresponding repository-wide command.

## Package names

```text
react-webview-vite-single-webview
react-webview-vite-separate-webview-ui
react-webview-vite-multi-webview
react-webview-vite-scaffold
```

All template packages are private examples; the names exist to make npm workspace selection predictable and unambiguous.
