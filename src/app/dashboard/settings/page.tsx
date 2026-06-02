"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { LogOut, User, Activity, ChevronRight } from "lucide-react";

export default function SettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();

  async function handleSignOut() {
    await signOut({ redirect: false });
    router.push("/login");
  }

  return (
    <div className="px-4 pt-14 pb-4">
      <h1 className="text-2xl font-bold mb-8 fade-in-up" style={{ color: "#f5f5f7" }}>Settings</h1>

      {/* Profile */}
      <div className="card p-5 mb-4 fade-in-up" style={{ animationDelay: "0.05s" }}>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
            style={{ background: "linear-gradient(135deg, #30d158, #25a244)" }}>
            <User size={26} color="white" />
          </div>
          <div>
            <p className="text-base font-semibold" style={{ color: "#f5f5f7" }}>{session?.user?.name}</p>
            <p className="text-sm" style={{ color: "#8e8e93" }}>@{session?.user?.email}</p>
          </div>
        </div>
      </div>

      {/* App info */}
      <div className="card overflow-hidden mb-4 fade-in-up" style={{ animationDelay: "0.1s" }}>
        <div className="px-5 py-4 border-b flex items-center gap-3" style={{ borderColor: "#2c2c2e" }}>
          <Activity size={18} style={{ color: "#30d158" }} />
          <p className="text-sm font-medium" style={{ color: "#f5f5f7" }}>TredTrack</p>
          <span className="ml-auto text-xs" style={{ color: "#8e8e93" }}>v1.0</span>
        </div>
        <div className="px-5 py-4 flex items-center gap-3">
          <span className="text-sm" style={{ color: "#f5f5f7" }}>📏 Distance unit</span>
          <span className="ml-auto text-sm font-medium" style={{ color: "#30d158" }}>km</span>
          <ChevronRight size={16} style={{ color: "#636366" }} />
        </div>
      </div>

      {/* OCR tips */}
      <div className="card p-5 mb-6 fade-in-up" style={{ animationDelay: "0.15s",
        background: "rgba(48,209,88,0.06)", border: "1px solid rgba(48,209,88,0.15)" }}>
        <p className="text-sm font-semibold mb-3" style={{ color: "#30d158" }}>📷 Photo Upload Tips</p>
        <ul className="text-sm space-y-2" style={{ color: "#8e8e93" }}>
          <li>• Position phone 20–30 cm from the display</li>
          <li>• Ensure display is bright and not glaring</li>
          <li>• Make the <strong style={{ color: "#f5f5f7" }}>time (MM:SS)</strong> and <strong style={{ color: "#f5f5f7" }}>distance</strong> clearly visible</li>
          <li>• Avoid motion blur — hold steady when shooting</li>
          <li>• Horizontal orientation often works best</li>
        </ul>
      </div>

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        className="w-full card p-4 flex items-center gap-3 active:scale-95 transition-transform"
        style={{ border: "1px solid rgba(255,69,58,0.25)" }}>
        <LogOut size={18} style={{ color: "#ff453a" }} />
        <span className="text-sm font-semibold" style={{ color: "#ff453a" }}>Sign Out</span>
      </button>
    </div>
  );
}
