import { useState, useMemo } from "react";
import { Step } from "@/types";
import { File, Folder, FolderOpen, ChevronRight } from "lucide-react";

interface FileExplorerProps {
  steps: Step[];
  onSelectFile: (fileStep: Step) => void;
  selectedFileId: number | null;
}

// Recursive tree node type
interface TreeNode {
  name: string;
  fullPath: string;
  type: "file" | "folder";
  children: TreeNode[];
  step?: Step; // only for file nodes
}

// Build a nested tree from flat file paths
function buildTree(fileSteps: Step[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const step of fileSteps) {
    const parts = (step.path ?? "").replace(/^\//, "").split("/");
    let currentLevel = root;

    parts.forEach((part, index) => {
      const isLast = index === parts.length - 1;
      const fullPath = parts.slice(0, index + 1).join("/");

      let existing = currentLevel.find((n) => n.name === part);

      if (!existing) {
        existing = {
          name: part,
          fullPath,
          type: isLast ? "file" : "folder",
          children: [],
          step: isLast ? step : undefined,
        };
        currentLevel.push(existing);
      }  else if (isLast) {
         existing.step = step;
      }

      if (!isLast) {
        currentLevel = existing.children;
      }
    });
  }

  return root;
}

interface TreeNodeProps {
  node: TreeNode;
  depth: number;
  onSelectFile: (step: Step) => void;
  selectedFileId: number | null;
  defaultOpen?: boolean;
}

function TreeNodeItem({
  node,
  depth,
  onSelectFile,
  selectedFileId,
  defaultOpen = true,
}: TreeNodeProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (node.type === "file" && node.step) {
    const isSelected = selectedFileId === node.step.id;
    return (
      <div
        onClick={() => onSelectFile(node.step!)}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        className={`flex items-center gap-2 pr-3 py-1.5 rounded-md cursor-pointer text-sm transition-colors group ${
          isSelected
            ? "bg-zinc-700/80 text-white"
            : "hover:bg-zinc-800/60 text-zinc-400 hover:text-zinc-100"
        }`}
      >
        <File
          className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-blue-400" : "text-zinc-500 group-hover:text-zinc-400"}`}
        />
        <span className="truncate font-mono text-xs">{node.name}</span>
      </div>
    );
  }

  // Folder node
  return (
    <div>
      <div
        onClick={() => setIsOpen((prev) => !prev)}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        className="flex items-center gap-1.5 pr-3 py-1.5 rounded-md cursor-pointer text-sm transition-colors hover:bg-zinc-800/60 text-zinc-300 hover:text-zinc-100 group hide-scrollbar"
      >
        <ChevronRight
          className={`w-3 h-3 shrink-0 text-zinc-500 transition-transform duration-150 ${isOpen ? "rotate-90" : ""}`}
        />
        {isOpen ? (
          <FolderOpen className="w-3.5 h-3.5 shrink-0 text-yellow-500/80" />
        ) : (
          <Folder className="w-3.5 h-3.5 shrink-0 text-yellow-500/80" />
        )}
        <span className="truncate font-mono text-xs font-medium">{node.name}</span>
      </div>

      {isOpen && node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <TreeNodeItem
              key={child.fullPath}
              node={child}
              depth={depth + 1}
              onSelectFile={onSelectFile}
              selectedFileId={selectedFileId}
              defaultOpen={true}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FileExplorer({
  steps,
  onSelectFile,
  selectedFileId,
}: FileExplorerProps) {
  const fileSteps = steps.filter((s) => s.path && s.code);

  const tree = useMemo(() => buildTree(fileSteps), [fileSteps]);

  return (
    <div className="h-full w-full bg-zinc-950 border-r border-zinc-800 flex flex-col text-zinc-300">
      <div className="p-4 border-b border-zinc-800 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        Explorer
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5 hide-scrollbar">
        {tree.length === 0 ? (
          <p className="text-xs text-zinc-600 px-3 py-2">No files yet.</p>
        ) : (
          tree.map((node) => (
            <TreeNodeItem
              key={node.fullPath}
              node={node}
              depth={0}
              onSelectFile={onSelectFile}
              selectedFileId={selectedFileId}
              defaultOpen={true}
            />
          ))
        )}
      </div>
    </div>
  );
}
