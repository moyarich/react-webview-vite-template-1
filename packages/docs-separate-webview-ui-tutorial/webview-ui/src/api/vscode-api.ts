export type WebviewMessage = {
  type: "showMessage";
  message: string;
};

const vscode = acquireVsCodeApi();

export function postMessage(message: WebviewMessage) {
  vscode.postMessage(message);
}
