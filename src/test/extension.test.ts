import * as assert from "assert";
import * as vscode from "vscode";

suite("Extension", () => {
  test("contributes the webview command", async () => {
    const commands = await vscode.commands.getCommands(true);

    assert.ok(commands.includes("react-webview-vite.openPanel"));
  });
});
