# Build a VS Code Webview with React, Vite, Tailwind CSS, and a Separate `webview-ui` App

This tutorial shows how to build a VS Code extension that opens a custom React interface inside the editor.

We will keep the extension and the React webview in **separate application folders**:

```text
react-webview-vite/
├── src/                 # VS Code extension
└── webview-ui/          # React + Vite app
```

That makes the runtime boundary very visible:

- the extension runs in VS Code's Node.js extension host
- the webview runs in a browser
- the two sides communicate with messages

We will use:

- **TypeScript** for the extension
- **Vite** to build the extension host
- **React + Vite** inside `webview-ui/`
- **Tailwind CSS** for layout
- **VS Code theme variables** for editor-native colors
- **webview messaging** for React ↔ extension communication

By the end, the extension will expose a command named **Open React Webview**. Clicking a React button will send a message to the extension, VS Code will show a native notification, and the extension will send a response back to React.

---

## 1. Prerequisites

Install:

- Node.js
- npm
- VS Code

Then install the official VS Code extension generator:

```bash
npm install --global yo generator-code
```

The generator gives us the basic files VS Code expects.

---

## 2. Scaffold a TypeScript VS Code extension

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

Open the generated project in VS Code.

At this point, the important files are:

```text
react-webview-vite/
├── package.json
├── tsconfig.json
└── src/
    └── extension.ts
```

This is a normal TypeScript VS Code extension.

---

## 3. Understand the extension host and the webview

Before adding React, it helps to understand where each part of the project will run.

A VS Code extension with a webview has **two runtimes**:

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

### Extension host

The extension host runs your extension code.

This works there:

```ts
vscode.window.showInformationMessage("Hello");
```

### Webview

A webview is an isolated browser page displayed inside VS Code.

React can render UI there, but it cannot directly import and use the `vscode` module.

Instead:

```text
React
  ↓ message
Extension
  ↓
VS Code API
```

That separation is the central idea behind everything we build next.

---

## 4. Install React, Vite, and Tailwind

We will keep the extension at the repository root and create a separate React project under `webview-ui/`.

First, install Vite and the development helper used by the extension:

```bash
npm install -D vite concurrently
```

Then scaffold the React app:

```bash
npm create vite@latest webview-ui -- --template react-ts
```

Install the webview dependencies:

```bash
npm install --prefix webview-ui
npm install --prefix webview-ui tailwindcss @tailwindcss/vite
```

The project now has two package boundaries:

```text
react-webview-vite/
├── package.json
├── src/
│   └── extension.ts
└── webview-ui/
    ├── package.json
    ├── vite.config.ts
    └── src/
        ├── App.tsx
        ├── main.tsx
        └── index.css
```

The extension and webview have separate dependencies, but they still live in one repository.

---

## 5. Create the extension Vite build

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
    sourcemap: "hidden",
    minify: false,
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

This builds the VS Code extension host code.

The important line is:

```ts
external: ["vscode"]
```

VS Code provides the `vscode` module at runtime, so it should not be bundled.

The extension build produces:

```text
dist/extension.js
```

Update the root `package.json` so VS Code loads that file:

```json
{
  "main": "./dist/extension.js"
}
```

---

## 6. Create the React webview entry

Inside `webview-ui/`, create:

```text
webview-ui/src/main.tsx
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

This is the browser entry point for the React app.

Vite's generated `webview-ui/index.html` already contains:

```html
<div id="root"></div>
```

When we run Vite normally, React mounts there.

Inside VS Code, the extension will provide its own HTML shell with the same root element.

---

## 7. Create the `webview-ui` Vite build

Update:

```text
webview-ui/vite.config.ts
```

to:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name].[ext]",
      },
    },
  },
});
```

The important part is the predictable output names.

After the build, we want:

```text
webview-ui/dist/
├── index.html
└── assets/
    ├── index.js
    └── index.css
```

That lets the extension reference the built JavaScript and CSS directly.

---

## 8. Add root build scripts

The root package controls the development workflow for both projects.

Add these scripts to the root `package.json`:

