import { WebviewExample } from "../shared/components/WebviewExample";

export default function App() {
  return (
    <div className="dashboard-view">
      <WebviewExample
        webviewId="dashboard"
        title="Dashboard"
        description="A React webview that can share infrastructure with other views."
      />
    </div>
  );
}
