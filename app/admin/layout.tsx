import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed left-0 top-0 z-40 h-screen w-56 border-r bg-card">
        <div className="flex h-16 items-center border-b px-6">
          <span className="font-semibold">Admin</span>
        </div>
        <nav className="space-y-1 p-4">
          <Link
            href="/admin"
            className="block rounded-md px-3 py-2 text-sm hover:bg-muted"
          >
            仪表盘
          </Link>
          <Link
            href="/admin/questions"
            className="block rounded-md px-3 py-2 text-sm hover:bg-muted"
          >
            题目管理
          </Link>
          <Link
            href="/admin/sets"
            className="block rounded-md px-3 py-2 text-sm hover:bg-muted"
          >
            题目集合
          </Link>
        </nav>
      </aside>
      <main className="pl-56">{children}</main>
    </div>
  );
}
