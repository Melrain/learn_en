import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PracticePage() {
  return (
    <div className="container mx-auto max-w-2xl space-y-6 py-12">
      <h1 className="text-2xl font-bold">口语练习</h1>
      <p className="text-muted-foreground">
        选择题目集合开始练习，录音后提交评测。
      </p>
      <Button asChild>
        <Link href="/">返回首页</Link>
      </Button>
    </div>
  );
}
