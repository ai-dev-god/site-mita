import AdminSidebar from "./AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--color-surface)", fontFamily: "var(--font-body)" }}>
      <AdminSidebar />

      {/* Main — on mobile, offset below fixed topbar (56px) */}
      <main style={{ flex: 1, overflowY: "auto" }} className="pt-14 md:pt-0">
        {children}
      </main>
    </div>
  );
}
