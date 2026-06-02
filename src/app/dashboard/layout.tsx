import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import BottomNav from "@/components/BottomNav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0a0a0f" }}>
      <main className="flex-1 pb-24 max-w-2xl mx-auto w-full">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
