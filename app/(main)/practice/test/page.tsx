"use client";

import Script from "next/script";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RecordButton } from "@/components/practice/RecordButton";
import { ScoreCard } from "@/components/practice/ScoreCard";
import { usePracticeStore } from "@/stores/practice-store";
import { useSpeechEval } from "@/hooks/use-speech-eval";

const DEFAULT_REF_TEXT = "hello world";

const CORE_OPTIONS: { value: string; label: string }[] = [
  { value: "en.word.score", label: "单词" },
  { value: "en.sent.score", label: "句子" },
  { value: "en.pred.score", label: "段落" },
];

export default function PracticeTestPage() {
  const [refText, setRefText] = useState(DEFAULT_REF_TEXT);
  const [coreType, setCoreType] = useState("en.sent.score");
  const [sdkReady, setSdkReady] = useState(false);
  const [sdkError, setSdkError] = useState<string | null>(null);

  const { recordingStatus, result, loading, setResult } = usePracticeStore();
  const { startEval, stopEval, ensureEngine } = useSpeechEval();

  const handleStartRecord = async () => {
    const text = refText.trim();
    if (!text) {
      setSdkError("请输入评测文本");
      return;
    }
    setSdkError(null);
    setResult(null);
    try {
      await ensureEngine();
      await startEval(text, coreType);
    } catch (e) {
      setSdkError(e instanceof Error ? e.message : "启动失败");
    }
  };

  return (
    <>
      <Script
        src="/sdk/engine.js"
        strategy="afterInteractive"
        onLoad={() => {
          const ready = typeof window !== "undefined" && !!(window as { EngineEvaluat?: unknown }).EngineEvaluat;
          setSdkReady(ready);
          if (!ready) setSdkError("engine.js 已加载但 EngineEvaluat 未就绪，请确认文件完整");
        }}
        onError={() => setSdkError("engine.js 加载失败")}
      />
      <div className="container mx-auto max-w-2xl space-y-6 py-12">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">语音评测闭环测试</h1>
          <Button asChild variant="outline" size="sm">
            <Link href="/practice">返回练习</Link>
          </Button>
        </div>

        <p className="text-muted-foreground">
          无需 MongoDB，直接测试：收集语音 → 阿里云评测 → 获得评分
        </p>

        <div className="space-y-2">
          <label className="text-sm font-medium">评测文本（refText）</label>
          <input
            type="text"
            value={refText}
            onChange={(e) => setRefText(e.target.value)}
            placeholder="例如：hello world"
            className="w-full rounded-md border bg-background px-3 py-2 text-base"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">评测类型（coreType）</label>
          <div className="flex gap-2">
            {CORE_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant={coreType === opt.value ? "default" : "outline"}
                size="sm"
                onClick={() => setCoreType(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="rounded-lg border bg-muted/30 p-6">
          <p className="text-lg leading-relaxed">{refText || "（请输入评测文本）"}</p>
        </div>

        {!sdkReady && !sdkError && (
          <p className="text-sm text-muted-foreground">SDK 加载中...</p>
        )}
        {sdkError && (
          <p className="text-sm text-destructive">{sdkError}</p>
        )}

        <RecordButton
          status={recordingStatus}
          loading={loading}
          onStart={handleStartRecord}
          onStop={stopEval}
          disabled={!sdkReady}
        />

        {result != null ? <ScoreCard result={result} /> : null}
      </div>
    </>
  );
}
