# Build a VS Code Webview with React, Vite, Tailwind CSS, and VS Code-Themed Components

This repository is a **small, runnable teaching example** for building a VS Code webview with React.

It deliberately avoids application-specific features so the important architecture is easy to see.

The finished example does one round trip:

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

That same pattern is the foundation for settings screens, inspectors, dashboards, visual editors, and other richer extension UIs.

## Run the example first

If you downloaded or cloned this repository, you do **not** need to scaffold anything.

From the repository root:

```bash
npm install
```

The root install also:

1. installs the dependencies in `webview-ui`
2. builds the initial React webview assets

Then open the repository in VS Code and press:

```text
F5
```

A new **Extension Development Host** window opens.

Open the Command Palette and run:

```text
Open React Webview
```

You should see a React panel with a button labeled **Send message to VS Code**.

Click it. VS Code shows a notification, and the React UI changes its status to confirm the extension replied.

That proves both directions of communication are working.

---

## The most important concept: two runtimes

A VS Code extension with a webview is not one application.

It contains two programs running in different environments.

```text
Extension host                         Webview
--------------                         -------
Node.js                                Browser
src/extension.ts                       webview-ui/src/*
VS Code API available                  React + DOM available
No browser DOM                         No direct VS Code API
        │                                  │
        └────────── messages ──────────────┘
```

The extension can call APIs such as:

```ts
vscode.window.showInformationMessage("Hello");
```

The React app cannot import and use `vscode` directly.

Instead, the webview sends messages to the extension.

That boundary explains nearly every design decision in this project.

---

## Project structure

The teaching example only needs these files:

```text
react-webview-vite-template-1/
├── package.json
├── tsconfig.json
├── src/
│   ├── extension.ts
│   └── test/
│       └── extension.test.ts
└── webview-ui/
    ├── package.json
    ├── vite.config.ts
    └── src/
        ├── App.tsx
        ├── index.css
        ├── main.tsx
        ├── vscode.d.ts
        ├── api/
        │   └── vscode-api.ts
        └── components/
            └── vscode-ui.tsx
```

There are two build outputs:

```text
src/extension.ts
    ↓ TypeScript
out/extension.js

webview-ui/src/*
    ↓ Vite
webview-ui/dist/assets/index.js
webview-ui/dist/assets/index.css
```

The root project is the VS Code extension.

`webview-ui` is the browser application rendered inside the webview panel.

---

# Part 1: The extension host

## Register a command

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

This makes **Open React Webview** available in the Command Palette.

The same command ID is registered in `src/extension.ts`:

```ts
vscode.commands.registerCommand(
  "react-webview-vite.openPanel",
  () => {
    // Create the webview here.
  },
);
```

A useful debugging rule is:

> If a command does not appear or does nothing, confirm the command ID matches in both places.

---

## Create the webview panel

The extension creates a panel with:

```ts
const panel = vscode.window.createWebviewPanel(
  "reactWebviewVite",
  "React Webview",
  vscode.ViewColumn.One,
  {
    enableScripts: true,
    localResourceRoots: [
      vscode.Uri.joinPath(context.extensionUri, "webview-ui", "dist"),
    ],
  },
);
```

The important options are:

- `enableScripts: true` — lets the React JavaScript bundle run.
- `localResourceRoots` — limits which local extension files the webview can load.

The webview only needs built files from:

```text
webview-ui/dist
```

It does not need access to the entire repository.

---

## Convert local files to webview-safe URLs

A webview cannot load an extension file with a normal filesystem path.

Use `webview.asWebviewUri(...)`:

```ts
const scriptUri = webview.asWebviewUri(
  vscode.Uri.joinPath(
    extensionUri,
    "webview-ui",
    "dist",
    "assets",
    "index.js",
  ),
);
```

The same is done for the CSS file.

Think of `asWebviewUri` as:

```text
extension file path
        ↓
URL that the isolated webview is allowed to load
```

---

## Give the panel a small HTML shell

React still needs a page containing a root element:

```html
<body>
  <div id="root"></div>
  <script src=".../index.js"></script>
</body>
```

The extension creates this HTML in `getWebviewHtml()`.

The React app later attaches itself to:

```html
<div id="root"></div>
```

---

## Use a Content Security Policy

Webviews should restrict what they can execute.

This example uses a CSP similar to:

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

The script tag gets the matching nonce:

```html
<script nonce="RANDOM_VALUE" src="..."></script>
```

The key idea is:

> Do not solve webview loading problems by broadly enabling arbitrary scripts or remote resources.

Give the webview only what it needs.

---

# Part 2: Build the React webview with Vite

The frontend lives in:

```text
webview-ui/
```

If you were creating this project from scratch, you could start with:

```bash
npm create vite@latest webview-ui -- --template react-ts
```

Then install Tailwind's Vite integration:

```bash
cd webview-ui
npm install tailwindcss @tailwindcss/vite
```

This repository already contains that setup, so downloaded users only need the root:

```bash
npm install
```

---

## Make Vite output predictable filenames

The extension needs to know which files to put in its HTML.

The important part of `webview-ui/vite.config.ts` is:

```ts
build: {
  outDir: "dist",
  rollupOptions: {
    output: {
      entryFileNames: "assets/[name].js",
      chunkFileNames: "assets/[name].js",
      assetFileNames: "assets/[name].[ext]",
    },
  },
},
```

For this small example that gives the extension predictable paths such as:

```text
webview-ui/dist/assets/index.js
webview-ui/dist/assets/index.css
```

Without predictable asset names, Vite normally uses hashed production filenames such as:

