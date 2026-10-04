import * as vscode from "vscode";
import type {
  ExtensionToWebviewMessage,
  WebviewId,
  WebviewToExtensionMessage,
} from "../../shared/messages";

type WebviewDefinition = {
  viewType: string;
  title: string;
  entry: string;
};

const WEBVIEWS: Record<WebviewId, WebviewDefinition> = {
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

export function openWebviewPanel(
  context: vscode.ExtensionContext,
  webviewId: WebviewId,
) {
  const definition = WEBVIEWS[webviewId];
  const assetRoot = vscode.Uri.joinPath(
    context.extensionUri,
    "out",
    "webview-ui",
  );

  const panel = vscode.window.createWebviewPanel(
    definition.viewType,
    definition.title,
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      localResourceRoots: [assetRoot],
    },
  );

  panel.webview.html = getWebviewHtml(
    panel.webview,
    assetRoot,
    definition.entry,
    definition.title,
  );

  const messageSubscription = panel.webview.onDidReceiveMessage(
    async (message: WebviewToExtensionMessage) => {
      if (message.type !== "showMessage") {
        return;
      }

      void vscode.window.showInformationMessage(message.message);

      const response: ExtensionToWebviewMessage = {
        type: "messageShown",
        message: `VS Code received the message from ${message.source}.`,
      };

      await panel.webview.postMessage(response);
    },
  );

  panel.onDidDispose(() => messageSubscription.dispose());
}

function getWebviewHtml(
  webview: vscode.Webview,
  assetRoot: vscode.Uri,
  entry: string,
  title: string,
) {
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(assetRoot, `${entry}.js`),
  );
  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(assetRoot, "webview.css"),
  );
  const nonce = getNonce();

  return /* html */ `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';"
    />
    <link rel="stylesheet" href="${styleUri}" />
    <title>${title}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
  </body>
</html>`;
}

function getNonce() {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  return Array.from(
    { length: 32 },
    () => characters[Math.floor(Math.random() * characters.length)],
  ).join("");
}
