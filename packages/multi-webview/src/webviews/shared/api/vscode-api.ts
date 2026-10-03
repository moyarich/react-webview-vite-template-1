import type {
  ExtensionToWebviewMessage,
  WebviewToExtensionMessage,
} from "../../../shared/messages";

function createPreviewVsCodeApi(): VSCodeApi {
  let state: unknown;

  return {
    postMessage(message) {
      console.info("[VS Code preview] postMessage", message);

      const outgoing = message as Partial<WebviewToExtensionMessage>;

      if (outgoing.type === "showMessage") {
        const response: ExtensionToWebviewMessage = {
          type: "messageShown",
          message: `Preview shim received the message from ${outgoing.source ?? "webview"}.`,
        };

        window.dispatchEvent(
          new MessageEvent("message", {
            data: response,
          }),
        );
      }
    },
    getState<T>() {
      return state as T | undefined;
    },
    setState<T>(nextState: T) {
      state = nextState;
      return nextState;
    },
  };
}

let vscodeApi: VSCodeApi | undefined;

export function getVsCodeApi() {
  if (vscodeApi) {
    return vscodeApi;
  }

  vscodeApi =
    typeof acquireVsCodeApi === "function"
      ? acquireVsCodeApi()
      : createPreviewVsCodeApi();

  return vscodeApi;
}

export function postMessage(message: WebviewToExtensionMessage) {
  getVsCodeApi().postMessage(message);
}

export function getVsCodeState<T>() {
  return getVsCodeApi().getState<T>();
}

export function setVsCodeState<T>(state: T) {
  return getVsCodeApi().setState(state);
}
