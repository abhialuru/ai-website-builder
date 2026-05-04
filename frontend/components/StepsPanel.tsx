import { CheckCircle2, Circle, Loader2 } from "lucide-react";

interface StepsPanelProps {
  phase: "idle" | "template" | "building" | "done";
}

const STEPS = [
  {
    phase: "template",
    doneAfter: ["building", "done"],
    label: "Analyzing prompt",
    description: "Picking the right template and structure",
  },
  {
    phase: "building",
    doneAfter: ["done"],
    label: "Generating code",
    description: "Writing your files with the AI",
  },
  {
    phase: "done",
    doneAfter: ["done"],
    label: "Ready",
    description: "Your app is built and ready for preview",
  },
];

function getStatus(step: (typeof STEPS)[number], phase: "idle" | "template" | "building" | "done") {
  if (phase === "idle") return "pending";
  if (step.doneAfter.includes(phase)) return "completed";
  if (step.phase === phase) return "in-progress";
  return "pending";
}

export default function StepsPanel({ phase }: StepsPanelProps) {
  return (
    <div className="h-full w-full bg-zinc-950 flex flex-col text-zinc-300">
      <div className="p-4 border-b border-zinc-800 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        Progress
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {STEPS.map((step) => {
          const status = getStatus(step, phase);
          return (
            <div key={step.phase} className="flex gap-3">
              <div className="mt-0.5 shrink-0">
                {status === "completed" && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                {status === "in-progress" && <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
                {status === "pending" && <Circle className="w-5 h-5 text-zinc-700" />}
              </div>
              <div>
                <div className={`text-sm font-medium ${status === "pending" ? "text-zinc-600" : "text-zinc-200"}`}>
                  {step.label}
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">{step.description}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}