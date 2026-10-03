# Build a VS Code Webview with React, Vite, Tailwind CSS, and VS Code-Themed Components

The first version of this tutorial worked.

It also ended up teaching more architecture than it needed to.

I had a VS Code extension at the root, a separate Vite app in `webview-ui/`, two package files, two dependency installs, different build commands, and enough demo state that the actual webview model was getting buried.

So I rebuilt the example around one question:

> What is the smallest project that clearly shows how a React webview and a VS Code extension talk to each other?

The result is a much simpler setup:

```text
one package.json
one package-lock.json
one src/ tree
two Vite configs
two runtimes
one message round trip
```

In this post, I'll build that version.

The complete runnable example is in:

**https://github.com/moyarich/react-webview-vite-template-1**

---

## What we're building

The UI is intentionally boring.

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

That's enough to teach the important part.

Once that flow is clear, a settings screen, inspector, dashboard, visual editor, or custom tool is just a larger version of the same architecture.

---

## Start with the mental model, not the framework

The most useful thing to understand about a VS Code webview is that you are building **two applications that happen to live in the same extension**.

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

This explains most of the weirdness people hit when they first build a webview.

The extension can do this:

```ts
vscode.window.showInformationMessage("Hello");
```

React cannot.

React is running in an isolated browser context.

So instead of calling VS Code APIs directly, React sends a message to the extension host. The extension does the VS Code-specific work and can send a message back.

That boundary is the architecture.

React and Vite are just implementation details on top of it.

---

## I prefer one package for this kind of extension

My earlier setup had a nested frontend project:

```text
src/
  extension.ts

webview-ui/
  package.json
  vite.config.ts
  src/
```

That works, and for a separately deployed frontend it can make sense.

For a webview that is simply part of one extension, though, I now prefer this:

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

Everything belongs to one product.

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

The two runtimes still stay separate. They just don't need separate npm projects.

---

## Run the example before reading the rest

If you clone or download the repository:

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

I like using the same build tool for the extension and the webview, but not the same build configuration.

They run in different environments, so they need different outputs.

The scripts are deliberately explicit:

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

I find this much easier to reason about than hiding both builds behind one giant config.

---

## The extension build is a Node build

The extension runs in VS Code's Node.js extension host.

So `vite.extension.config.ts` looks more like a server build than a browser build:

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

There are two important details here.

First, the output is CommonJS because that is what the extension entry point expects.

Second, `vscode` stays external:

```ts
external: ["vscode"]
```

You do not bundle the VS Code API.

VS Code provides that module when the extension runs.

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

The webview uses React and Tailwind, so its Vite config has a different job:

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

For a website, hashed filenames are great.

For a tiny VS Code webview, I prefer predictable entry files:

```text
webview.js
webview.css
```

That means the extension does not need a manifest or asset discovery step just to render one panel.

---

## The extension owns the HTML shell

The React app does not need a normal `index.html` file in this setup.

The extension creates the HTML because it also needs to control webview security and resource URLs.

First, restrict local resources to the built webview directory:

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

A webview cannot load an ordinary filesystem path, so convert the built files with `asWebviewUri`:

```ts
const scriptUri = webview.asWebviewUri(
  vscode.Uri.joinPath(webviewRoot, "webview.js"),
);

const styleUri = webview.asWebviewUri(
  vscode.Uri.joinPath(webviewRoot, "webview.css"),
);
```

The final HTML shell is very small:

```html
<body>
  <div id="root"></div>
  <script nonce="..." src=".../webview.js"></script>
</body>
```

React mounts into `#root` exactly as it would in a normal browser app.

---

## Don't skip the Content Security Policy

A webview is an isolated browser surface inside the editor.

Treat it like one.

The example uses a restrictive CSP:

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

The goal is not to make the policy complicated.

The goal is to avoid fixing asset-loading problems by broadly enabling arbitrary scripts and remote resources.

Give the webview exactly what it needs.

---

## Tailwind for layout, VS Code variables for color

I like Tailwind in webviews, but I do not want my extension to look like a random website embedded in VS Code.

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

I can use Tailwind's arbitrary values with VS Code's theme tokens:

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

That gives me Tailwind's composition model without fighting the editor theme.

The tutorial only includes two wrappers:

```text
VSCodeButton
VSCodeCard
```

That's enough.

A hello-world example does not need a component library.

---

## Now the important part: React → extension

Inside the webview, VS Code exposes:

```ts
acquireVsCodeApi()
```

TypeScript does not know that global automatically, so the example declares only the piece it uses:

```ts
type VSCodeApi = {
  postMessage: (message: unknown) => void;
};

declare function acquireVsCodeApi(): VSCodeApi;
```

Then the wrapper is tiny:

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

The button sends:

```tsx
postMessage({
  type: "showMessage",
  message: "Hello from the React webview!",
});
```

That's the browser side done.

---

## Extension → VS Code → React

The extension listens for that message:

```ts
panel.webview.onDidReceiveMessage(async (message: WebviewMessage) => {
  if (message.type !== "showMessage") {
    return;
  }

  await vscode.window.showInformationMessage(message.message);
});
```

This is the correct place to call a VS Code API.

After showing the notification, the extension sends a response back:

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

And that's the complete bridge.

No settings model.

No persistence layer.

No unrelated demo state.

Just the architecture.

---

## Development is now one command too

To watch both runtimes:

```bash
npm run watch
```

or:

```bash
npm run dev
```

That runs the extension and webview Vite builds side by side.

For most people learning the project, I still recommend `F5` because VS Code already understands extension debugging.

If you prefer a terminal-driven workflow, the repo also includes:

```bash
npm run dev:extension
```

which launches:

```bash
code --extensionDevelopmentPath=...
```

If you use VS Code Insiders:

```bash
CODE_COMMAND=code-insiders npm run dev:extension
```

---

## Why I like this version better

The original version of this tutorial had more UI, more state, more files, and a separate frontend package.

None of those choices were individually wrong.

They just distracted from the thing I actually wanted to teach.

The new version has a cleaner learning path:

1. understand that there are two runtimes
2. build each runtime with the correct Vite config
3. load the browser assets safely
4. use VS Code theme variables instead of inventing another theme
5. send one message in each direction

After that, add complexity because your extension needs it—not because the tutorial started with it.

---

## The full docs are now separate from the blog

I also split the reference material out of this article.

The repository now has MoyaForge-compatible docs under:

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

That lets the README stay readable as a post while the repository still has proper reference documentation.

---

## Final mental model

If you remember only this, you're in good shape:

```text
React owns the UI.
VS Code owns the editor APIs.
Vite builds both runtimes.
Messages connect them.
```

The runnable source is here:

**https://github.com/moyarich/react-webview-vite-template-1**

And the deeper implementation notes live in the repository's `docs/` directory.
