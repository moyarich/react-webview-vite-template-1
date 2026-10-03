import type { ButtonHTMLAttributes, ReactNode } from "react";

export function VSCodeButton({
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`rounded bg-[var(--vscode-button-background)] px-3 py-2 text-[var(--vscode-button-foreground)] hover:bg-[var(--vscode-button-hoverBackground)] ${className}`}
      {...props}
    />
  );
}

export function VSCodeCard({ children }: { children: ReactNode }) {
  return (
    <section className="max-w-xl rounded border border-[var(--vscode-panel-border)] p-5">
      {children}
    </section>
  );
}
