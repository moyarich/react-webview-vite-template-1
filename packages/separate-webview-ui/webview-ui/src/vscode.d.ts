type VSCodeApi = {
  postMessage: (message: unknown) => void;
};

declare function acquireVsCodeApi(): VSCodeApi;
