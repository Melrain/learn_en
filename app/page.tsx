import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
      <main className="flex max-w-2xl flex-col items-center gap-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Learn EN - 口语测评
        </h1>
        <p className="text-center text-muted-foreground">
          中英文口语智能评测，提升发音准确性。
        </p>
        <div className="flex gap-4">
          <Button asChild>
            <Link href="/practice">开始练习</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin">管理后台</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
