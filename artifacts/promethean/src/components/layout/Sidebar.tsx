import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Workflow,
  Library,
  Plus,
  Zap,
} from "lucide-react";

const NAV = [
  { href: "/", icon: LayoutDashboard, label: "Command Center" },
  { href: "/templates", icon: Library, label: "Template Library" },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <aside
      className="w-64 flex-shrink-0 h-screen border-r flex flex-col"
      style={{
        background: "#0a0e14",
        borderColor: "rgba(0, 212, 255, 0.2)",
      }}
    >
      {/* Logo */}
      <div className="p-6 border-b" style={{ borderColor: "rgba(0, 212, 255, 0.2)" }}>
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(0, 212, 255, 0.15)", border: "1px solid rgba(0, 212, 255, 0.4)" }}
          >
            <Zap className="w-5 h-5" style={{ color: "#00d4ff" }} />
          </div>
          <div>
            <h1 className="font-orbitron text-base font-bold" style={{ color: "#00d4ff" }}>
              PROMETHEAN
            </h1>
            <p className="text-xs font-jetbrains" style={{ color: "rgba(230, 237, 243, 0.5)" }}>
              WORKFLOW STUDIO
            </p>
          </div>
        </div>
      </div>

      {/* New Workflow */}
      <div className="p-4">
        <Link href="/wizard">
          <button
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all hover:opacity-90 active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, rgba(0, 212, 255, 0.2), rgba(255, 0, 170, 0.2))",
              border: "1px solid rgba(0, 212, 255, 0.4)",
              color: "#00d4ff",
              fontFamily: "'Orbitron', sans-serif",
              letterSpacing: "0.05em",
              fontSize: "11px",
            }}
          >
            <Plus className="w-4 h-4" />
            NEW WORKFLOW
          </button>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1">
        {NAV.map(({ href, icon: Icon, label }) => {
          const isActive = location === href;
          return (
            <Link key={href} href={href}>
              <button
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left",
                  isActive
                    ? "text-cyan-400"
                    : "hover:bg-white/5"
                )}
                style={
                  isActive
                    ? {
                        background: "rgba(0, 212, 255, 0.1)",
                        color: "#00d4ff",
                        border: "1px solid rgba(0, 212, 255, 0.2)",
                      }
                    : { color: "rgba(230, 237, 243, 0.7)" }
                }
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t" style={{ borderColor: "rgba(0, 212, 255, 0.1)" }}>
        <p className="text-xs font-jetbrains text-center" style={{ color: "rgba(230, 237, 243, 0.3)" }}>
          v0.1.0 ALPHA
        </p>
      </div>
    </aside>
  );
}