```json
{
  "scripts": {
    "postinstall": "npm ci --prefix webview-ui",
    "build": "npm run build:extension && npm run build:webview",
    "build:extension": "vite build --config vite.extension.config.ts",
    "build:webview": "npm --prefix webview-ui run build",
    "watch": "concurrently -k -n extension,webview \"npm run watch:extension\" \"npm run watch:webview\"",
    "watch:extension": "vite build --watch --mode development --config vite.extension.config.ts",
    "watch:webview": "npm --prefix webview-ui run build:watch",
    "dev": "npm run watch"
  }
}
```

The `postinstall` script matters for a fresh clone.

Running:

```bash
npm install
```

at the repository root also installs the dependencies inside `webview-ui/`.

That means a new user does not have to remember two install commands.

---

## 9. Add Tailwind and VS Code theme variables

Open:

```text
webview-ui/src/index.css
```

Replace it with:

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
  background: var(--vscode-editor-background);
  color: var(--vscode-foreground);
}

button {
  font-family: inherit;
}
```

VS Code injects CSS variables into webviews.

Examples include:

```css
var(--vscode-editor-background)
var(--vscode-foreground)
var(--webview-description-foreground)
var(--webview-panel-border)
var(--webview-button-background)
var(--webview-button-foreground)
var(--webview-button-hover-background)
```

We can use Tailwind for layout and spacing while using VS Code variables for colors.

---

## 10. Create themed React components

Create:

```text
webview-ui/src/components/vscode-ui.tsx
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
      className={`rounded bg-[var(--webview-button-background)] px-3 py-2 text-[var(--webview-button-foreground)] hover:bg-[var(--webview-button-hover-background)] ${className}`}
      {...props}
    />
  );
}

export function VSCodeCard({ children }: { children: ReactNode }) {
  return (
    <section className="max-w-xl rounded border border-[var(--webview-panel-border)] p-5">
      {children}
    </section>
  );
}
```

These are ordinary React components.

The VS Code integration comes from CSS variables such as:

```tsx
bg-[var(--webview-button-background)]
```

That allows the UI to follow light, dark, and custom editor themes.

---

## 11. Introduce `acquireVsCodeApi()`

VS Code exposes a function named:

```ts
acquireVsCodeApi()
```

inside the webview.

That API allows browser code to send messages to the extension.

TypeScript does not know the global exists, so create:

```text
webview-ui/src/vscode.d.ts
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
webview-ui/src/api/vscode-api.ts
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

This small wrapper keeps the VS Code webview API in one place.

### Preview shim

`acquireVsCodeApi()` only exists inside a real VS Code webview.

To let the React app run in a normal browser during Vite development, the wrapper falls back to a small preview implementation:

```ts
const vscode =
  typeof acquireVsCodeApi === "function"
    ? acquireVsCodeApi()
    : createPreviewVsCodeApi();
```

The preview shim implements:

```text
postMessage(...)
getState()
setState(...)
```

For the tutorial's `showMessage` action, it also dispatches a simulated `messageShown` browser event so the same React interaction can be tested without launching VS Code.

The preview response is simulated browser behavior. In the real extension, messages still travel through the VS Code extension host.

---

## 12. Build the React UI

Replace:

```text
webview-ui/src/App.tsx
```

with:

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

        <p className="mt-2 text-[var(--webview-description-foreground)]">
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

The button sends a message to the extension.

React also listens for a message coming back from the extension and stores it in `status`.

---

## 13. Register the VS Code command and menu

Open the root:

```text
package.json
```

First declare the command:

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

We will use that exact ID again in `src/extension.ts`.

Declaring a command makes it available to VS Code, including the Command Palette. We can also surface it in the editor UI.

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

Then add the submenu to the editor context menu and place our command inside it:

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

The same command is still available from the Command Palette.

---

## 14. Create the webview panel

Replace:

```text
src/extension.ts
```

with:

