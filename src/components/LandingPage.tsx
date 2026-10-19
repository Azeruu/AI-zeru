import React, { useEffect, useState } from 'react';
import { SignInButton } from '@clerk/astro/react';
import { SiGithub } from '@icons-pack/react-simple-icons';

const LandingPage: React.FC = () => {
  const [particles, setParticles] = useState<{ id: number; left: string; size: string; duration: string; delay: string }[]>([]);

  useEffect(() => {
    // Generate particles only on client side
    const newParticles = Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      size: `${Math.random() * 3 + 1}px`,
      duration: `${Math.random() * 8 + 7}s`,
      delay: `${Math.random() * 5}s`,
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="relative h-screen w-full bg-[#221e1e] text-[#FDFBF7] overflow-hidden font-jakarta select-none">
      {/* Ambient Aura - Subtle blue glow from bottom */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(54,116,181,0.18),transparent_75%)] pointer-events-none" />

      {/* Particles - Zoltraak Magic Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((p) => (
          <div
            key={p.id}
            className="particle"
            style={{
              left: p.left,
              width: p.size,
              height: p.size,
              animationDuration: p.duration,
              animationDelay: p.delay,
              boxShadow: "0 0 8px #3674B5",
              opacity: 0.8,
            }}
          />
        ))}
      </div>

      {/* Hero Content */}
      <div className="relative h-screen flex flex-col items-center justify-center z-10 ">
        <div className="relative flex flex-col  items-start justify-start w-screen h-screen ">
          {/* Main Title "AIzeru" */}
          <div>
            <p>.</p>
          </div>
          <h1 className="text-[clamp(10rem,20vw,30rem)] w-screen flex justify-center items-center font-black font-medieval text-[var(--color-zoltraak)] drop-shadow-[0_0_35px_rgba(54,116,181,0.35)]">
            AI-zeru
          </h1>

          {/* Sub-text "AI WRAPPER CHAT" */}
          <div className="w-full flex justify-end -mt-25">
            <span className="text-xl md:text-3xl lg:text-4xl font-bold tracking-[0.4em] bg-gradient-to-r from-[#FDFBF7] to-[#3674B5] bg-clip-text text-transparent uppercase whitespace-nowrap">
              AI WRAPPER CHAT
            </span>
          </div>
        </div>
      </div>

      {/* Footer Hero Section */}
      <div className="absolute bottom-10 left-10 right-10 flex flex-col md:flex-row justify-between items-center md:items-end gap-8 z-20">
        {/* Left: Scroll to Explore */}
        <div className="hidden md:flex flex-col gap-0.5 text-[0.65rem] font-bold tracking-[0.25em] leading-tight text-[#FDFBF7]/80">
          <span>SCROLL</span>
          <span>TO</span>
          <span>EXPLORE</span>
        </div>

        {/* Middle-Left: Description */}
        <div className="md:absolute md:left-36 bottom-0 text-[0.65rem] font-medium tracking-[0.25em] max-w-[280px] uppercase text-[#FDFBF7]/60 text-center md:text-left">
          THE ZOLTRAAK AI INTERFACE WRAPPER BY AZERU
        </div>

        {/* Right: Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <SignInButton mode="modal" fallbackRedirectUrl="/dashboard">
            <button
              type="button"
              className="group w-60 relative flex items-center justify-center bg-[#3674B5] text-[#FDFBF7] px-10 py-4.5 rounded-[15px] font-bold text-[0.7rem] tracking-[0.2em] hover:bg-[#FDFBF7] hover:text-[#0A0A0A]  transition-all duration-500 shadow-[0_0_20px_rgba(253,251,247,0.15)] hover:shadow-[0_0_30px_rgba(253,251,247,0.3)] min-w-[180px] cursor-pointer"
            >
              GET STARTED
            </button>
          </SignInButton>

          <a
            href="https://github.com/azeruu/ai-zeru"
            target="_blank"
            rel="noopener noreferrer"
            className="group w-60 flex items-center gap-3 bg-[#3674B5] text-[#FDFBF7] border border-[#FDFBF7]/20 px-10 py-4 rounded-[15px] font-bold text-[0.7rem] tracking-[0.2em] hover:bg-[#FDFBF7] hover:text-[#0A0A0A] transition-all duration-500 min-w-[180px] justify-center"
          >
            <SiGithub
              size={18}
              aria-hidden="true"
              className="opacity-90 group-hover:scale-110 transition-transform duration-300"
            />
            DOCUMENTATION
          </a>
        </div>
      </div>

      {/* Background Spell Circle Effect (Static Decorative Element) */}
      <div className="absolute -bottom-64 left-1/2 -translate-x-1/2 w-[120vw] h-[60vh] border-[1px] border-[#3674B5]/10 rounded-[100%] blur-sm pointer-events-none" />
      <div className="absolute -bottom-80 left-1/2 -translate-x-1/2 w-[140vw] h-[70vh] border-[1px] border-[#3674B5]/5 rounded-[100%] blur-md pointer-events-none" />
    </div>
  );
};

export default LandingPage;
