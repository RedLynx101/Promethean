import { Link } from "wouter";
import { Zap, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen text-center"
      style={{ background: "#0a0e14" }}
    >
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
        style={{ background: "rgba(255,0,170,0.1)", border: "1px solid rgba(255,0,170,0.3)" }}
      >
        <Zap className="w-10 h-10" style={{ color: "#ff00aa" }} />
      </div>
      <h1 className="font-orbitron text-6xl font-black mb-2" style={{ color: "#ff00aa" }}>
        404
      </h1>
      <p className="font-orbitron text-lg mb-2" style={{ color: "#e6edf3" }}>
        SIGNAL LOST
      </p>
      <p className="text-sm mb-8" style={{ color: "rgba(230,237,243,0.5)" }}>
        The page you're looking for doesn't exist in this timeline.
      </p>
      <Link href="/">
        <button
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all hover:opacity-90"
          style={{
            background: "rgba(0,212,255,0.15)",
            border: "1px solid rgba(0,212,255,0.4)",
            color: "#00d4ff",
            fontFamily: "'Orbitron', sans-serif",
          }}
        >
          <Home className="w-4 h-4" />
          RETURN TO BASE
        </button>
      </Link>
    </div>
  );
}