```ts
import * as vscode from "vscode";

type WebviewMessage = {
  type: "showMessage";
  message: string;
};

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("react-webview-vite.openPanel", () => {
      const webviewRoot = vscode.Uri.joinPath(
        context.extensionUri,
        "webview-ui",
        "dist",
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

      panel.webview.html = getWebviewHtml(panel.webview, webviewRoot);

      panel.webview.onDidReceiveMessage(async (message: WebviewMessage) => {
        if (message.type !== "showMessage") {
          return;
        }

        await vscode.window.showInformationMessage(message.message);

        await panel.webview.postMessage({
          type: "messageShown",
          message: "VS Code received the message.",
        });
      });
    }),
  );
}
```

We still need the HTML helper, which we will add in a moment.

---

## 15. What `createWebviewPanel` does

This creates a browser panel inside VS Code:

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

### `enableScripts: true`

React needs JavaScript, so scripts must be enabled.

### `localResourceRoots`

The webview should only be able to load the local files it actually needs.

We allow:

```text
webview-ui/dist
```

because that is where Vite writes the browser bundle.

---

## 16. Explain `asWebviewUri`

A webview cannot load an ordinary filesystem path directly.

For example, this is not a valid browser URL inside the webview:

```text
/Users/me/project/webview-ui/dist/assets/index.js
```

VS Code converts extension files into safe webview URLs with:

```ts
webview.asWebviewUri(...)
```

Add this helper:

```ts
function getWebviewHtml(
  webview: vscode.Webview,
  webviewRoot: vscode.Uri,
) {
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(webviewRoot, "assets", "index.js"),
  );

  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(webviewRoot, "assets", "index.css"),
  );

  // HTML comes next.
}
```

Now the browser can load the built files.

---

## 17. Add the HTML shell

React still needs an HTML document.

Add this inside `getWebviewHtml()`:

```ts
return /* html */ `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="${styleUri}" />
    <title>React Webview</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="${scriptUri}"></script>
  </body>
</html>`;
```

The important part is:

```html
<div id="root"></div>
```

The Vite bundle starts React and mounts the app there.

---

## 18. Add a Content Security Policy and nonce

Webviews should restrict which scripts can execute.

Generate a nonce:

```ts
function getNonce() {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  return Array.from(
    { length: 32 },
    () => characters[Math.floor(Math.random() * characters.length)],
  ).join("");
}
```

Then add the nonce and CSP to the HTML:

```ts
const nonce = getNonce();
```

```html
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'none'; style-src WEBVIEW_SOURCE; script-src 'nonce-RANDOM_VALUE';"
/>
```

and:

```html
<script
  type="module"
  nonce="RANDOM_VALUE"
  src="...">
</script>
```

In the actual code, `WEBVIEW_SOURCE` is `webview.cspSource` and both nonce values come from the same variable.

That lets the intended bundle run without broadly allowing arbitrary scripts.

---

## 19. React → extension messaging

When the React button is clicked, it sends:

```ts
postMessage({
  type: "showMessage",
  message: "Hello from the React webview!",
});
```

The wrapper calls:

```ts
vscode.postMessage(message);
```

The extension receives the message here:

```ts
panel.webview.onDidReceiveMessage(async (message: WebviewMessage) => {
  if (message.type !== "showMessage") {
    return;
  }

  await vscode.window.showInformationMessage(message.message);
});
```

This is where browser code crosses into extension-host code.

---

## 20. Extension → React messaging

After showing the native notification, the extension replies:

```ts
await panel.webview.postMessage({
  type: "messageShown",
  message: "VS Code received the message.",
});
```

React listens with:

```ts
window.addEventListener("message", handleMessage);
```

and updates state:

```ts
setStatus(event.data.message);
```

The complete round trip is now:

