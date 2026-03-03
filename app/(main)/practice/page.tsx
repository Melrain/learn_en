"use client";

import Script from "next/script";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { RecordButton } from "@/components/practice/RecordButton";
import { ScoreCard } from "@/components/practice/ScoreCard";
import { Volume2, Loader2 } from "lucide-react";
import { usePracticeStore } from "@/stores/practice-store";
import { useSpeechEval } from "@/hooks/use-speech-eval";
import { QUESTION_TYPES, type QuestionTypeKey } from "@/lib/constants";

interface IQuestion {
  _id: string;
  refText: string;
  type: string;
  coreType?: string;
}

interface IQuestionSet {
  _id: string;
  name: string;
  description?: string;
  questionIds: IQuestion[];
}

function getCoreType(q: IQuestion): string {
  if (q.coreType) return q.coreType;
  const config = QUESTION_TYPES[q.type as QuestionTypeKey];
  return config?.coreType ?? "en.sent.score";
}

function PracticePageFallback() {
  return (
    <div className="container mx-auto max-w-2xl space-y-6 px-4 py-6 sm:px-6 sm:py-12">
      <h1 className="text-2xl font-bold">口语练习</h1>
      <p className="text-muted-foreground">加载中...</p>
      <Button asChild>
        <Link href="/">返回首页</Link>
      </Button>
    </div>
  );
}

