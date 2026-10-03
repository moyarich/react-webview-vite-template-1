import { useEffect, useState } from "react";
import type {
  ExtensionToWebviewMessage,
  WebviewId,
} from "../../../shared/messages";
import { postMessage } from "../api/vscode-api";
import { VSCodeButton, VSCodeCard } from "./vscode-ui";

type WebviewExampleProps = {
  webviewId: WebviewId;
  title: string;
  description: string;
};

export function WebviewExample({
  webviewId,
  title,
  description,
}: WebviewExampleProps) {
  const [status, setStatus] = useState("Ready");

  useEffect(() => {
    const handleMessage = (
      event: MessageEvent<ExtensionToWebviewMessage>,
    ) => {
      if (event.data.type === "messageShown") {
        setStatus(event.data.message);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return (
    <main className="p-6">
      <VSCodeCard>
        <h1 className="text-xl font-semibold">{title}</h1>

        <p className="mt-2 text-[var(--webview-description-foreground)]">
          {description}
        </p>

        <VSCodeButton
          className="mt-4"
          onClick={() => {
            setStatus("Sending message to VS Code...");

            postMessage({
              type: "showMessage",
              source: webviewId,
              message: `Hello from the ${webviewId} webview!`,
            });
          }}
        >
          Send message to VS Code
        </VSCodeButton>

        <p className="mt-4 text-sm">
          <strong>Status:</strong> {status}
        </p>
      </VSCodeCard>
    </main>
  );
}
