import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AdminPage() {
  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold">管理后台</h1>
      <p className="mb-6 text-muted-foreground">管理口语测评题目与集合。</p>
      <div className="flex gap-4">
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
