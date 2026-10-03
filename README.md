# Build a VS Code Webview with React, Vite, Tailwind CSS, and VS Code-Themed Components

This repository is a **small, runnable teaching example** for building a VS Code webview with React.

It intentionally uses:

- one `package.json`
- one lockfile
- one `src/` tree
- Vite for both the extension host and the webview
- Tailwind CSS for layout
- VS Code CSS variables for theme-aware components

The example does one complete round trip:

```text
React button
    ↓
webview postMessage(...)
    ↓
VS Code extension
    ↓
showInformationMessage(...)
    ↓
panel.webview.postMessage(...)
    ↓
React updates its status
```

That is the core pattern behind settings screens, inspectors, dashboards, visual editors, and other rich VS Code webviews.

## Run it first

Clone or download the repository, then run:

```bash
npm install
```

Open the project in VS Code and press:

```text
F5
```

The included launch configuration runs `npm run build` before starting the Extension Development Host, so both the extension and the React webview are built automatically.

In the new VS Code window, open the Command Palette and run:

```text
Open React Webview
```

Click **Send message to VS Code**.

VS Code shows a notification and the React UI changes its status to:

```text
VS Code received the message.
```

You now know that communication works in both directions.

---

## The most important idea: two runtimes

A webview extension contains two programs.

```text
Extension host                         Webview
--------------                         -------
Node.js                                Browser
src/extension.ts                       src/webview/*
VS Code API available                  React + DOM available
No browser DOM                         No direct VS Code API
        │                                  │
        └────────── messages ──────────────┘
```

The extension can call:

```ts
vscode.window.showInformationMessage("Hello");
```

The React webview cannot import and use the VS Code API directly.

Instead:

```text
React owns the UI.
The extension owns VS Code APIs.
Messages connect them.
```

That boundary explains the architecture of the entire project.

---

## Project structure

The important files are:

```text
react-webview-vite-template-1/
├── package.json
├── package-lock.json
├── tsconfig.json
├── tsconfig.webview.json
├── vite.extension.config.ts
├── vite.webview.config.ts
├── scripts/
│   └── run-extension-dev.mjs
└── src/
    ├── extension.ts
    └── webview/
        ├── App.tsx
        ├── index.tsx
        ├── index.css
        ├── vscode.d.ts
        ├── api/
        │   └── vscode-api.ts
        └── components/
            └── vscode-ui.tsx
```

Both runtimes build into one `dist/` directory:

```text
dist/
├── extension.js
└── webview/
    ├── webview.js
    └── webview.css
```

The build boundary is deliberately obvious:

```text
src/extension.ts
    ↓ vite.extension.config.ts
dist/extension.js

src/webview/*
    ↓ vite.webview.config.ts
dist/webview/*
```

---

# 1. Register a VS Code command

The root `package.json` contributes one command:

```json
{
  "contributes": {
    "commands": [
      {
        "command": "react-webview-vite.openPanel",
        "title": "Open React Webview"
      }
    ]
  }
}
```

The same ID is registered in `src/extension.ts`:

```ts
vscode.commands.registerCommand(
  "react-webview-vite.openPanel",
  () => {
    // Open the webview.
  },
);
```

If a command does not appear or does nothing, check that these two IDs match.

---

# 2. Create the webview panel

The extension creates the panel with `createWebviewPanel`:

```ts
const webviewRoot = vscode.Uri.joinPath(
  context.extensionUri,
  "dist",
  "webview",
);

const panel = vscode.window.createWebviewPanel(
  "reactWebviewVite",
  "React Webview",
  vscode.ViewColumn.One,
  {
    enableScripts: true,
    localResourceRoots: [webviewRoot],
  },
);
```

Two options matter:

- `enableScripts: true` lets the React JavaScript bundle execute.
- `localResourceRoots` limits local file access to the built webview directory.

The webview does not need access to the whole extension.

---

# 3. Load Vite output safely

A webview cannot load an ordinary filesystem path.

Convert extension files with `webview.asWebviewUri(...)`:

```ts
const scriptUri = webview.asWebviewUri(
  vscode.Uri.joinPath(webviewRoot, "webview.js"),
);

const styleUri = webview.asWebviewUri(
  vscode.Uri.joinPath(webviewRoot, "webview.css"),
);
```

Think of that conversion as:

