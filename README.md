# Build a VS Code Webview with React, Vite, Tailwind CSS, and VS Code-Themed Components

This tutorial shows how to build a VS Code extension that opens a custom React interface inside the editor.

We will use:

- **React** for the webview UI
- **Vite** to build both the extension and the webview
- **Tailwind CSS** for layout and styling
- **VS Code theme variables** so the UI follows the user's editor theme
- **VS Code webview messaging** so React and the extension can talk to each other

You do not need previous VS Code extension experience to follow along.

By the end, you will have a command called **Open React Webview** that opens a React panel. Clicking a button in React will send a message to the extension, the extension will show a native VS Code notification, and then send a response back to React.

The complete source is available here:

**https://github.com/moyarich/react-webview-vite-template-1**

---

## 1. Prerequisites

Make sure you have:

- Node.js and npm
- VS Code

To create a new extension from scratch, install the official VS Code extension generator:

```bash
npm install --global yo generator-code
```

The generator gives us the basic files VS Code expects, such as `package.json` and `src/extension.ts`.

---

## 2. Create a TypeScript VS Code extension

Run:

```bash
yo code
```

Choose:

```text
What type of extension do you want to create?
→ New Extension (TypeScript)

What's the name of your extension?
→ react-webview-vite

What's the identifier of your extension?
→ react-webview-vite

Which bundler to use?
→ unbundled

Which package manager to use?
→ npm
```

Open the generated folder in VS Code.

The important files are:

```text
react-webview-vite/
├── package.json
├── tsconfig.json
└── src/
    └── extension.ts
```

At this point you have a normal VS Code extension, but no React UI yet.

---

## 3. Understand the two parts of the extension

Before adding React, it helps to understand where the code will run.

A VS Code extension with a webview has **two runtimes**.

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

### The extension host

`src/extension.ts` runs in VS Code's extension host.

This code can use APIs such as:

```ts
vscode.window.showInformationMessage("Hello");
```

### The webview

The webview is an isolated browser page displayed inside VS Code.

This is where React runs.

React can use the DOM and browser APIs, but it cannot directly do this:

```ts
vscode.window.showInformationMessage("Hello");
```

Instead, React sends a message to the extension.

The extension performs the VS Code-specific action and can send a message back.

Keep this model in mind as we build both sides.

---

## 4. Install React, Vite, and Tailwind

We will keep the extension and webview in one npm package.

From the extension root, install:

```bash
npm install -D vite @vitejs/plugin-react @tailwindcss/vite tailwindcss concurrently
npm install react react-dom
npm install -D @types/react @types/react-dom
```

Our project will eventually look like this:

```text
react-webview-vite/
├── package.json
├── tsconfig.json
├── tsconfig.webview.json
├── vite.extension.config.ts
├── vite.webview.config.ts
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

There is still only one application package and one `node_modules` directory.

The two runtimes are separated by their source folders and build configurations.

---

## 5. Build the extension with Vite

Create:

```text
vite.extension.config.ts
```

Add:

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

This config builds the Node side of the extension.

The important part is:

```ts
external: ["vscode"]
```

The `vscode` module is provided by VS Code at runtime, so it should not be bundled into our extension.

The output will be:

```text
dist/extension.js
```

Update the extension's root `package.json` so VS Code knows where the compiled extension entry point is:

```json
{
  "main": "./dist/extension.js"
}
```

---

## 6. Create the React webview entry point

Create this folder:

```text
src/webview/
```

Then create:

```text
src/webview/index.tsx
```

Add:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

This is the browser entry point.

Later, the extension will create an HTML page containing:

```html
<div id="root"></div>
```

React will attach itself to that element.

---

## 7. Configure Vite for the webview

Create:

```text
vite.webview.config.ts
```

Add:

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

This build is different from the extension build because it targets a browser instead of Node.js.

It produces:

```text
dist/webview/
├── webview.js
└── webview.css
```

Using predictable filenames makes loading the assets from the extension straightforward.

---

## 8. Add the build scripts

Update the `scripts` section of `package.json`:

```json
{
  "scripts": {
    "build": "vite build --config vite.extension.config.ts && vite build --config vite.webview.config.ts",
    "build:extension": "vite build --config vite.extension.config.ts",
    "build:webview": "vite build --config vite.webview.config.ts",
    "watch": "concurrently -k -n extension,webview \"npm run watch:extension\" \"npm run watch:webview\"",
    "watch:extension": "vite build --watch --mode development --config vite.extension.config.ts",
    "watch:webview": "vite build --watch --mode development --config vite.webview.config.ts",
    "dev": "npm run watch"
  }
}
```

Now:

```bash
npm run build
```

builds both parts.

You should see:

```text
dist/
├── extension.js
└── webview/
    ├── webview.js
    └── webview.css
