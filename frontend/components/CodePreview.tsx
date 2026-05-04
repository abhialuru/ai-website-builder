interface CodePreviewProps {
  code: string | null;
}

export default function CodePreview({ code }: CodePreviewProps) {
  if (!code) {
    return (
      <div className="h-full w-full bg-zinc-950 flex flex-col items-center justify-center text-zinc-500 text-sm">
        <p>Select a file from the explorer</p>
        <p className="text-zinc-600 mt-1 text-xs">to view its code here.</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-zinc-950 overflow-auto p-4 hide-scrollbar">
      <pre className="text-sm text-zinc-300 font-mono">
        <code>{code}</code>
      </pre>
    </div>
  );
}
