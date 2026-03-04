'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { stripJsonFromMessage } from '@/lib/utils';
import { useChatStore } from '@/stores/chat-store';
import { useAgentStream } from '@/hooks/use-agent-stream';
import { THEMES, type ThemeId } from '@/lib/themes';
import type { IQuestionSetPopulated } from '@/types';

const EXAMPLE_PROMPTS = [
  '最近练习情况',
  '生成 5 道句子题',
  '我的低分题目有哪些',
  '列出所有题目',
];

const COUNT_OPTIONS = [5, 10, 15] as const;

const CONTENT_TYPE_OPTIONS = [
  { id: 'word' as const, label: '单词' },
  { id: 'phrase' as const, label: '短语' },
  { id: 'sentence' as const, label: '句子' },
];

type ContentType = (typeof CONTENT_TYPE_OPTIONS)[number]['id'];
type Mode = 'theme' | 'chat';

export default function ChatPage() {
  const router = useRouter();
  const { messages, loading, reset, appendToLastMessage } = useChatStore();
  const { sendToAgent, generatedSetId, setGeneratedSetId, cancelRequest } =
    useAgentStream();
  const [mode, setMode] = useState<Mode>('theme');
  const [input, setInput] = useState('');
  const [generateImages, setGenerateImages] = useState(false);
  const [imageGenProgress, setImageGenProgress] = useState<string | null>(null);

  // 主题模式状态
  const [selectedTheme, setSelectedTheme] = useState<ThemeId | null>(null);
  const [contentType, setContentType] = useState<ContentType>('word');
  const [themeCount, setThemeCount] = useState<number>(5);
  const [themeGenerating, setThemeGenerating] = useState(false);
  const [themeGeneratedSetId, setThemeGeneratedSetId] = useState<string | null>(
    null,
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const themeGenerateAbortRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (messages.length === 0) setGeneratedSetId(null);
  }, [messages.length, setGeneratedSetId]);

  // 聊天模式：生成题目后可选生成图片
  useEffect(() => {
    if (!generatedSetId || !generateImages || mode !== 'chat') return;
    let cancelled = false;
    (async () => {
      setImageGenProgress('正在获取题目...');
      try {
        const setsRes = await fetch('/api/sets');
        if (!setsRes.ok || cancelled) return;
        const sets = (await setsRes.json()) as IQuestionSetPopulated[];
        const set = sets.find((s) => String(s._id) === generatedSetId);
        if (!set?.questionIds?.length || cancelled) {
          setImageGenProgress(null);
          return;
        }
        const ids = set.questionIds.map((q) => String(q._id));
        const total = ids.length;
        let successCount = 0;
        for (let i = 0; i < ids.length && !cancelled; i++) {
          setImageGenProgress(`正在生成图片 ${i + 1}/${total}...`);
          try {
            const imgRes = await fetch('/api/generate-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ questionId: ids[i] }),
            });
            if (imgRes.ok) successCount += 1;
            else
              console.error('[chat] generate-image failed:', ids[i], imgRes.status);
          } catch (e) {
            console.error('[chat] generate-image error:', ids[i], e);
          }
        }
        if (!cancelled && successCount < total && successCount > 0) {
          appendToLastMessage(
            `\n\n部分图片生成失败（${successCount}/${total} 张成功）`,
          );
        } else if (!cancelled && successCount === 0) {
          appendToLastMessage('\n\n图片生成全部失败');
        }
      } catch {
        setImageGenProgress('图片生成失败');
      } finally {
        if (!cancelled) setImageGenProgress(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [generatedSetId, generateImages, mode, appendToLastMessage]);

  const handleModeChange = (newMode: Mode) => {
    if (newMode === mode) return;
    setMode(newMode);
    cancelRequest();
    themeGenerateAbortRef.current?.abort();
    reset();
    setGeneratedSetId(null);
    setThemeGeneratedSetId(null);
  };

  const handleThemeGenerate = async () => {
    if (!selectedTheme || themeGenerating) return;
    setThemeGenerating(true);
    setThemeGeneratedSetId(null);
    themeGenerateAbortRef.current?.abort();
    themeGenerateAbortRef.current = new AbortController();
    const signal = themeGenerateAbortRef.current.signal;
    try {
      const res = await fetch('/api/generate-by-theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: selectedTheme,
          count: themeCount,
          generateImages,
          contentType,
        }),
        signal,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? '生成失败');
      }
      const data = (await res.json()) as { setId: string };
      setThemeGeneratedSetId(data.setId);
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return;
      console.error('[chat] theme generate error:', e);
      alert(e instanceof Error ? e.message : '生成失败');
    } finally {
      setThemeGenerating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    sendToAgent(text);
  };

  const activeSetId = mode === 'theme' ? themeGeneratedSetId : generatedSetId;
  const canStartPractice = !!activeSetId;
  const isPracticeLoading =
    (mode === 'chat' && !!imageGenProgress) || themeGenerating;

  return (
    <div className='container mx-auto flex max-w-2xl flex-col px-4 py-4 sm:px-6 sm:py-6'>
      <div className='mb-4 flex flex-wrap items-center justify-between gap-2'>
        <h1 className='text-2xl font-bold'>AI 助手</h1>
        <div className='flex gap-1 sm:gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => {
              cancelRequest();
              themeGenerateAbortRef.current?.abort();
              reset();
              setGeneratedSetId(null);
              setThemeGeneratedSetId(null);
            }}>
            清空对话
          </Button>
          <Button asChild variant='outline' size='sm'>
            <Link href='/'>返回首页</Link>
          </Button>
        </div>
      </div>

      {/* Toggle: 主题生成 | 自定义聊天 */}
      <div className='mb-4 flex min-w-0 gap-1 rounded-lg border bg-muted/30 p-1'>
        <button
          type='button'
          onClick={() => handleModeChange('theme')}
          className={`min-w-0 flex-1 truncate rounded-md px-3 py-2 text-xs font-medium transition-colors sm:px-4 sm:text-sm ${
            mode === 'theme'
              ? 'bg-background shadow text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}>
          主题生成
        </button>
        <button
          type='button'
          onClick={() => handleModeChange('chat')}
          className={`min-w-0 flex-1 truncate rounded-md px-3 py-2 text-xs font-medium transition-colors sm:px-4 sm:text-sm ${
            mode === 'chat'
              ? 'bg-background shadow text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}>
          自定义聊天
        </button>
      </div>

      {mode === 'theme' ? (
        /* 主题模式 */
        <div className='flex min-h-[300px] flex-col rounded-lg border bg-muted/20 sm:min-h-[400px]'>
          <div className='flex flex-1 flex-col gap-4 overflow-y-auto p-4 min-h-0'>
            <p className='text-sm text-muted-foreground'>
              选择主题，一键生成适合小朋友的英语{CONTENT_TYPE_OPTIONS.find((c) => c.id === contentType)?.label ?? '单词'}题
            </p>
            <div>
              <p className='mb-2 text-sm font-medium'>选择主题</p>
              <div className='grid min-w-0 grid-cols-3 gap-2 sm:grid-cols-4'>
                {THEMES.map((t) => (
                  <Button
                    key={t.id}
                    type='button'
                    variant={selectedTheme === t.id ? 'default' : 'outline'}
                    size='sm'
                    onClick={() => setSelectedTheme(t.id)}
                    className='min-w-0 truncate text-xs'>
                    {t.label}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <p className='mb-2 text-sm font-medium'>题型</p>
              <div className='flex min-w-0 gap-2'>
                {CONTENT_TYPE_OPTIONS.map((c) => (
                  <Button
                    key={c.id}
                    type='button'
                    variant={contentType === c.id ? 'default' : 'outline'}
                    size='sm'
                    onClick={() => setContentType(c.id)}
                    className='min-w-0 shrink-0'>
                    {c.label}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <p className='mb-2 text-sm font-medium'>题目数量</p>
              <div className='flex gap-2'>
                {COUNT_OPTIONS.map((n) => (
                  <Button
                    key={n}
                    type='button'
                    variant={themeCount === n ? 'default' : 'outline'}
                    size='sm'
                    onClick={() => setThemeCount(n)}>
                    {n} 个
                  </Button>
                ))}
              </div>
            </div>
            <div className='flex min-w-0 flex-wrap items-center gap-2'>
              <input
                type='checkbox'
                id='theme-generate-images'
                checked={generateImages}
                onChange={(e) => setGenerateImages(e.target.checked)}
                className='h-4 w-4 shrink-0 rounded border'
              />
              <label
                htmlFor='theme-generate-images'
                className='min-w-0 flex-1 text-sm text-muted-foreground'>
                生成题目时同时生成图片
              </label>
            </div>
            <div className='flex flex-wrap items-center gap-2'>
              <Button
                onClick={handleThemeGenerate}
                disabled={!selectedTheme || themeGenerating}>
                {themeGenerating ? '生成中...' : '生成'}
              </Button>
              {canStartPractice && (
                <Button
                  size='sm'
                  onClick={() =>
                    router.push(`/practice?setId=${activeSetId}`)
                  }
                  disabled={isPracticeLoading}>
                  开始练习
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* 聊天模式 */
        <>
          <p className='mb-4 text-sm text-muted-foreground'>
            可以问：练习情况、低分题目、生成练习题等
          </p>
          <div className='flex min-h-[300px] flex-col overflow-hidden rounded-lg border bg-muted/20 sm:min-h-[400px]'>
            <div className='flex flex-1 flex-col gap-4 overflow-y-auto p-4 min-h-0'>
              {messages.length === 0 && (
                <div className='space-y-3'>
                  <p className='text-center text-sm text-muted-foreground'>
                    点击下方示例开始对话：
                  </p>
                  <div className='flex flex-wrap gap-2 justify-center'>
                    {EXAMPLE_PROMPTS.map((prompt) => (
                      <Button
                        key={prompt}
                        variant='outline'
                        size='sm'
                        onClick={() => sendToAgent(prompt)}
                        className='text-xs'>
                        {prompt}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m) => (
                <div key={m.id} className='space-y-1'>
                  <div
                    className={
                      m.role === 'user'
                        ? 'ml-auto min-w-0 max-w-[85%] rounded-lg bg-primary px-3 py-2 text-primary-foreground sm:px-4'
                        : 'mr-auto min-w-0 max-w-[85%] rounded-lg border bg-background px-3 py-2 sm:px-4'
                    }>
                    <p className='min-w-0 whitespace-pre-wrap text-sm wrap-break-word'>
                      {m.role === 'assistant'
                        ? stripJsonFromMessage(m.content) ||
                          (loading ? '思考中...' : '')
                        : m.content}
                    </p>
                  </div>
                </div>
              ))}
              {canStartPractice && (
                <div className='mr-auto flex flex-wrap items-center gap-2'>
                  {imageGenProgress && (
                    <span className='text-sm text-muted-foreground'>
                      {imageGenProgress}
                    </span>
                  )}
                  <Button
                    size='sm'
                    onClick={() =>
                      router.push(`/practice?setId=${activeSetId}`)
                    }
                    disabled={!!imageGenProgress}>
                    开始练习
                  </Button>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSubmit} className='border-t p-4'>
              <div className='mb-2 flex min-w-0 flex-wrap items-center gap-2'>
                <input
                  type='checkbox'
                  id='generate-images'
                  checked={generateImages}
                  onChange={(e) => setGenerateImages(e.target.checked)}
                  className='h-4 w-4 shrink-0 rounded border'
                />
                <label
                  htmlFor='generate-images'
                  className='min-w-0 flex-1 text-sm text-muted-foreground'>
                  生成题目时同时生成图片
                </label>
              </div>
              <div className='flex gap-2'>
                <input
                  type='text'
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder='输入消息...'
                  className='min-w-0 flex-1 rounded-md border bg-background px-3 py-2 text-base'
                  disabled={loading}
                />
                <Button
                  type='submit'
                  disabled={loading || !input.trim()}
                  className='shrink-0'>
                  发送
                </Button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
