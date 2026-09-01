import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-neutral-50 text-neutral-900">
      <Sidebar />
      <main className="flex-1 p-6 md:p-10 max-w-5xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
