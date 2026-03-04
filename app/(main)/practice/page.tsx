'use client';

import Script from 'next/script';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { RecordButton } from '@/components/practice/RecordButton';
import { ScoreCard } from '@/components/practice/ScoreCard';
import { SetSelector } from '@/components/practice/SetSelector';
import { QuestionCard } from '@/components/practice/QuestionCard';
import { PracticeStateLayout } from '@/components/practice/PracticeStateLayout';
import { usePracticeStore } from '@/stores/practice-store';
import { useSpeechEval } from '@/hooks/use-speech-eval';
import { QUESTION_TYPES, type QuestionTypeKey } from '@/lib/constants';
import type { IQuestion, IQuestionSetPopulated } from '@/types';


function getCoreType(q: IQuestion): string {
  if (q.coreType) return q.coreType;
  const config = QUESTION_TYPES[q.type as QuestionTypeKey];
  return config?.coreType ?? 'en.sent.score';
}

function PracticePageFallback() {
  return (
    <PracticeStateLayout>
      <p className='text-muted-foreground'>加载中...</p>
      <Button asChild>
        <Link href='/'>返回首页</Link>
      </Button>
    </PracticeStateLayout>
  );
}

function PracticePageContent() {
  const searchParams = useSearchParams();
  const [sets, setSets] = useState<IQuestionSetPopulated[]>([]);
  const [setsLoading, setSetsLoading] = useState(true);
  const [setsError, setSetsError] = useState<string | null>(null);
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [sdkReady, setSdkReady] = useState(
    () => typeof window !== 'undefined' && !!window.EngineEvaluat,
  );
  const [sdkError, setSdkError] = useState<string | null>(null);
  const [ttsSpeechRate, setTtsSpeechRate] = useState(0);
  const [silenceTimeoutMs, setSilenceTimeoutMs] = useState(1800);

  const {
    currentQuestionIndex,
    recordingStatus,
    result,
    loading,
    setCurrentSet,
    setQuestionIndex,
    setResult,
  } = usePracticeStore();

  const { startEval, stopEval, ensureEngine, resetEngine } = useSpeechEval();
  const lastSavedResultRef = useRef<unknown>(null);

  useEffect(() => {
    const checkSdk = () =>
      typeof window !== 'undefined' && !!window.EngineEvaluat;

    if (checkSdk()) {
      setSdkReady(true);
      return;
    }

    const timer = setInterval(() => {
      if (checkSdk()) {
        setSdkReady(true);
        clearInterval(timer);
      }
    }, 300);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && checkSdk()) {
        setSdkReady(true);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/sets')
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok)
          throw new Error((data as { error?: string }).error ?? '加载失败');
        return data as IQuestionSetPopulated[];
      })
      .then((data) => {
        if (!cancelled) setSets(Array.isArray(data) ? data : []);
      })
      .catch((e) => {
        if (!cancelled)
          setSetsError(e instanceof Error ? e.message : '加载题目集合失败');
        if (!cancelled) setSets([]);
      })
      .finally(() => {
        if (!cancelled) setSetsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const setId = searchParams.get('setId');
    if (
      setId &&
      sets.length > 0 &&
      sets.some((s) => s._id === setId) &&
      !selectedSetId
    ) {
      const set = sets.find((s) => s._id === setId);
      if (set) {
        const id = setId;
        const ids = set.questionIds.map((q) => String(q._id));
        const tick = () => {
          setSelectedSetId(id);
          setCurrentSet(id, ids);
          setResult(null);
          setSdkError(null);
        };
        const id_ = setTimeout(tick, 0);
        return () => clearTimeout(id_);
      }
    }
  }, [searchParams, sets, selectedSetId, setCurrentSet, setResult]);

  const selectedSet = sets.find((s) => s._id === selectedSetId);
  const questions = selectedSet?.questionIds ?? [];
  const currentQuestion = questions[currentQuestionIndex];

  useEffect(() => {
    const data = result as {
      result?: {
        overall?: number;
        rank?: string;
        details?: { char: string; score: number }[];
      };
    } | null;
    if (
      !data?.result ||
      data === lastSavedResultRef.current ||
      !selectedSetId ||
      !currentQuestion
    )
      return;
    lastSavedResultRef.current = data;
    const qId = currentQuestion._id;
    const qRefText = currentQuestion.refText?.trim() ?? '';
    fetch('/api/practice-records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: qId,
        questionSetId: selectedSetId,
        refText: qRefText,
        overall: data.result.overall ?? 0,
        rank: data.result.rank ?? null,
        details: data.result.details ?? [],
      }),
    }).catch((e) => console.error('[practice] save record failed:', e));
  }, [result, selectedSetId, currentQuestion]);

  const handleSelectSet = (setId: string) => {
    const set = sets.find((s) => s._id === setId);
    if (set) {
      setSelectedSetId(setId);
      setCurrentSet(
        setId,
        set.questionIds.map((q) => String(q._id)),
      );
      setResult(null);
      setSdkError(null);
    }
  };

  const handleStartRecord = async () => {
    if (!currentQuestion) return;
    const refText = currentQuestion.refText?.trim();
    if (!refText) {
      setSdkError('评测文本不能为空');
      return;
    }
    setSdkError(null);
    try {
      await ensureEngine();
      const coreType = getCoreType(currentQuestion);
      await startEval(refText, coreType, { silenceTimeoutMs });
    } catch (e) {
      resetEngine();
      setSdkError(e instanceof Error ? e.message : '启动失败');
    }
  };

  if (setsLoading) {
    return (
      <PracticeStateLayout>
        <p className='text-muted-foreground'>加载题目集合中...</p>
        <Button asChild>
          <Link href='/'>返回首页</Link>
        </Button>
      </PracticeStateLayout>
    );
  }

  if (setsError) {
    return (
      <PracticeStateLayout>
        <p className='text-destructive'>{setsError}</p>
        <p className='text-sm text-muted-foreground'>
          请确保 MongoDB 已启动，或使用
          <Link
            href='/practice/test'
            className='mx-1 underline'>
            快速测试
          </Link>
          验证语音评测闭环。
        </p>
        <Button asChild>
          <Link href='/'>返回首页</Link>
        </Button>
      </PracticeStateLayout>
    );
  }

  if (sets.length === 0) {
    return (
      <PracticeStateLayout>
        <p className='text-muted-foreground'>
          暂无题目集合，请在管理后台创建。
        </p>
        <div className='flex flex-wrap gap-2'>
          <Button asChild>
            <Link href='/admin'>管理后台</Link>
          </Button>
          <Button
            asChild
            variant='outline'>
            <Link href='/practice/test'>快速测试</Link>
          </Button>
        </div>
      </PracticeStateLayout>
    );
  }

  return (
    <>
      <Script
        id='aliyun-speech-sdk'
        src='/sdk/engine.js'
        strategy='afterInteractive'
        onReady={() => {
          const ready =
            typeof window !== 'undefined' &&
            !!(window as { EngineEvaluat?: unknown }).EngineEvaluat;
          setSdkReady(ready);
          if (!ready)
            setSdkError(
              'engine.js 已加载但 EngineEvaluat 未就绪，请确认文件完整',
            );
        }}
        onError={() => setSdkError('engine.js 加载失败')}
      />
      <div className='container mx-auto max-w-2xl space-y-6 px-4 py-6 sm:px-6 sm:py-12'>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <h1 className='text-2xl font-bold'>口语练习</h1>
          <Button
            asChild
            variant='outline'
            size='sm'>
            <Link href='/'>返回首页</Link>
          </Button>
        </div>

        {!selectedSet && (
          <SetSelector
            sets={sets}
            urlSetId={searchParams.get('setId')}
            onSelect={handleSelectSet}
          />
        )}

        {selectedSet && questions.length === 0 && (
          <p className='text-muted-foreground'>该集合暂无题目。</p>
        )}

        {selectedSet && questions.length > 0 && (
          <div className='space-y-6'>
            <div className='flex flex-wrap items-center gap-2'>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => {
                  setSelectedSetId(null);
                  setSdkError(null);
                }}>
                更换集合
              </Button>
              <span className='text-sm text-muted-foreground'>
                {currentQuestionIndex + 1} / {questions.length}
              </span>
            </div>

            <QuestionCard
              refText={currentQuestion.refText ?? ''}
              speechRate={ttsSpeechRate}
              onSpeechRateChange={setTtsSpeechRate}
              silenceTimeoutMs={silenceTimeoutMs}
              onSilenceTimeoutChange={setSilenceTimeoutMs}
              onTtsError={setSdkError}
              imageUrl={currentQuestion.imageUrl}
            />

            {!sdkReady && !sdkError && (
              <p className='text-sm text-muted-foreground'>SDK 加载中...</p>
            )}
            {sdkError && <p className='text-sm text-destructive'>{sdkError}</p>}

            <RecordButton
              status={recordingStatus}
              loading={loading}
              onStart={handleStartRecord}
              onStop={stopEval}
              disabled={!sdkReady}
            />

            {result != null ? <ScoreCard result={result} /> : null}

            <div className='flex justify-between gap-2 pt-4'>
              <Button
                variant='outline'
                disabled={currentQuestionIndex <= 0}
                onClick={() => {
                  setQuestionIndex(currentQuestionIndex - 1);
                  setResult(null);
                  setSdkError(null);
                }}>
                上一题
              </Button>
              <Button
                variant='outline'
                disabled={currentQuestionIndex >= questions.length - 1}
                onClick={() => {
                  setQuestionIndex(currentQuestionIndex + 1);
                  setResult(null);
                  setSdkError(null);
                }}>
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
