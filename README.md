# Build Multiple VS Code Webviews with React, Vite, and Tailwind CSS

This template shows how to build **multiple React webviews inside one VS Code extension** while keeping shared browser infrastructure in one place.

The example includes two webviews:

- **Dashboard**
- **Settings**

Both reuse the same:

- React dependencies
- VS Code API wrapper
- browser preview shim
- message contracts
- themed components
- private CSS theme tokens
- Vite build

## Mental model

```text
VS Code extension host
├── Open React Dashboard
│   └── dashboard.js
└── Open React Settings
    └── settings.js

React webviews
├── dashboard/
├── settings/
└── shared/
    ├── api/
    ├── components/
    └── styles/
```

The extension and all webviews stay in one npm package.

## Project structure

```text
src/
├── extension.ts
├── extension/
│   └── webviews/
│       └── openWebviewPanel.ts
├── shared/
│   └── messages.ts
└── webviews/
    ├── dashboard/
    │   ├── App.tsx
    │   └── index.tsx
    ├── settings/
    │   ├── App.tsx
    │   └── index.tsx
    └── shared/
        ├── api/
        │   └── vscode-api.ts
        ├── components/
        │   ├── vscode-ui.tsx
        │   └── WebviewExample.tsx
        ├── styles/
        │   └── index.css
        └── vscode.d.ts
```

## Multiple Vite entry points

`vite.webview.config.ts` builds each webview as its own entry:

```ts
rollupOptions: {
  input: {
    dashboard: "src/webviews/dashboard/index.tsx",
    settings: "src/webviews/settings/index.tsx",
  },
}
```

The build produces separate entry bundles plus shared chunks:

```text
dist/webviews/
├── dashboard.js
├── settings.js
├── webview.css
└── chunks/
    └── ...
```

That lets Vite share React and common webview code instead of treating every webview as a separate application.

## Shared extension-side panel creation

The extension uses one reusable helper:

```ts
openWebviewPanel(context, "dashboard");
openWebviewPanel(context, "settings");
```

The helper owns:

- `createWebviewPanel`
- CSP
- nonces
- resource URIs
- message handling
- shared stylesheet loading

Only the webview definition changes:

```ts
const WEBVIEWS = {
  dashboard: {
    viewType: "reactWebviewVite.dashboard",
    title: "React Dashboard",
    entry: "dashboard",
  },
  settings: {
    viewType: "reactWebviewVite.settings",
    title: "React Settings",
    entry: "settings",
  },
};
```

## Shared message contracts

The Node and browser runtimes share message types through:

```text
src/shared/messages.ts
```

Each outgoing message includes its source webview:

```ts
postMessage({
  type: "showMessage",
  source: "dashboard",
  message: "Hello from the dashboard webview!",
});
```

## Theme tokens

React components do not reference `--vscode-*` variables directly.

Instead, shared CSS defines private tokens with browser defaults:

```css
:root {
  --webview-foreground: var(--vscode-foreground, #1f2328);
  --webview-background: var(--vscode-editor-background, #ffffff);
  --webview-button-background:
    var(--vscode-button-background, #0969da);
}
```

Components only depend on `--webview-*` variables.

That gives browser previews stable defaults while VS Code themes override them automatically inside a real webview.

## Browser previews

Run:

```bash
npm run dev
```

This starts:

```text
extension watcher
webview watcher
browser preview
VS Code Extension Development Host
```

The default browser preview opens:

```text
/previews/dashboard.html
```

You can also open:

```text
/previews/settings.html
```

The browser uses the preview shim for `acquireVsCodeApi()`.

Inside VS Code, the same React code uses the real webview API.

## Commands

The extension contributes:

```text
Open React Dashboard
Open React Settings
```

The context submenu is:

```text
React Webviews
├── Open React Dashboard
└── Open React Settings
```

## Scripts

```text
npm run build
├── build:extension
└── build:webview

npm run watch
├── watch:extension
└── watch:webview

npm run dev
├── watch:extension
├── watch:webview
├── dev:preview
└── dev:extension
```

Use:

```bash
npm run dev:preview
```

for browser preview only, or:

```bash
npm run dev:extension
```

for the Extension Development Host only.

## Adding another webview

For a new `inspector` webview:

1. Create `src/webviews/inspector/App.tsx` and `index.tsx`.
2. Add `inspector` to `WebviewId`.
3. Add an `inspector` Vite input.
4. Add its definition to `WEBVIEWS`.
5. Register a command that calls `openWebviewPanel(context, "inspector")`.
6. Optionally add `previews/inspector.html`.

The shared messaging, components, theme tokens, and VS Code API wrapper do not need to be duplicated.

## Why this structure

The key idea is:

```text
one extension
+ multiple webview entry points
+ shared webview infrastructure
```

Use a separate frontend package only when the webview UI needs to behave as an independently managed application.
