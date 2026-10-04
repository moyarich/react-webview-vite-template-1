import type { ButtonHTMLAttributes, ReactNode } from "react";

export function VSCodeButton({
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`rounded bg-[var(--webview-button-background)] px-3 py-2 text-[var(--webview-button-foreground)] hover:bg-[var(--webview-button-hover-background)] ${className}`}
      {...props}
    />
  );
}

export function VSCodeCard({ children }: { children: ReactNode }) {
  return (
    <section className="max-w-xl rounded border border-[var(--webview-panel-border)] p-5">
      {children}
    </section>
  );
}