```

---

## 9. Add Tailwind and VS Code theme colors

Create:

```text
src/webview/index.css
```

Add:

```css
@import "tailwindcss";

:root {
  font-family: var(--vscode-font-family);
  color: var(--vscode-foreground);
  background: var(--vscode-editor-background);
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
  color: var(--vscode-foreground);
  background: var(--vscode-editor-background);
}

button {
  font-family: inherit;
}
```

VS Code exposes theme values as CSS custom properties.

Examples include:

```css
var(--vscode-editor-background)
var(--vscode-foreground)
var(--vscode-descriptionForeground)
var(--vscode-panel-border)
var(--vscode-button-background)
var(--vscode-button-foreground)
var(--vscode-button-hoverBackground)
```

That means we can use Tailwind for spacing and layout while letting VS Code control the colors.

---

## 10. Create a VS Code-themed button and card

Create:

```text
src/webview/components/vscode-ui.tsx
```

Add:

```tsx
import type { ButtonHTMLAttributes, ReactNode } from "react";

export function VSCodeButton({
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`rounded bg-[var(--vscode-button-background)] px-3 py-2 text-[var(--vscode-button-foreground)] hover:bg-[var(--vscode-button-hoverBackground)] ${className}`}
      {...props}
    />
  );
}

export function VSCodeCard({ children }: { children: ReactNode }) {
  return (
    <section className="max-w-xl rounded border border-[var(--vscode-panel-border)] p-5">
      {children}
    </section>
  );
}
```

Notice that these are normal React components.

The only VS Code-specific part is the use of VS Code's CSS variables.

For example:

```tsx
bg-[var(--vscode-button-background)]
```

This allows the button to follow the user's active VS Code theme.

---

## 11. Give React access to the webview messaging API

VS Code injects a function named:

```ts
acquireVsCodeApi()
```

inside the webview.

This gives the browser a small API for communicating with the extension.

TypeScript does not know this global exists, so create:

```text
src/webview/vscode.d.ts
```

Add:

```ts
type VSCodeApi = {
  postMessage: (message: unknown) => void;
};

declare function acquireVsCodeApi(): VSCodeApi;
```

Now create:

```text
src/webview/api/vscode-api.ts
```

Add:

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

The React app will use this wrapper whenever it needs to send something to the extension.

---

## 12. Create the React UI

Create:

```text
src/webview/App.tsx
```

Add:

```tsx
import { useEffect, useState } from "react";
import { postMessage } from "./api/vscode-api";
import { VSCodeButton, VSCodeCard } from "./components/vscode-ui";

type ExtensionMessage = {
  type: "messageShown";
  message: string;
};

export default function App() {
  const [status, setStatus] = useState("Ready");

  useEffect(() => {
    const handleMessage = (event: MessageEvent<ExtensionMessage>) => {
      if (event.data.type === "messageShown") {
        setStatus(event.data.message);
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  return (
    <main className="p-6">
      <VSCodeCard>
        <h1 className="text-xl font-semibold">Hello from React</h1>

        <p className="mt-2 text-[var(--vscode-descriptionForeground)]">
          This UI is rendered by React inside a VS Code webview.
        </p>

        <VSCodeButton
          className="mt-4"
          onClick={() =>
            postMessage({
              type: "showMessage",
              message: "Hello from the React webview!",
            })
          }
        >
          Send message to VS Code
        </VSCodeButton>

        <p className="mt-4 text-sm">
          <strong>Status:</strong> {status}
        </p>
      </VSCodeCard>
    </main>
  );
}
```

Two things are happening here.

When the button is clicked, React sends:

```ts
{
  type: "showMessage",
  message: "Hello from the React webview!"
}
```

React also listens for a response from the extension using:

```ts
window.addEventListener("message", handleMessage);
```

We will add the extension side next.

---

## 13. Add the command and submenu to VS Code

VS Code commands must be declared in the extension's root `package.json`.

First add the command:

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

The command ID is:

```text
react-webview-vite.openPanel
```

We will use the exact same ID when registering the command in TypeScript.

Declaring the command makes it available from the Command Palette. We can also expose it through a menu.

Add a submenu:

```json
{
  "contributes": {
    "submenus": [
      {
        "id": "react-webview-vite.webviewMenu",
        "label": "React Webview"
      }
    ]
  }
}
```

Then add the submenu to both the editor context menu and the Explorer file context menu, and put the command inside it:

```json
{
  "contributes": {
    "menus": {
      "editor/context": [
        {
          "submenu": "react-webview-vite.webviewMenu",
          "group": "navigation"
        }
      ],
      "explorer/context": [
        {
          "submenu": "react-webview-vite.webviewMenu",
          "group": "navigation"
        }
      ],
      "react-webview-vite.webviewMenu": [
        {
          "command": "react-webview-vite.openPanel",
          "group": "navigation"
        }
      ]
    }
  }
}
```

Now a user can right-click either inside an editor or on a file in the Explorer and choose:

```text
React Webview
└── Open React Webview
```

The command remains available in the Command Palette too.

---

## 14. Create the webview panel

Now replace `src/extension.ts` with:

```ts
import * as vscode from "vscode";

type WebviewMessage = {
  type: "showMessage";
  message: string;
};

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "react-webview-vite.openPanel",
      () => {
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

        panel.webview.html = getWebviewHtml(
          panel.webview,
          context.extensionUri,
        );

        panel.webview.onDidReceiveMessage(
          async (message: WebviewMessage) => {
            if (message.type !== "showMessage") {
              return;
            }

            await vscode.window.showInformationMessage(
              message.message,
            );

            await panel.webview.postMessage({
              type: "messageShown",
              message: "VS Code received the message.",
            });
          },
        );
      },
    ),
  );
}

function getWebviewHtml(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
) {
  const webviewRoot = vscode.Uri.joinPath(
    extensionUri,
    "dist",
    "webview",
  );

  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(webviewRoot, "webview.js"),
  );

  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(webviewRoot, "webview.css"),
  );

  const nonce = getNonce();

  return /* html */ `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0"
    />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';"
    />
    <link rel="stylesheet" href="${styleUri}" />
    <title>React Webview</title>
  </head>
  <body>
    <div id="root"></div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
  </body>
</html>`;
}

