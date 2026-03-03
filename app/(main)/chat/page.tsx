'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useChatStore } from '@/stores/chat-store';

const EXAMPLE_PROMPTS = [
  '最近练习情况',
  '生成 5 道句子题',
  '我的低分题目有哪些',
  '列出所有题目',
];

export default function ChatPage() {
  const router = useRouter();
  const { messages, loading, addMessage, appendToLastMessage, setLoading, reset } = useChatStore();
  const [input, setInput] = useState('');
  const [generatedSetId, setGeneratedSetId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (messages.length === 0) setGeneratedSetId(null);
  }, [messages.length]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    setInput('');
    addMessage({ role: 'user', content: text });
    setLoading(true);
    setGeneratedSetId(null);
    addMessage({ role: 'assistant', content: '' });
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: text }],
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? '请求失败');
      }
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      if (reader) {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6)) as {
                  type?: string;
                  content?: string;
                  message?: string;
                  generatedSetId?: string;
                };
                if (data.type === 'token' && typeof data.content === 'string') {
                  appendToLastMessage(data.content);
                } else if (data.type === 'metadata' && data.generatedSetId) {
                  setGeneratedSetId(data.generatedSetId);
                } else if (data.type === 'error') {
                  appendToLastMessage(`\n\n错误：${data.message ?? '未知错误'}`);
                }
              } catch {
                // ignore parse errors
              }
            }
          }
        }
      }
    } catch (e) {
      appendToLastMessage(`错误：${e instanceof Error ? e.message : '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input.trim());
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
                    onClick={() => sendMessage(prompt)}
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
                  {m.content || (m.role === "assistant" && loading ? "思考中..." : "")}
                </p>
              </div>
            </div>
          ))}
          {generatedSetId && (
            <div className='mr-auto'>
              <Button
                size='sm'
                onClick={() => router.push(`/practice?setId=${generatedSetId}`)}>
                开始练习
              </Button>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <form
          onSubmit={handleSubmit}
          className='border-t p-4'>
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