```text
extension file
    ↓
webview-safe URL
```

The HTML shell only needs a React root plus the built CSS and JavaScript:

```html
<body>
  <div id="root"></div>
  <script nonce="..." src=".../webview.js"></script>
</body>
```

---

# 4. Use a Content Security Policy

VS Code webviews are isolated browser surfaces.

The example restricts resource loading with a CSP:

```html
<meta
  http-equiv="Content-Security-Policy"
  content="
    default-src 'none';
    style-src WEBVIEW_SOURCE;
    script-src 'nonce-RANDOM_VALUE';
  "
/>
```

The script receives the matching nonce.

Do not fix a loading problem by broadly allowing arbitrary scripts or remote resources. Give the webview only the permissions it needs.

---

# 5. Build both runtimes with Vite

This project uses two Vite configurations because the runtimes are different.

## Extension build

`vite.extension.config.ts` builds:

```text
src/extension.ts
→ dist/extension.js
```

The extension runs in VS Code's Node.js extension host, so the configuration:

- targets Node
- emits CommonJS
- keeps the `vscode` module external

The important shape is:

```ts
build: {
  ssr: "src/extension.ts",
  target: "node22",
  outDir: "dist",
  rollupOptions: {
    external: ["vscode"],
    output: {
      format: "cjs",
      entryFileNames: "extension.js",
    },
  },
},
```

VS Code supplies the `vscode` module at runtime, so it should not be bundled.

## Webview build

`vite.webview.config.ts` builds:

```text
src/webview/index.tsx
→ dist/webview/webview.js
→ dist/webview/webview.css
```

The webview is a browser application, so this config uses React and Tailwind:

```ts
plugins: [react(), tailwindcss()]
```

It also uses predictable output names:

```ts
entryFileNames: "webview.js"
```

and a single JavaScript entry:

```ts
format: "iife",
inlineDynamicImports: true
```

For a small VS Code webview, predictable files make the extension-side HTML much easier to understand than hashed website assets.

---

# 6. Why there are two TypeScript configs

The extension and webview do not have the same globals.

The extension needs Node and VS Code types.

The webview needs browser DOM and React types.

The root `tsconfig.json` excludes:

```text
src/webview/**
```

while `tsconfig.webview.json` includes the browser-specific files and:

```json
{
  "lib": ["ES2022", "DOM"],
  "jsx": "react-jsx",
  "moduleResolution": "bundler"
}
```

This prevents accidentally treating browser code as extension-host code.

Run both checks with:

```bash
npm run typecheck
```

---

# 7. Add Tailwind without hard-coding a theme

The webview CSS starts with:

```css
@import "tailwindcss";
```

Tailwind handles layout and spacing.

VS Code provides CSS variables for the active theme:

```css
var(--vscode-editor-background)
var(--vscode-foreground)
var(--vscode-descriptionForeground)
var(--vscode-panel-border)
var(--vscode-button-background)
var(--vscode-button-foreground)
var(--vscode-button-hoverBackground)
```

Instead of:

```tsx
<button className="bg-blue-600 text-white">
```

the example uses:

```tsx
<button
  className="
    bg-[var(--vscode-button-background)]
    text-[var(--vscode-button-foreground)]
    hover:bg-[var(--vscode-button-hoverBackground)]
  "
>
```

Now the button follows light, dark, and custom VS Code themes automatically.

The example intentionally contains only two themed components:

```text
VSCodeButton
VSCodeCard
```

A teaching project does not need a design system before it can explain a webview.

---

# 8. Send a message from React to VS Code

VS Code provides `acquireVsCodeApi()` inside the webview.

TypeScript needs a small declaration for it:

```ts
type VSCodeApi = {
  postMessage: (message: unknown) => void;
};

declare function acquireVsCodeApi(): VSCodeApi;
```

The wrapper in `src/webview/api/vscode-api.ts` gets that API once:

```ts
const vscode = acquireVsCodeApi();

export function postMessage(message: WebviewMessage) {
  vscode.postMessage(message);
}
```

The React button sends:

```tsx
postMessage({
  type: "showMessage",
  message: "Hello from the React webview!",
});
```

The browser has now sent data across the runtime boundary.

---

# 9. Receive the message in the extension

The extension listens with:

```ts
panel.webview.onDidReceiveMessage(async (message) => {
  // Handle messages from React.
});
```

