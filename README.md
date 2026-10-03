# Build a VS Code Webview with React, Vite, Tailwind CSS, and VS Code-Themed Components

A VS Code webview lets an extension render a browser-based UI inside the editor.

That means you can use tools you already know—React, Vite, Tailwind CSS, and normal browser APIs—while still integrating with VS Code commands, notifications, configuration, files, and the rest of the extension API.

The trick is understanding one architectural boundary:

> The React app and the VS Code extension run in different environments.

Once that is clear, the setup becomes much easier to reason about.

In this post, we'll build a small webview extension with:

- React
- Vite
- Tailwind CSS
- VS Code theme variables
- message passing between the webview and extension host

The complete runnable example is here:

**https://github.com/moyarich/react-webview-vite-template-1**

---

## What we're building

The UI is intentionally small.

There is one React button.

When you click it:

```text
React button
    ↓
webview postMessage(...)
    ↓
VS Code extension
    ↓
showInformationMessage(...)
    ↓
extension postMessage(...)
    ↓
React updates its status
```

That single round trip is the foundation for much richer webviews: settings screens, dashboards, inspectors, editors, and custom developer tools.

---

## Start with the mental model

A VS Code extension with a webview contains two runtimes.

One runs in the VS Code extension host.

The other runs in a browser.

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

The React webview cannot import and use the `vscode` module directly.

Instead, React sends a message to the extension host.

The extension handles VS Code-specific work and can send a response back.

That is the core architecture.

---

## Keep everything in one package

For this kind of extension, a single package keeps the project easy to understand:

```text
src/
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

vite.extension.config.ts
vite.webview.config.ts
tsconfig.json
tsconfig.webview.json
```

There is one install:

```bash
npm install
```

One lockfile.

One source tree.

And one output directory:

```text
dist/
├── extension.js
└── webview/
    ├── webview.js
    └── webview.css
```

The two runtimes stay separate through their build configs and TypeScript configs.

---

## Run the example first

Clone or download the repository:

```bash
npm install
```

Open it in VS Code and press:

```text
F5
```

The checked-in launch configuration runs the full build before opening the Extension Development Host.

Then open the Command Palette and run:

```text
Open React Webview
```

Click:

```text
Send message to VS Code
```

You should get a native VS Code notification and then see the React status change to:

```text
VS Code received the message.
```

At that point, both sides of the architecture are working.

---

## Use Vite for both runtimes

The extension host and the webview are different runtimes, but they can still use the same build tool.

The scripts are explicit:

```json
{
  "build": "vite build --config vite.extension.config.ts && vite build --config vite.webview.config.ts",
  "build:extension": "vite build --config vite.extension.config.ts",
  "build:webview": "vite build --config vite.webview.config.ts",
  "watch": "concurrently -k -n extension,webview \"npm run watch:extension\" \"npm run watch:webview\"",
  "watch:extension": "vite build --watch --mode development --config vite.extension.config.ts",
  "watch:webview": "vite build --watch --mode development --config vite.webview.config.ts"
}
```

This keeps the two build targets visible without introducing separate npm projects.

---

## The extension build is a Node build

The extension runs in VS Code's Node.js extension host.

So `vite.extension.config.ts` looks like a Node/server build:

```ts
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    ssr: "src/extension.ts",
    target: "node22",
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      external: ["vscode"],
      output: {
        format: "cjs",
        exports: "named",
        entryFileNames: "extension.js",
      },
    },
  },
  ssr: {
    noExternal: true,
  },
});
```

Two details matter here.

First, the extension emits CommonJS.

Second, `vscode` stays external:

```ts
external: ["vscode"]
```

VS Code provides that module at runtime.

The output is:

```text
dist/extension.js
```

and `package.json` points to it:

```json
{
  "main": "./dist/extension.js"
}
```

---

## The webview build is a browser build

The webview uses React and Tailwind:

```ts
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  build: {
    target: "es2022",
    outDir: "dist/webview",
    emptyOutDir: false,
    cssCodeSplit: false,
    minify: mode === "production",
    rollupOptions: {
      input: "src/webview/index.tsx",
      output: {
        entryFileNames: "webview.js",
        assetFileNames: (assetInfo) =>
          assetInfo.name?.endsWith(".css")
            ? "webview.css"
            : "assets/[name]-[hash][extname]",
        format: "iife",
        inlineDynamicImports: true,
      },
    },
  },
}));
```

For a small webview, predictable filenames are useful:

```text
webview.js
webview.css
```

The extension can reference those files directly without needing an asset manifest.

---

## The extension owns the HTML shell

The React app does not need a normal `index.html` file.

The extension creates the HTML because it also controls webview security and resource access.

First, define the built webview directory:

```ts
const webviewRoot = vscode.Uri.joinPath(
  context.extensionUri,
  "dist",
  "webview",
);
```

