export type WebviewMessage = {
  type: "showMessage";
  message: string;
};

function createPreviewVsCodeApi(): VSCodeApi {
  let state: unknown;

  return {
    postMessage(message) {
      console.info("[VS Code preview] postMessage", message);

      if (
        typeof message === "object" &&
        message !== null &&
        "type" in message &&
        message.type === "showMessage"
      ) {
        window.dispatchEvent(
          new MessageEvent("message", {
            data: {
              type: "messageShown",
              message: "Preview shim received the message.",
            },
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

export function postMessage(message: WebviewMessage) {
  getVsCodeApi().postMessage(message);
}

export function getVsCodeState<T>() {
  return getVsCodeApi().getState<T>();
}

export function setVsCodeState<T>(state: T) {
  return getVsCodeApi().setState(state);
}
