interface PageShellProps {
  children: React.ReactNode;
  padBottom?: boolean;
}

export default function PageShell({ children, padBottom = true }: PageShellProps) {
  return (
    <main
      className={`min-h-dvh px-5 pt-16 max-w-lg mx-auto ${padBottom ? "pb-32" : ""}`}
      style={{ background: "var(--bg)" }}
    >
      {children}
    </main>
  );
}
