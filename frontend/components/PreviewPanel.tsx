import { WebContainer } from "@webcontainer/api";
import { useEffect, useRef, useState } from "react";

export default function PreviewPanel({ 
  webcontainer, 
  filesReady 
}: { 
  webcontainer: WebContainer | null,
  filesReady: boolean
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("Waiting for files...");
  const hasStarted = useRef(false); // ✅ prevents double start
  const devProcessRef = useRef<any>(null);

  useEffect(() => {
    if (!webcontainer || !filesReady) return;
    if (hasStarted.current) return; // ✅ only start once
    hasStarted.current = true;

    async function main() {
      try {
        // kill any existing process
        if (devProcessRef.current) {
          devProcessRef.current.kill();
          devProcessRef.current = null;
        }

        let needsInstall = true;
        try {
          await webcontainer?.fs.readdir("node_modules");
          needsInstall = false;
          console.log("[webcontainer] node_modules exists, skipping install");
        } catch {
          needsInstall = true;
        }

        if (needsInstall) {
          setStatus("Installing dependencies...");
          const install = await webcontainer?.spawn("npm", ["install", "--prefer-offline"]);
          install?.output.pipeTo(new WritableStream({
            write(data) { console.log("[install]", data); }
          }));
          const exitCode = await install?.exit;
          if (exitCode !== 0) {
            setStatus(`npm install failed (exit ${exitCode})`);
            return;
          }
        }

        setStatus("Starting dev server...");
        const devProcess = await webcontainer?.spawn("npm", ["run", "dev", "--", "--host"]);
        devProcessRef.current = devProcess;

        devProcess?.output.pipeTo(new WritableStream({
          write(data) { console.log("[dev]", data); }
        }));

        webcontainer?.on("server-ready", (_, serverUrl) => {
          console.log("[server-ready]", serverUrl);
          setUrl(serverUrl);
        });

      } catch (err) {
        console.error("[preview error]", err);
        setStatus(`Error: ${err}`);
      }
    }

    main();

    return () => {
      devProcessRef.current?.kill();
    };
  }, [webcontainer, filesReady]);

  return (
    <div className="h-full w-full bg-white flex flex-col">
      <div className="h-10 border-b border-zinc-200 bg-zinc-100 flex items-center px-4 gap-2 shrink-0">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-amber-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <div className="ml-4 bg-white px-3 py-1 text-xs text-zinc-500 rounded border border-zinc-200 flex-1 max-w-sm text-center truncate">
          {url ?? "localhost:5173"}
        </div>
      </div>

      {url ? (
        <iframe
          src={url}
          allow="cross-origin-isolated"
          className="flex-1 w-full h-full border-none"
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-zinc-50 gap-3">
          <div className="w-5 h-5 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
          <p className="text-sm text-zinc-500">{status}</p>
        </div>
      )}
    </div>
  );
}