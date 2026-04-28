import { ReactNode } from "react";

export default function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 relative overflow-hidden">
      {/* Decorative grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      {/* Glow orbs */}
      <div className="absolute top-1/4 -left-40 w-96 h-96 bg-accent/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center mb-5">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center shadow-lg shadow-accent/30">
              <span className="text-white font-mono font-bold text-2xl">S</span>
            </div>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight mb-2">{title}</h1>
          <p className="text-sm text-gray-400 font-mono">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  );
}
