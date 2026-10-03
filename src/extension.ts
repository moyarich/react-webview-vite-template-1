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

      panel.webview.html = getWebviewHtml(panel.webview, context.extensionUri);

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

function getWebviewHtml(webview: vscode.Webview, extensionUri: vscode.Uri) {
  const assetRoot = vscode.Uri.joinPath(
    extensionUri,
    "dist",
    "webview",
  );

  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(assetRoot, "webview.js"),
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
    () => characters[Math.floor(Math.random() * characters.length)],
  ).join("");
}

export function deactivate() {}
