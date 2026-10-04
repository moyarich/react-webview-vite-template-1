import * as vscode from "vscode";
import { openWebviewPanel } from "./webview-panel/webview-panel";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "react-webview-vite.openDashboard",
      () => openWebviewPanel(context, "dashboard"),
    ),
    vscode.commands.registerCommand(
      "react-webview-vite.openSettings",
      () => openWebviewPanel(context, "settings"),
    ),
  );
}

export function deactivate() {}
