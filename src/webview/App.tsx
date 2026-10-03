import { useEffect, useState } from "react";
import { postMessage } from "./api/vscode-api";
import { VSCodeButton, VSCodeCard } from "./components/vscode-ui";

type ExtensionMessage = {
  type: "messageShown";
  message: string;
};

export default function App() {
  const [status, setStatus] = useState("Ready");

  useEffect(() => {
    const handleMessage = (event: MessageEvent<ExtensionMessage>) => {
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
        <h1 className="text-xl font-semibold">Hello from React</h1>

        <p className="mt-2 text-[var(--vscode-descriptionForeground)]">
          This UI is rendered by React inside a VS Code webview.
        </p>

        <VSCodeButton
          className="mt-4"
          onClick={() => {
            setStatus("Sending message to VS Code...");

            postMessage({
              type: "showMessage",
              message: "Hello from the React webview!",
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