```text
React button
    ↓
vscode.postMessage(...)
    ↓
extension
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

## 21. Keep TypeScript separated

The root TypeScript configuration belongs to the extension.

The generated Vite project has its own TypeScript configuration inside `webview-ui/`.

Update the root `tsconfig.json` so it excludes the nested frontend:

```json
{
  "compilerOptions": {
    "module": "Node16",
    "moduleResolution": "Node16",
    "target": "ES2022",
    "lib": ["ES2022"],
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["webview-ui", "node_modules", "dist"]
}
```

The key line is:

```json
"exclude": ["webview-ui", "node_modules", "dist"]
```

The extension TypeScript environment should not try to compile browser/React source.

The webview's own `tsconfig.app.json` handles DOM and JSX types.

---

## 22. Build both projects

From the repository root:

```bash
npm run build
```

The root script runs both builds.

You should now have:

```text
dist/
└── extension.js

webview-ui/dist/
├── index.html
└── assets/
    ├── index.js
    └── index.css
```

These are the files VS Code will execute and load.

---

## 23. Run with `F5`

A fresh clone should only need:

```bash
npm install
```

The root `postinstall` installs the nested `webview-ui` dependencies too.

Open the repository in VS Code and press:

```text
F5
```

VS Code opens a second window called the **Extension Development Host**.

This is a temporary VS Code instance used to run and debug your extension.

In that window:

1. Open the Command Palette.
2. macOS: `Cmd + Shift + P`
3. Windows/Linux: `Ctrl + Shift + P`
4. Run:

```text
Open React Webview
```

Click:

```text
Send message to VS Code
```

You should see:

```text
Hello from the React webview!
```

as a native VS Code notification.

Then the React status should change to:

```text
VS Code received the message.
```

That confirms both message directions work.

---

## 24. Development workflow

For day-to-day development, run one command from the repository root:

```bash
npm run dev
```

The first time it starts, `predev` runs a complete build. Then `dev` starts three long-running processes together:

```text
extension watcher
src/extension.ts
    ↓ Vite watch
dist/extension.js

webview watcher
webview-ui/src/*
    ↓ Vite watch
webview-ui/dist/assets/*

VS Code
    ↓
Extension Development Host
```

The VS Code window is launched with this repository as the extension under development, so you do not need to press `F5` when using `npm run dev`.

Once the window opens, run **Open React Webview** from the Command Palette.

The terminal stays attached while that VS Code window is open. Closing the development window stops the combined development command.

If your VS Code CLI is not named `code`, set `CODE_COMMAND`:

```bash
CODE_COMMAND=code-insiders npm run dev
```

You can still use `F5` instead if you prefer VS Code's built-in debugger.

### When React changes

Close the webview panel and run **Open React Webview** again.

### When extension code changes

Reload the Extension Development Host:

- macOS: `Cmd + R`
- Windows/Linux: `Ctrl + R`

Then reopen the webview.

---

## 25. Troubleshooting

### The panel is blank

Check that these files exist:

```text
dist/extension.js
webview-ui/dist/assets/index.js
webview-ui/dist/assets/index.css
```

Then open:

```text
Developer: Toggle Developer Tools
```

Look for errors related to:

- missing JavaScript or CSS
- incorrect webview paths
- Content Security Policy
- `acquireVsCodeApi`

### The command does not appear

Make sure this command ID:

```text
react-webview-vite.openPanel
```

matches in both:

```text
package.json
src/extension.ts
```

### React cannot import `vscode`

That is expected.

React runs in the browser webview.

Send a message to the extension instead.

### The webview assets are not found

Confirm:

```ts
localResourceRoots: [webviewRoot]
```

points to:

```text
webview-ui/dist
```

and that the extension uses `webview.asWebviewUri(...)`.

---

## 26. Final folder structure

The finished project looks like this:

```text
react-webview-vite/
├── package.json
├── package-lock.json
├── tsconfig.json
├── vite.extension.config.ts
├── dist/
│   └── extension.js
├── src/
│   └── extension.ts
└── webview-ui/
    ├── package.json
    ├── package-lock.json
    ├── index.html
    ├── vite.config.ts
    ├── tsconfig.json
    ├── tsconfig.app.json
    ├── tsconfig.node.json
    ├── src/
    │   ├── App.tsx
    │   ├── main.tsx
    │   ├── index.css
    │   ├── vscode.d.ts
    │   ├── api/
    │   │   └── vscode-api.ts
    │   └── components/
    │       └── vscode-ui.tsx
    └── dist/
        ├── index.html
        └── assets/
            ├── index.js
            └── index.css
```

The most important thing to remember is:

```text
The extension is a Node application.
The webview-ui folder is a browser application.
Messages connect them.
```

That separation makes the project easy to reason about while still letting both pieces live in one repository.
