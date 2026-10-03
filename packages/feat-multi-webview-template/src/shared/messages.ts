export type WebviewId = "dashboard" | "settings";

export type WebviewToExtensionMessage = {
  type: "showMessage";
  source: WebviewId;
  message: string;
};

export type ExtensionToWebviewMessage = {
  type: "messageShown";
  message: string;
};
