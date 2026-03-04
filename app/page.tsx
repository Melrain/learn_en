import { Link } from "next-view-transitions";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 sm:p-6 md:p-8">
      <main className="flex max-w-2xl flex-col items-center gap-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Learn EN - 口语测评
        </h1>
        <p className="text-center text-muted-foreground">
          中英文口语智能评测，提升发音准确性。
        </p>
        <div className="flex flex-wrap justify-center gap-2 sm:gap-4">
          <Button asChild>
            <Link href="/practice">开始练习</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/chat">AI 助手</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/practice/test">语音评测测试</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin">管理后台</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
