import * as vscode from "vscode";
import { openWebviewPanel } from "./webview-panel/webview-panel";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("react-webview-vite.openPanel", () => {
      openWebviewPanel(context);
    }),
  );
}

export function deactivate() {}
