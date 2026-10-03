import { WebviewExample } from "../shared/components/WebviewExample";

export default function App() {
  return (
    <div className="settings-view">
      <WebviewExample
      webviewId="settings"
      title="Settings"
        description="A second React webview using the same messaging, theme, and UI components."
      />
    </div>
  );
}