function getNonce() {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  return Array.from(
    { length: 32 },
    () =>
      characters[
        Math.floor(Math.random() * characters.length)
      ],
  ).join("");
}

export function deactivate() {}
```

There is a lot here, so let's break it down.

---

## 15. What `createWebviewPanel` does

This creates a new editor panel containing a browser page:

```ts
vscode.window.createWebviewPanel(
  "reactWebviewVite",
  "React Webview",
  vscode.ViewColumn.One,
  {
    enableScripts: true,
    localResourceRoots: [webviewRoot],
  },
);
```

### `enableScripts: true`

React needs JavaScript, so scripts must be enabled.

### `localResourceRoots`

A webview should not have unrestricted access to files in your extension.

We only allow it to load files from:

```text
dist/webview
```

That is where Vite puts the built JavaScript and CSS.

---

## 16. Why `asWebviewUri` is necessary

A webview cannot load a normal local file path directly.

This will not work:

```text
/Users/me/project/dist/webview/webview.js
```

VS Code must convert the extension file into a URL that the isolated webview can access.

That is what this does:

```ts
webview.asWebviewUri(
  vscode.Uri.joinPath(webviewRoot, "webview.js"),
);
```

We do the same thing for the CSS file.

---

## 17. Why the webview needs an HTML page

React still needs an HTML document.

The important part is:

```html
<body>
  <div id="root"></div>
  <script src="..."></script>
</body>
```

The extension provides this HTML with:

```ts
panel.webview.html = getWebviewHtml(...);
```

The Vite bundle then starts React and mounts it into:

```html
<div id="root"></div>
```

---

## 18. Why the Content Security Policy uses a nonce

VS Code webviews support Content Security Policy rules.

This tutorial uses:

```html
default-src 'none';
style-src WEBVIEW_SOURCE;
script-src 'nonce-RANDOM_VALUE';
```

That means scripts are blocked unless their `nonce` matches the value generated by the extension.

The script tag receives the same value:

```html
<script nonce="RANDOM_VALUE" src="..."></script>
```

This is safer than allowing arbitrary scripts to run inside the webview.

---

## 19. How React sends a message to the extension

When the button is clicked, React calls:

```ts
postMessage({
  type: "showMessage",
  message: "Hello from the React webview!",
});
```

That eventually calls:

```ts
vscode.postMessage(message);
```

The extension listens here:

```ts
panel.webview.onDidReceiveMessage(
  async (message: WebviewMessage) => {
    // ...
  },
);
```

When the extension receives the message, it can use the real VS Code API:

```ts
await vscode.window.showInformationMessage(
  message.message,
);
```

This is the important boundary:

```text
React browser code
    ↓ message
VS Code extension code
    ↓
