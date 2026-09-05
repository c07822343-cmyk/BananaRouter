"use client";

export function DesktopBackground() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden bg-[#09090b]">
      {/* extremely subtle lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_50%_-20%,#1a1a1e_0%,transparent_60%),radial-gradient(800px_500px_at_80%_100%,#141416_0%,transparent_55%)]" />
      {/* barely visible noise */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
      {/* thin grid at very low opacity */}
      <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`, backgroundSize: `40px 40px` }} />
    </div>
  );
}
