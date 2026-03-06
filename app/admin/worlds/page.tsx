"use client";

import Link from "next/link";
import { THEMES } from "@/lib/themes";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminWorldsPage() {
  return (
    <div className="p-4 sm:p-6 md:p-8">
      <h1 className="mb-6 text-xl font-bold sm:text-2xl">世界资产</h1>
      <p className="mb-6 text-muted-foreground">
        选择主题世界，生成并管理该世界的图片资产。
      </p>

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {THEMES.map((theme) => (
          <Link key={theme.id} href={`/admin/worlds/${theme.id}`}>
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardContent className="pt-6">
                <p className="font-medium text-center">{theme.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
