import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AdminPage() {
  return (
    <div className="p-4 sm:p-6 md:p-8">
      <h1 className="mb-6 text-xl font-bold sm:text-2xl">管理后台</h1>
      <p className="mb-6 text-muted-foreground">管理口语测评题目与集合。</p>
      <div className="flex flex-wrap gap-2 sm:gap-4">
        <Button asChild>
          <Link href="/admin/questions">题目管理</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin/sets">题目集合</Link>
        </Button>
      </div>
    </div>
  );
}
