"use client";

import Script from "next/script";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { RecordButton } from "@/components/practice/RecordButton";
import { Volume2, Loader2 } from "lucide-react";
import { ScoreCard } from "@/components/practice/ScoreCard";
import { usePracticeStore } from "@/stores/practice-store";
import { useSpeechEval } from "@/hooks/use-speech-eval";

const DEFAULT_REF_TEXT = "hello world";

const CORE_OPTIONS: { value: string; label: string }[] = [
  { value: "en.word.score", label: "单词" },
  { value: "en.sent.score", label: "句子" },
  { value: "en.pred.score", label: "段落" },
];

const TTS_SPEECH_RATE_OPTIONS: { value: number; label: string }[] = [
  { value: -500, label: "0.5x" },
  { value: 0, label: "1x" },
  { value: 166, label: "1.2x" },
  { value: 250, label: "1.5x" },
  { value: 500, label: "2x" },
];

const TTS_VOICE_OPTIONS: { value: string; label: string }[] = [
  { value: "cally", label: "cally 美音女（口语）" },
  { value: "abby", label: "abby 美音女" },
  { value: "andy", label: "andy 美音男" },
  { value: "eric", label: "eric 英音男" },
  { value: "emily", label: "emily 英音女" },
  { value: "harry", label: "harry 英音男" },
  { value: "luna", label: "luna 英音女" },
  { value: "luca", label: "luca 英音男" },
  { value: "wendy", label: "wendy 英音女" },
  { value: "william", label: "william 英音男" },
];

export default function PracticeTestPage() {
  const [refText, setRefText] = useState(DEFAULT_REF_TEXT);
  const [coreType, setCoreType] = useState("en.sent.score");
  const [sdkReady, setSdkReady] = useState(false);
  const [sdkError, setSdkError] = useState<string | null>(null);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsSpeechRate, setTtsSpeechRate] = useState(0);
  const [ttsVoice, setTtsVoice] = useState("cally");

  const { recordingStatus, result, loading, setResult } = usePracticeStore();
  const { startEval, stopEval, ensureEngine } = useSpeechEval();
  const lastSavedResultRef = useRef<unknown>(null);
  const evalRefTextRef = useRef<string>("");

  useEffect(() => {
    const data = result as { result?: { overall?: number; rank?: string; details?: { char: string; score: number }[] } } | null;
    if (!data?.result || data === lastSavedResultRef.current) return;
    lastSavedResultRef.current = data;
    fetch("/api/practice-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        refText: evalRefTextRef.current,
        overall: data.result.overall ?? 0,
        rank: data.result.rank ?? null,
        details: data.result.details ?? [],
      }),
    }).catch((e) => console.error("[practice-test] save record failed:", e));
  }, [result]);

  const handleStartRecord = async () => {
    const text = refText.trim();
    if (!text) {
      setSdkError("请输入评测文本");
      return;
    }
    setSdkError(null);
    setResult(null);
    evalRefTextRef.current = text;
    try {
      await ensureEngine();
      await startEval(text, coreType);
    } catch (e) {
      setSdkError(e instanceof Error ? e.message : "启动失败");
    }
  };

  const handlePlayPronunciation = async () => {
    const text = refText.trim();
    if (!text) {
      setSdkError("请输入评测文本");
      return;
    }
    setSdkError(null);
    setTtsLoading(true);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          speech_rate: ttsSpeechRate,
          voice: ttsVoice,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error ?? "TTS 请求失败");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      try {
        await audio.play();
        audio.onended = () => URL.revokeObjectURL(url);
      } catch (playErr) {
        URL.revokeObjectURL(url);
        throw playErr;
      }
    } catch (e) {
      setSdkError(e instanceof Error ? e.message : "播放失败");
    } finally {
      setTtsLoading(false);
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
      <div className="container mx-auto max-w-2xl space-y-6 px-4 py-6 sm:px-6 sm:py-12">
        <div className="flex flex-wrap items-center justify-between gap-2">
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
          <div className="flex flex-wrap gap-2">
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

        <div className="space-y-2">
          <label className="text-sm font-medium">语速（TTS）</label>
          <div className="flex flex-wrap gap-2">
            {TTS_SPEECH_RATE_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant={ttsSpeechRate === opt.value ? "default" : "outline"}
                size="sm"
                onClick={() => setTtsSpeechRate(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">发音人（TTS）</label>
          <select
            value={ttsVoice}
            onChange={(e) => setTtsVoice(e.target.value)}
            className="w-full max-w-[280px] rounded-md border bg-background px-3 py-2 text-sm"
          >
            {TTS_VOICE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <div className="w-full rounded-lg border bg-muted/30 p-4 flex-1 sm:p-6">
            <p className="text-lg leading-relaxed">{refText || "（请输入评测文本）"}</p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handlePlayPronunciation}
            disabled={!refText.trim() || ttsLoading}
            title="标准发音"
          >
            {ttsLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Volume2 className="size-4" />
            )}
          </Button>
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