For this example:

```ts
if (message.type !== "showMessage") {
  return;
}

await vscode.window.showInformationMessage(message.message);
```

That VS Code API call belongs in the extension host, not in React.

---

# 10. Send a response back to React

The extension replies:

```ts
await panel.webview.postMessage({
  type: "messageShown",
  message: "VS Code received the message.",
});
```

React listens for browser message events:

```ts
useEffect(() => {
  const handleMessage = (event: MessageEvent<ExtensionMessage>) => {
    if (event.data.type === "messageShown") {
      setStatus(event.data.message);
    }
  };

  window.addEventListener("message", handleMessage);

  return () => window.removeEventListener("message", handleMessage);
}, []);
```

The complete flow is:

```text
React
  │
  │ postMessage
  ▼
Extension host
  │
  │ VS Code API
  │
  │ panel.webview.postMessage
  ▼
React
```

Once that makes sense, most larger webview applications are extensions of the same pattern.

---

# Build and development commands

All commands run from the repository root.

## Build everything

```bash
npm run build
```

Equivalent to:

```bash
npm run build:extension
npm run build:webview
```

The scripts are intentionally explicit:

```json
{
  "build": "vite build --config vite.extension.config.ts && vite build --config vite.webview.config.ts",
  "build:extension": "vite build --config vite.extension.config.ts",
  "build:webview": "vite build --config vite.webview.config.ts"
}
```

## Watch both runtimes

```bash
npm run watch
```

This runs:

```text
extension → Vite watch → dist/extension.js
webview   → Vite watch → dist/webview/*
```

The scripts are:

```json
{
  "watch": "concurrently -k -n extension,webview \"npm run watch:extension\" \"npm run watch:webview\"",
  "watch:extension": "vite build --watch --mode development --config vite.extension.config.ts",
  "watch:webview": "vite build --watch --mode development --config vite.webview.config.ts"
}
```

`npm run dev` is an alias for `npm run watch`.

---

# Two ways to launch the extension

## Beginner path: F5

After:

```bash
npm install
```

press `F5`.

The checked-in VS Code launch configuration runs:

```bash
npm run build
```

before starting the Extension Development Host.

This is the easiest path when learning.

## Terminal path: dev:extension

You can also launch the Extension Development Host from a terminal:

```bash
npm run build
npm run dev:extension
```

`dev:extension` runs:

```bash
node ./scripts/run-extension-dev.mjs
```

The script launches the current repository with:

```text
code --extensionDevelopmentPath=...
```

If your VS Code CLI command is not `code`, set:

```bash
CODE_COMMAND=code-insiders npm run dev:extension
```

Keep `F5` as the simplest learning workflow; use `dev:extension` when you want terminal-driven development.

---

# Reloading during development

Start the watchers:

```bash
npm run watch
```

For React-only changes, close and reopen **Open React Webview**.

For extension-host changes, reload the Extension Development Host:

- macOS: `Cmd + R`
- Windows/Linux: `Ctrl + R`

---

# Common problems

## The panel is blank

Confirm the build produced:

```text
dist/extension.js
dist/webview/webview.js
dist/webview/webview.css
```

Then run:

```text
Developer: Toggle Developer Tools
```

and inspect the console.

## JavaScript is blocked

Confirm:

```ts
enableScripts: true
```

and verify that the script nonce matches the nonce in the CSP.

## CSS or JavaScript cannot load

Check:

```text
localResourceRoots
webview.asWebviewUri(...)
actual Vite output paths
```

## React cannot call vscode.window

That is expected.

React runs in a browser context.

Send a message to `src/extension.ts` and call the VS Code API there.

---

# Why the example stays small

The point of this repository is not to demonstrate a complete application.

It teaches seven pieces:

1. register a command
2. create a webview
3. build both runtimes with Vite
4. load the generated webview assets safely
5. style React with Tailwind and VS Code theme variables
6. send React → extension messages
7. send extension → React messages

Everything else can be added after this architecture is understood.

Useful next steps for a real extension include:

- shared typed message contracts
- persisted webview state
- VS Code configuration APIs
- routing
- multiple webview views
- richer component primitives

## Minimal mental model

```text
React owns the UI.
VS Code extension owns VS Code APIs.
Vite builds both runtimes.
Messages connect them.
```
