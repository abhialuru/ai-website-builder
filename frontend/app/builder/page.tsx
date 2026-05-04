"use client";
import { parseXml } from "@/steps";
import { Step, StepType } from "@/types"; // ✅ now importing from types.ts where it's defined
import { useEffect, useRef, useState } from "react";
import FileExplorer from "@/components/FileExplorer";
import CodePreview from "@/components/CodePreview";
import StepsPanel from "@/components/StepsPanel";
import PreviewPanel from "@/components/PreviewPanel";
import { ArrowRight, Code2, MonitorPlay } from "lucide-react";
import { useWebContainer } from "@/hooks/webContainer";
import JSZip from "jszip";

async function zipDirectory(webcontainer: any, zip: JSZip, dirPath: string) {
  const entries = await webcontainer.fs.readdir(dirPath, {
    withFileTypes: true,
  });
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const fullPath = dirPath === "." ? entry.name : `${dirPath}/${entry.name}`;
    if (entry.isDirectory()) {
      await zipDirectory(webcontainer, zip, fullPath);
    } else {
      const contents = await webcontainer.fs.readFile(fullPath, "utf-8");
      zip.file(fullPath, contents);
    }
  }
}

export default function BuildPage() {
  const [savedPrompt, setSavedPrompt] = useState<string | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [selectedFile, setSelectedFile] = useState<Step | null>(null);
  const [activeTab, setActiveTab] = useState<"code" | "preview">("code");
  const webcontainer = useWebContainer();
  const [phase, setPhase] = useState<"idle" | "template" | "building" | "done">(
    "idle",
  );
  const [isDownloading, setIsDownloading] = useState(false);
  const [followUpPrompt, setFollowUpPrompt] = useState("");
  const [llmMessages, setLlmMessages] = useState<
    { role: string; content: string }[]
  >([]);
  const [isThinking, setIsThinking] = useState(false);
  const [filesReady, setFilesReady] = useState(false);
  const hasMounted = useRef(false);

  useEffect(() => {
    const prompt = localStorage.getItem("prompt");
    setSavedPrompt(prompt);

    const fetchTemplate = async () => {
      if (!prompt) return;
      try {
        setPhase("template");
        const templateResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/template`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt }),
          },
        );
        const { prompts, uiPrompts } = await templateResponse.json();

        const parsedSteps = parseXml(uiPrompts[0]);
        setSteps(parsedSteps);
        setPhase("building");

        const chatResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/chat`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: [...prompts, prompt].map((content) => ({
                role: "user",
                content,
              })),
            }),
          },
        );

        const data = await chatResponse.json();
        console.log("Initial LLM response:", data.response);
        const chatSteps = parseXml(data.response);
        console.log("Initial parsed steps:", chatSteps);

        setLlmMessages(
          [...prompts, prompt].map((content) => ({ role: "user", content })),
        );
        setLlmMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.response },
        ]);

        setSteps((prev) => {
          const maxId = prev.reduce((max, s) => Math.max(max, s.id), 0);
          return [
            ...prev,
            ...chatSteps.map((s, i) => ({ ...s, id: maxId + i + 1 })),
          ];
        });

        setPhase("done");
      } catch (err) {
        console.error("Error fetching build steps", err);
      }
    };

    fetchTemplate();
  }, []);

  const lastSyncedIndex = useRef(0);

  useEffect(() => {
    if (!webcontainer) return;

    if (!hasMounted.current) {
      const fileSteps = steps.filter(
        (s) => s.type === StepType.CreateFile && s.path && s.code,
      );

      if (fileSteps.length === 0) return;

      const mountStructure: Record<string, any> = {};

      for (const step of fileSteps) {
        const parts = step.path!.replace(/^\//, "").split("/");
        let current = mountStructure;

        parts.forEach((part, index) => {
          const isLast = index === parts.length - 1;
          if (isLast) {
            current[part] = { file: { contents: step.code ?? "" } };
          } else {
            if (!current[part]) current[part] = { directory: {} };
            current = current[part].directory;
          }
        });
      }

      hasMounted.current = true;
      lastSyncedIndex.current = steps.length;

      webcontainer.mount(mountStructure).then(() => {
        setFilesReady(true);
      });
    } else if (steps.length > lastSyncedIndex.current) {
      const newSteps = steps.slice(lastSyncedIndex.current);
      const newFileSteps = newSteps.filter(
        (s) => s.type === StepType.CreateFile && s.path && s.code,
      );

      newFileSteps.forEach(async (step) => {
        const filePath = step.path!.replace(/^\//, "");
        const parts = filePath.split("/");
        if (parts.length > 1) {
          try {
            await webcontainer.fs.mkdir(parts.slice(0, -1).join("/"), {
              recursive: true,
            });
          } catch {}
        }
        try {
          await webcontainer.fs.writeFile(filePath, step.code!);
          console.log("[webcontainer] wrote updated file:", filePath);
        } catch (err) {
          console.error("[webcontainer] error writing file:", filePath, err);
        }
      });
      lastSyncedIndex.current = steps.length;
    }
  }, [webcontainer, steps]);

  const handleDownloadFiles = async () => {
    if (!webcontainer) return;
    setIsDownloading(true);
    try {
      const zip = new JSZip();
      await zipDirectory(webcontainer, zip, ".");
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const folderName = savedPrompt
        ? savedPrompt
            .replace(/[^a-z0-9]/gi, "-")
            .toLowerCase()
            .slice(0, 40)
        : "project";
      const a = document.createElement("a");
      a.href = url;
      a.download = `${folderName}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("[download error]", err);
    } finally {
      setIsDownloading(false);
    }
  };

  async function handleFollowUpPrompts() {
    // ✅ Deduplicate files — keep latest version of each path
    const fileMap = new Map<string, Step>();
    steps
      .filter((s) => s.type === StepType.CreateFile && s.path && s.code)
      .forEach((s) => fileMap.set(s.path!, s));

    const currentFiles = Array.from(fileMap.values())
      .map((s) => `File: ${s.path}\n\`\`\`\n${s.code}\n\`\`\``)
      .join("\n\n");

    const messageWithContext = {
      role: "user",
      content: `Current project files:\n${currentFiles}\n\nUser request: ${followUpPrompt}`,
    };
    const newMessage = { role: "user", content: followUpPrompt };

    setIsThinking(true);
    setFollowUpPrompt("");

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...llmMessages, messageWithContext],
        }),
      });

      const data = await res.json();
      console.log("Follow-up LLM response:", data.response);

      const newSteps = parseXml(data.response);
      console.log("Follow-up parsed steps:", newSteps);

      setSteps((prev) => {
        const maxId = prev.reduce((max, s) => Math.max(max, s.id), 0);
        return [
          ...prev,
          ...newSteps.map((s, i) => ({ ...s, id: maxId + i + 1 })),
        ];
      });

      setLlmMessages((prev) => [
        ...prev,
        newMessage,
        { role: "assistant", content: data.response },
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsThinking(false);
    }
  }

  return (
    <div className="h-screen w-full flex bg-zinc-950 overflow-hidden font-sans text-white">
      <div className="w-84 shrink-0 h-full flex flex-col border-r border-zinc-800">
        <div className="w-full h-[75%]">
          <StepsPanel phase={phase} />
        </div>
        {phase === "done" && (
          <div className="w-full h-[25%] mb-3 px-3">
            <div className="bg-zinc-800 rounded-2xl p-3 flex flex-col h-full gap-2">
              {isThinking && (
                <div className="flex items-center gap-2 px-1">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                  <span className="text-xs text-zinc-400 animate-pulse">
                    Updating your project...
                  </span>
                </div>
              )}
              <textarea
                value={followUpPrompt}
                onChange={(e) => setFollowUpPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    !e.shiftKey &&
                    !isThinking &&
                    followUpPrompt.trim()
                  ) {
                    e.preventDefault();
                    handleFollowUpPrompts();
                  }
                }}
                disabled={isThinking}
                className="flex-1 w-full text-white outline-none focus:outline-none text-sm resize-none rounded-xl bg-transparent disabled:opacity-40 disabled:cursor-not-allowed"
                placeholder={isThinking ? "" : "Ask for changes..."}
              />
              <button
                onClick={handleFollowUpPrompts}
                disabled={isThinking || !followUpPrompt.trim()}
                className="bg-[#2235e5] ml-auto p-1.5 rounded-full size-fit disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              >
                {isThinking ? (
                  <svg
                    className="size-6 animate-spin text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z"
                    />
                  </svg>
                ) : (
                  <ArrowRight className="size-6 shrink-0" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="w-64 shrink-0 h-full flex flex-col">
        <FileExplorer
          steps={steps}
          onSelectFile={setSelectedFile}
          selectedFileId={selectedFile?.id || null}
        />
      </div>

      <div className="flex-1 flex flex-col h-full min-w-0">
        <div className="flex items-center bg-zinc-900 border-b border-zinc-800 h-12 px-3 shrink-0">
          <div className="flex gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
            <button
              onClick={() => setActiveTab("code")}
              className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === "code" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
            >
              <Code2 className="w-4 h-4" />
              Code
            </button>
            <button
              onClick={() => setActiveTab("preview")}
              className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === "preview" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
            >
              <MonitorPlay className="w-4 h-4" />
              Preview
            </button>
          </div>
          {phase === "done" && (
            <div className="p-1 bg-zinc-950 ml-auto rounded-md">
              <button
                onClick={handleDownloadFiles}
                className="ml-auto bg-zinc-800 text-white text-sm max-w-sm truncate pl-4 py-1.5 rounded-md px-4 cursor-pointer"
              >
                {isDownloading ? "Downloading..." : "Download Files"}
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-hidden relative bg-zinc-950 hide-scrollbar">
          {activeTab === "code" ? (
            <CodePreview code={selectedFile?.code || null} />
          ) : (
            <PreviewPanel filesReady={filesReady} webcontainer={webcontainer} />
          )}
        </div>
      </div>
    </div>
  );
}