```text
index-Bx82dA.js
```

Hashed assets are useful for websites, but they make a basic VS Code tutorial harder because the extension must discover the generated filename.

---

# Part 3: Add Tailwind without fighting VS Code themes

The webview starts with:

```css
@import "tailwindcss";
```

Tailwind handles layout and spacing.

VS Code provides CSS variables for the active editor theme.

For example:

```css
var(--vscode-editor-background)
var(--vscode-foreground)
var(--vscode-descriptionForeground)
var(--vscode-panel-border)
var(--vscode-button-background)
var(--vscode-button-foreground)
var(--vscode-button-hoverBackground)
```

So instead of hard-coding a button color:

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

Now the same component follows light, dark, and custom VS Code themes automatically.

## Keep themed components small

`webview-ui/src/components/vscode-ui.tsx` contains only two components:

```text
VSCodeButton
VSCodeCard
```

This is intentional.

A tutorial does not need a full design system before it can teach a webview.

Start with normal semantic HTML and wrap only patterns you actually reuse.

---

# Part 4: Send a message from React to VS Code

VS Code exposes `acquireVsCodeApi()` inside the webview.

TypeScript does not know about that browser global automatically, so `webview-ui/src/vscode.d.ts` declares the tiny portion used by this example:

```ts
type VSCodeApi = {
  postMessage: (message: unknown) => void;
};

declare function acquireVsCodeApi(): VSCodeApi;
```

The wrapper in `webview-ui/src/api/vscode-api.ts` acquires the API once:

```ts
const vscode = acquireVsCodeApi();

export function postMessage(message: WebviewMessage) {
  vscode.postMessage(message);
}
```

The React button calls it:

```tsx
postMessage({
  type: "showMessage",
  message: "Hello from the React webview!",
});
```

At this point the browser has sent data across the runtime boundary.

---

# Part 5: Receive the message in the extension

The extension listens with:

```ts
panel.webview.onDidReceiveMessage(async (message) => {
  // Handle messages from React.
});
```

For the tutorial message:

```ts
if (message.type !== "showMessage") {
  return;
}

await vscode.window.showInformationMessage(message.message);
```

This is where VS Code-specific work belongs.

React asked for something to happen.

The extension host performed the privileged VS Code API call.

---

# Part 6: Send a response back to React

Communication works both ways.

The extension replies:

```ts
await panel.webview.postMessage({
  type: "messageShown",
  message: "VS Code received the message.",
});
```

React listens to browser `message` events:

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

The complete round trip is now:

```text
React
  │
  │ vscode.postMessage(...)
  ▼
Extension host
  │
  │ VS Code API
  │
  │ panel.webview.postMessage(...)
  ▼
React
```

Once this makes sense, larger webview applications are mostly variations of the same pattern.

---

# Development workflow

## First install

From the repository root:

```bash
npm install
```

The root `postinstall` intentionally runs:

```text
npm ci --prefix webview-ui
npm run build:webview
```

That makes the downloaded repository immediately usable.

You do not need to manually enter `webview-ui` for initial setup.

## Run both watchers

During development:

```bash
npm run dev
```

This runs both:

```text
TypeScript watcher → src/extension.ts → out/extension.js
Vite watcher       → webview-ui/src/* → webview-ui/dist/*
```

Then press `F5` in VS Code.

## Build everything once

Use:

```bash
npm run build
```

That builds both the extension and the webview.

You can also run either half separately:

```bash
npm run build:extension
npm run build:webview
```

---

# Reloading changes

## When React code changes

Keep:

```bash
npm run dev
```

running.

Close the webview panel and run **Open React Webview** again.

## When extension code changes

Reload the Extension Development Host:

- macOS: `Cmd + R`
- Windows/Linux: `Ctrl + R`

Then open the webview again.

---

# Common mistakes

### The panel is blank

First confirm these files exist:

```text
webview-ui/dist/assets/index.js
webview-ui/dist/assets/index.css
```

Then open:

```text
Developer: Toggle Developer Tools
```

and inspect console errors.

### JavaScript is blocked

Confirm the panel uses:

```ts
enableScripts: true
```

and that the CSP nonce on the script tag matches the nonce allowed by the CSP.

### CSS or JavaScript cannot load

Check all three pieces:

```text
localResourceRoots
webview.asWebviewUri(...)
actual Vite output path
```

### React cannot call `vscode.window...`

That is expected.

React is running in the webview browser context.

Send a message to `src/extension.ts`, and call the VS Code API there.

---

# Why this example stays small

The earlier version of this tutorial included settings persistence, multiple form controls, Jupytext-specific state, reset behavior, and several message types.

Those are useful application features, but they obscure the webview architecture.

This version keeps only the concepts needed to teach the platform:

1. register a command
2. create a webview
3. load a Vite-built React app
4. style it with Tailwind and VS Code theme variables
5. send a message to the extension
6. use a VS Code API
7. send a response to React

Build richer behavior only after that flow is clear.

---

# Next steps

Once you understand this template, useful additions are:

- typed shared message contracts
- persisted webview state
- settings forms
- VS Code configuration APIs
- multiple webview views
- routing
- testing webview logic separately from extension-host logic
- bundling the extension host as well as the webview
- moving the webview source under `src/webview` in larger single-package extensions

Those are architectural improvements for real projects, but they are intentionally not prerequisites for learning the basic webview model.

## Minimal mental model

If you remember only one thing, remember this:

```text
React owns the UI.
VS Code extension owns VS Code APIs.
Messages connect them.
```