Then create the panel:

```ts
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

A webview cannot load ordinary filesystem paths.

Convert the built files with `asWebviewUri`:

```ts
const scriptUri = webview.asWebviewUri(
  vscode.Uri.joinPath(webviewRoot, "webview.js"),
);

const styleUri = webview.asWebviewUri(
  vscode.Uri.joinPath(webviewRoot, "webview.css"),
);
```

The HTML shell only needs a root element and the built assets:

```html
<body>
  <div id="root"></div>
  <script nonce="..." src=".../webview.js"></script>
</body>
```

React mounts into `#root` just like it would in a normal browser app.

---

## Add a Content Security Policy

Webviews should restrict what they can execute.

The example uses a CSP like this:

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

The script tag gets the matching nonce.

The goal is simple:

- allow only the resources the webview needs
- avoid broad script permissions
- keep the panel isolated

---

## Tailwind for layout, VS Code variables for color

Tailwind works well in a webview, but the UI should still feel like part of VS Code.

VS Code exposes theme values as CSS variables:

```css
var(--vscode-editor-background)
var(--vscode-foreground)
var(--vscode-descriptionForeground)
var(--vscode-panel-border)
var(--vscode-button-background)
var(--vscode-button-foreground)
var(--vscode-button-hoverBackground)
```

So instead of hard-coding:

```tsx
<button className="bg-blue-600 text-white">
```

use VS Code's theme variables through Tailwind:

```tsx
<button
  className="
    rounded
    bg-[var(--vscode-button-background)]
    px-3
    py-2
    text-[var(--vscode-button-foreground)]
    hover:bg-[var(--vscode-button-hoverBackground)]
  "
>
```

This gives you Tailwind's utility classes while still respecting the user's active VS Code theme.

The example only includes two wrappers:

```text
VSCodeButton
VSCodeCard
```

That's enough to demonstrate the pattern without introducing a full component library.

---

## Send a message from React to VS Code

Inside the webview, VS Code exposes:

```ts
acquireVsCodeApi()
```

TypeScript does not know about that global automatically, so declare the small part the app uses:

```ts
type VSCodeApi = {
  postMessage: (message: unknown) => void;
};

declare function acquireVsCodeApi(): VSCodeApi;
```

Then create a tiny wrapper:

```ts
export type WebviewMessage = {
  type: "showMessage";
  message: string;
};

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

That sends data from the browser runtime to the extension host.

---

## Receive the message in the extension

The extension listens with:

```ts
panel.webview.onDidReceiveMessage(async (message: WebviewMessage) => {
  if (message.type !== "showMessage") {
    return;
  }

  await vscode.window.showInformationMessage(message.message);
});
```

This is the correct place to use VS Code APIs.

The webview asks for an action.

The extension performs it.

---

## Send a response back to React

The extension replies:

```ts
await panel.webview.postMessage({
  type: "messageShown",
  message: "VS Code received the message.",
});
```

React listens for browser `message` events:

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

Now the complete flow works in both directions:

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

---

## Development workflow

To watch both runtimes:

```bash
npm run watch
```

or:

```bash
npm run dev
```

That runs both Vite builds side by side.

For extension debugging, `F5` is still the simplest workflow.

If you prefer launching from the terminal:

```bash
npm run build
npm run dev:extension
```

The helper launches:

```bash
code --extensionDevelopmentPath=...
```

If you use VS Code Insiders:

```bash
CODE_COMMAND=code-insiders npm run dev:extension
```

---

## Keep the architecture simple

The important pieces are:

1. the extension host and webview are separate runtimes
2. each runtime gets its own Vite config
3. the extension controls resource access and the HTML shell
4. React owns the UI
5. VS Code APIs stay in the extension host
6. messages connect the two sides
7. VS Code theme variables keep the UI visually integrated

Once those pieces are in place, you can add richer behavior without changing the fundamental model.

---

## Full documentation

The repository also includes MoyaForge-compatible reference docs:

```text
docs/
├── page.mdx
├── 01-getting-started/
│   └── page.mdx
├── 02-guides/
│   ├── 01-architecture/
│   │   └── page.mdx
│   ├── 02-vite-builds/
│   │   └── page.mdx
│   ├── 03-webview-messaging/
│   │   └── page.mdx
│   └── 04-vscode-themed-components/
│       └── page.mdx
└── 03-reference/
    ├── 01-scripts/
    │   └── page.mdx
    └── 02-troubleshooting/
        └── page.mdx
```

The README stays focused as a blog post, while the `docs/` directory contains the deeper implementation and reference material.

---

## Final mental model

```text
React owns the UI.
VS Code owns the editor APIs.
Vite builds both runtimes.
Messages connect them.
```

The complete runnable example is here:

**https://github.com/moyarich/react-webview-vite-template-1**
