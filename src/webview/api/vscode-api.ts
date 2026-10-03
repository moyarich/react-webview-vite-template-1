export type WebviewMessage = {
  type: "showMessage";
  message: string;
};

let vscodeApi: VSCodeApi | undefined;

function getVsCodeApi() {
  if (!vscodeApi) {
    vscodeApi = acquireVsCodeApi();
  }

  return vscodeApi;
}

export function postMessage(message: WebviewMessage) {
  getVsCodeApi().postMessage(message);
}
