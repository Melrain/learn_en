"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/", label: "首页" },
  { href: "/admin", label: "仪表盘" },
  { href: "/admin/questions", label: "题目管理" },
  { href: "/admin/sets", label: "题目集合" },
  { href: "/admin/worlds", label: "世界资产" },
];

function NavLinks({ onLinkClick }: { onLinkClick?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-1 p-4">
      {navLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          onClick={onLinkClick}
          className={`block rounded-md px-3 py-2 text-sm hover:bg-muted ${
            pathname === link.href ? "bg-muted" : ""
          }`}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile: header with hamburger */}
      <header className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center border-b bg-card px-4 md:hidden">
        {mounted ? (
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="打开菜单">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-56 p-0">
              <SheetHeader className="border-b px-4 py-4">
                <SheetTitle>Admin</SheetTitle>
              </SheetHeader>
              <NavLinks onLinkClick={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
        ) : (
          <button
            type="button"
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
            aria-label="打开菜单"
            disabled
          >
            <Menu className="size-5" />
          </button>
        )}
        <span className="ml-4 font-semibold">Admin</span>
      </header>

      {/* Desktop: fixed sidebar (hidden on mobile) */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-56 border-r bg-card md:block">
        <div className="flex h-16 items-center border-b px-6">
          <span className="font-semibold">Admin</span>
        </div>
        <NavLinks />
      </aside>

      <main className="pl-0 pt-16 md:pt-0 md:pl-56">{children}</main>
    </div>
  );
}
