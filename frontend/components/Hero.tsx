"use client";

import { SendHorizonal } from "lucide-react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { useState } from "react";

export default function Hero() {

  const [prompt, setPrompt] = useState("")
  const router = useRouter()

  function handlePrompt(e:React.FormEvent) {
    e.preventDefault();
    
    if (prompt.trim()) {
      localStorage.setItem("prompt",prompt.trim());
      router.push(`/build`)
    }

  }

  return (
    <>
      {/* Load script once */}
      <Script
        src="/finisher-header.es5.min.js"
        strategy="afterInteractive"
        onLoad={() => {
          // @ts-ignore
          new window.FinisherHeader({
            count: 10,
            size: {
              min: 1300,
              max: 1500,
              pulse: 0,
            },
            speed: {
              x: { min: 0.1, max: 0.6 },
              y: { min: 0.1, max: 0.6 },
            },
            colors: {
              background: "#9138e5",
              particles: ["#000000", "#000000", "#2235e5", "#000000"],
            },
            blending: "overlay",
            opacity: {
              center: 0.5,
              edge: 0.05,
            },
            skew: 0,
            shapes: ["c"],
          });
        }}
      />

       <div className="finisher-header relative h-screen w-full flex items-center justify-center overflow-hidden">
         {/* Refined Logo (Minor adjustment to typography) */}
         <div className="absolute top-8 left-8 md:top-10 md:left-10 z-20 select-none">
           <span className="text-xl md:text-2xl font-semibold tracking-tight text-white">
             BodhaAI 
           </span>
         </div>

         <div className="relative z-10 mt-[-4vh] w-full max-w-3xl px-6 text-center text-white">
           {/* Minimal Heading with typography hierarchy */}
           <h1 className="text-5xl md:text-7xl font-semibold tracking-tighter text-white/95">
             Where <span className="font-light italic text-white/80">ideas</span>
             <br className="hidden md:block" />
             become <span className="font-light italic text-white/80">products</span>.
           </h1>

           {/* Refined Description text */}
           <p className="mt-6 md:mt-8 text-base md:text-lg text-white/50 font-light tracking-wide max-w-lg mx-auto">
             Describe what you envision, and we will generate it instantly. No complexity, just creation.
           </p>

           {/* Simple, sleek Input Box */}
           <div className="mt-12 mx-auto max-w-xl">
             <form onSubmit={handlePrompt} className="group relative flex flex-col items-center rounded-2xl bg-black/10 border border-white/10 backdrop-blur-md transition-all duration-300 focus-within:border-white/25 focus-within:bg-black/20 hover:border-white/20">
               <input
                 value={prompt}
                 onChange={(e) => setPrompt(e.target.value)}
                 className="w-full bg-transparent px-6 py-5 text-[15px] text-white placeholder:text-white/30 focus:outline-none"
                 placeholder="What do you want to build?"
                 spellCheck={false}
               />
               <div className="w-full flex items-center justify-end pr-2 pb-2">
                 <button type="submit" className="flex h-11 items-center gap-2 rounded-xl bg-white/90 px-6 text-sm font-medium text-black transition-all duration-300 hover:bg-white hover:scale-[1.02] active:scale-[0.98]">
                   Build
                   <SendHorizonal className="h-4 w-4" />
                 </button>
               </div>
             </form>
           </div>
         </div>
       </div>
    </>
  );
}