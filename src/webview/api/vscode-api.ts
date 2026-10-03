export type WebviewMessage = {
  type: "showMessage";
  message: string;
};

let vscodeApi: VSCodeApi | undefined;

function getVsCodeApi() {
  if (vscodeApi) {
    return vscodeApi;
  }

  if (typeof acquireVsCodeApi !== "function") {
    return undefined;
  }

  vscodeApi = acquireVsCodeApi();
  return vscodeApi;
}

export function postMessage(message: WebviewMessage) {
  const vscode = getVsCodeApi();

  if (!vscode) {
    return false;
  }

  vscode.postMessage(message);
  return true;
}
