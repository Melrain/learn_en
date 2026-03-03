'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { stripJsonFromMessage } from '@/lib/utils';
import { useChatStore } from '@/stores/chat-store';
import { useAgentStream } from '@/hooks/use-agent-stream';
import type { IQuestionSetPopulated } from '@/types';

const EXAMPLE_PROMPTS = [
  '最近练习情况',
  '生成 5 道句子题',
  '我的低分题目有哪些',
  '列出所有题目',
];

export default function ChatPage() {
  const router = useRouter();
  const { messages, loading, reset, appendToLastMessage } = useChatStore();
  const { sendToAgent, generatedSetId, setGeneratedSetId } = useAgentStream();
  const [input, setInput] = useState('');
  const [generateImages, setGenerateImages] = useState(false);
  const [imageGenProgress, setImageGenProgress] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (messages.length === 0) setGeneratedSetId(null);
  }, [messages.length, setGeneratedSetId]);

  useEffect(() => {
    if (!generatedSetId || !generateImages) return;
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
            else console.error('[chat] generate-image failed:', ids[i], imgRes.status);
          } catch (e) {
            console.error('[chat] generate-image error:', ids[i], e);
          }
        }
        if (!cancelled && successCount < total && successCount > 0) {
          appendToLastMessage(`\n\n部分图片生成失败（${successCount}/${total} 张成功）`);
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
  }, [generatedSetId, generateImages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    sendToAgent(text);
  };

  return (
    <div className='container mx-auto flex max-w-2xl flex-col px-4 py-4 sm:px-6 sm:py-6'>
      <div className='mb-4 flex flex-wrap items-center justify-between gap-2'>
        <h1 className='text-2xl font-bold'>AI 助手</h1>
        <div className='flex gap-1 sm:gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={reset}>
            清空对话
          </Button>
          <Button
            asChild
            variant='outline'
            size='sm'>
            <Link href='/'>返回首页</Link>
          </Button>
        </div>
      </div>
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
                    ? 'ml-auto max-w-[85%] rounded-lg bg-primary px-4 py-2 text-primary-foreground'
                    : 'mr-auto max-w-[85%] rounded-lg border bg-background px-4 py-2'
                }>
                <p className='whitespace-pre-wrap text-sm'>
                  {m.role === 'assistant'
                    ? (stripJsonFromMessage(m.content) || (loading ? '思考中...' : ''))
                    : m.content}
                </p>
              </div>
            </div>
          ))}
          {generatedSetId && (
            <div className='mr-auto flex flex-wrap items-center gap-2'>
              {imageGenProgress && (
                <span className='text-sm text-muted-foreground'>
                  {imageGenProgress}
                </span>
              )}
              <Button
                size='sm'
                onClick={() => router.push(`/practice?setId=${generatedSetId}`)}
                disabled={!!imageGenProgress}>
                开始练习
              </Button>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <form
          onSubmit={handleSubmit}
          className='border-t p-4'>
          <div className='mb-2 flex items-center gap-2'>
            <input
              type='checkbox'
              id='generate-images'
              checked={generateImages}
              onChange={(e) => setGenerateImages(e.target.checked)}
              className='h-4 w-4 rounded border'
            />
            <label
              htmlFor='generate-images'
              className='text-sm text-muted-foreground'>
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
    </div>
  );
}