function PracticePageContent() {
  const searchParams = useSearchParams();
  const [sets, setSets] = useState<IQuestionSet[]>([]);
  const [setsLoading, setSetsLoading] = useState(true);
  const [setsError, setSetsError] = useState<string | null>(null);
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [sdkError, setSdkError] = useState<string | null>(null);
  const [ttsLoading, setTtsLoading] = useState(false);

  const {
    currentQuestionIndex,
    questionIds,
    recordingStatus,
    result,
    loading,
    setCurrentSet,
    setQuestionIndex,
    setResult,
  } = usePracticeStore();

  const { startEval, stopEval, ensureEngine } = useSpeechEval();
  const lastSavedResultRef = useRef<unknown>(null);

  useEffect(() => {
    setSetsLoading(true);
    setSetsError(null);
    fetch("/api/sets")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error((data as { error?: string }).error ?? "加载失败");
        return data as IQuestionSet[];
      })
      .then((data) => {
        setSets(Array.isArray(data) ? data : []);
      })
      .catch((e) => {
        setSetsError(e instanceof Error ? e.message : "加载题目集合失败");
        setSets([]);
      })
      .finally(() => setSetsLoading(false));
  }, []);

  useEffect(() => {
    const setId = searchParams.get("setId");
    if (setId && sets.length > 0 && sets.some((s) => s._id === setId) && !selectedSetId) {
      const set = sets.find((s) => s._id === setId);
      if (set) {
        setSelectedSetId(setId);
        setCurrentSet(setId, set.questionIds.map((q) => q._id));
        setResult(null);
        setSdkError(null);
      }
    }
  }, [searchParams, sets, selectedSetId, setCurrentSet, setResult]);

  const selectedSet = sets.find((s) => s._id === selectedSetId);
  const questions = selectedSet?.questionIds ?? [];
  const currentQuestion = questions[currentQuestionIndex];

  useEffect(() => {
    const data = result as { result?: { overall?: number; rank?: string; details?: { char: string; score: number }[] } } | null;
    if (
      !data?.result ||
      data === lastSavedResultRef.current ||
      !selectedSetId ||
      !currentQuestion
    )
      return;
    lastSavedResultRef.current = data;
    const qId = currentQuestion._id;
    const qRefText = currentQuestion.refText?.trim() ?? "";
    fetch("/api/practice-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId: qId,
        questionSetId: selectedSetId,
        refText: qRefText,
        overall: data.result.overall ?? 0,
        rank: data.result.rank ?? null,
        details: data.result.details ?? [],
      }),
    }).catch((e) => console.error("[practice] save record failed:", e));
  }, [result, selectedSetId, currentQuestion?._id, currentQuestion?.refText]);

  const handleSelectSet = (setId: string) => {
    const set = sets.find((s) => s._id === setId);
    if (set) {
      setSelectedSetId(setId);
      setCurrentSet(setId, set.questionIds.map((q) => q._id));
      setResult(null);
      setSdkError(null);
    }
  };

  const handleStartRecord = async () => {
    if (!currentQuestion) return;
    const refText = currentQuestion.refText?.trim();
    if (!refText) {
      setSdkError("评测文本不能为空");
      return;
    }
    setSdkError(null);
    try {
      await ensureEngine();
      const coreType = getCoreType(currentQuestion);
      await startEval(refText, coreType);
    } catch (e) {
      setSdkError(e instanceof Error ? e.message : "启动失败");
    }
  };

  const handleStopRecord = () => {
    stopEval();
  };

  const handlePlayPronunciation = async () => {
    if (!currentQuestion) return;
    const text = currentQuestion.refText?.trim();
    if (!text) {
      setSdkError("评测文本不能为空");
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
          speech_rate: 0,
          voice: "cally",
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error((err as { error?: string }).error ?? "TTS 请求失败");
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

  if (setsLoading) {
    return (
      <div className="container mx-auto max-w-2xl space-y-6 px-4 py-6 sm:px-6 sm:py-12">
        <h1 className="text-2xl font-bold">口语练习</h1>
        <p className="text-muted-foreground">加载题目集合中...</p>
        <Button asChild>
          <Link href="/">返回首页</Link>
        </Button>
      </div>
    );
  }

  if (setsError) {
    return (
      <div className="container mx-auto max-w-2xl space-y-6 px-4 py-6 sm:px-6 sm:py-12">
        <h1 className="text-2xl font-bold">口语练习</h1>
        <p className="text-destructive">{setsError}</p>
        <p className="text-sm text-muted-foreground">
          请确保 MongoDB 已启动，或使用
          <Link href="/practice/test" className="mx-1 underline">
            快速测试
          </Link>
          验证语音评测闭环。
        </p>
        <Button asChild>
          <Link href="/">返回首页</Link>
        </Button>
      </div>
    );
  }

  if (sets.length === 0) {
    return (
      <div className="container mx-auto max-w-2xl space-y-6 px-4 py-6 sm:px-6 sm:py-12">
        <h1 className="text-2xl font-bold">口语练习</h1>
        <p className="text-muted-foreground">暂无题目集合，请在管理后台创建。</p>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/admin">管理后台</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/practice/test">快速测试</Link>
          </Button>
        </div>
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold">口语练习</h1>
          <Button asChild variant="outline" size="sm">
            <Link href="/">返回首页</Link>
          </Button>
        </div>

        {!selectedSet && (
          <div className="space-y-4">
            {searchParams.get("setId") &&
              !sets.some((s) => s._id === searchParams.get("setId")) && (
                <p className="text-sm text-amber-600 dark:text-amber-500">
                  未找到指定的题集，请选择其他题目集合。
                </p>
              )}
            <p className="text-muted-foreground">选择题目集合：</p>
            <div className="flex flex-wrap gap-2">
              {sets.map((s) => (
                <Button
                  key={s._id}
                  variant="outline"
                  onClick={() => handleSelectSet(s._id)}
                >
                  {s.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        {selectedSet && questions.length === 0 && (
          <p className="text-muted-foreground">该集合暂无题目。</p>
        )}

        {selectedSet && questions.length > 0 && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedSetId(null);
                  setSdkError(null);
                }}
              >
                更换集合
              </Button>
              <span className="text-sm text-muted-foreground">
                {currentQuestionIndex + 1} / {questions.length}
              </span>
            </div>

            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <div className="w-full rounded-lg border bg-muted/30 p-4 flex-1 sm:p-6">
                <p className="text-lg leading-relaxed">{currentQuestion.refText}</p>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handlePlayPronunciation}
                disabled={!currentQuestion.refText?.trim() || ttsLoading}
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
              onStop={handleStopRecord}
              disabled={!sdkReady}
            />

            {result != null ? <ScoreCard result={result} /> : null}

            <div className="flex justify-between gap-2 pt-4">
              <Button
                variant="outline"
                disabled={currentQuestionIndex <= 0}
                onClick={() => {
                  setQuestionIndex(currentQuestionIndex - 1);
                  setResult(null);
                  setSdkError(null);
                }}
              >
                上一题
              </Button>
              <Button
                variant="outline"
                disabled={currentQuestionIndex >= questions.length - 1}
                onClick={() => {
                  setQuestionIndex(currentQuestionIndex + 1);
                  setResult(null);
                  setSdkError(null);
                }}
              >
                下一题
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function PracticePage() {
  return (
    <Suspense fallback={<PracticePageFallback />}>
      <PracticePageContent />
    </Suspense>
  );
}