VS Code API
```

---

## 20. How the extension sends a message back to React

After showing the notification, the extension sends:

```ts
await panel.webview.postMessage({
  type: "messageShown",
  message: "VS Code received the message.",
});
```

Inside React, this listener receives it:

```ts
window.addEventListener("message", handleMessage);
```

Then React updates its state:

```ts
setStatus(event.data.message);
```

So the full round trip is:

```text
React button click
      ↓
vscode.postMessage(...)
      ↓
extension receives message
      ↓
vscode.window.showInformationMessage(...)
      ↓
panel.webview.postMessage(...)
      ↓
React message event
      ↓
setStatus(...)
```

---

## 21. Add a separate TypeScript config for the webview

The extension runs in Node.js.

The React webview runs in a browser.

Because they use different globals, it is useful to type-check them separately.

Create:

```text
tsconfig.webview.json
```

Add:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "ES2022",
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "jsx": "react-jsx",
    "moduleResolution": "bundler",
    "noEmit": true
  },
  "include": [
    "src/webview/**/*.ts",
    "src/webview/**/*.tsx",
    "src/webview/**/*.d.ts"
  ],
  "exclude": [
    "src/extension.ts",
    "node_modules",
    "dist"
  ]
}
```

Your root `tsconfig.json` should exclude the webview source so the extension config does not treat browser code like Node code.

Then add:

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit && tsc --noEmit --project tsconfig.webview.json"
  }
}
```

Run:

```bash
npm run typecheck
```

---

## 22. Build the extension

Run:

```bash
npm run build
```

You should now have:

```text
dist/
├── extension.js
└── webview/
    ├── webview.js
    └── webview.css
```

Those are the files VS Code will actually execute and load.

---

## 23. Run the extension

Open the project in VS Code and press:

```text
F5
```

VS Code opens a second window called the **Extension Development Host**.

This is a separate VS Code window where your extension is installed temporarily for development.

In that new window:

1. Open the Command Palette.
2. On macOS, press `Cmd + Shift + P`.
3. On Windows/Linux, press `Ctrl + Shift + P`.
4. Run:

```text
Open React Webview
```

A React panel should open.

Click:

```text
Send message to VS Code
```

You should see a native VS Code notification:

```text
Hello from the React webview!
```

The React panel should then update its status to:

```text
VS Code received the message.
```

If you see both, communication works in both directions.

---

## 24. Development workflow

Run:

```bash
npm run dev
```

This starts the development processes and opens the React UI in a normal browser automatically.

### Preview

The preview runs through Vite and uses the preview shim instead of the real VS Code webview API.

That means this interaction works in the browser:

```text
React button
→ preview shim
→ simulated messageShown event
→ React status update
```

The preview is useful for fast UI work because you can edit React and see changes without reopening a VS Code webview.

### VS Code webview

Inside the Extension Development Host, the exact same React code uses the real `acquireVsCodeApi()` implementation.

```text
React button
→ acquireVsCodeApi().postMessage(...)
→ extension host
→ VS Code API
→ panel.webview.postMessage(...)
→ React status update
```


---

## 25. If the panel is blank

First check that these files exist:

```text
dist/extension.js
dist/webview/webview.js
dist/webview/webview.css
```

Then open:

```text
Developer: Toggle Developer Tools
```

Look for errors related to:

- missing JavaScript or CSS
- Content Security Policy
- incorrect resource paths
- `acquireVsCodeApi`

Also confirm:

```ts
enableScripts: true
```

and verify that `localResourceRoots` points to `dist/webview`.

---

## 26. Final project structure

Your project should now look roughly like this:

```text
react-webview-vite/
├── package.json
├── package-lock.json
├── tsconfig.json
├── tsconfig.webview.json
├── vite.extension.config.ts
├── vite.webview.config.ts
├── src/
│   ├── extension.ts
│   └── webview/
│       ├── App.tsx
│       ├── index.tsx
│       ├── index.css
│       ├── vscode.d.ts
│       ├── api/
│       │   └── vscode-api.ts
│       └── components/
│           └── vscode-ui.tsx
└── dist/
    ├── extension.js
    └── webview/
        ├── webview.js
        └── webview.css
```

---

## Summary

You now have a VS Code extension that:

- registers a command in the Command Palette
- opens a custom webview panel
- renders React inside VS Code
- builds both runtimes with Vite
- uses Tailwind for layout
- follows the active VS Code theme
- sends messages from React to the extension
- sends responses from the extension back to React

The most important thing to remember is:

```text
React owns the UI.
VS Code owns the editor APIs.
Messages connect them.
```

Once that makes sense, you can build much richer webviews using the same pattern.

Source code:

**https://github.com/moyarich/react-webview-vite-template-1**
