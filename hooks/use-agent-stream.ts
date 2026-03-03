"use client";

import { useCallback, useState } from "react";
import { useChatStore } from "@/stores/chat-store";

interface AgentSSEEvent {
  type?: string;
  content?: string;
  message?: string;
  generatedSetId?: string;
}

export function useAgentStream() {
  const { messages, addMessage, appendToLastMessage, setLoading } = useChatStore();
  const [generatedSetId, setGeneratedSetId] = useState<string | null>(null);

  const sendToAgent = useCallback(
    async (userMessage: string) => {
      if (!userMessage.trim()) return;
      addMessage({ role: "user", content: userMessage });
      setLoading(true);
      setGeneratedSetId(null);
      addMessage({ role: "assistant", content: "" });
      try {
        const res = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...messages, { role: "user", content: userMessage }],
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error ?? "请求失败");
        }
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        if (reader) {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                try {
                  const data = JSON.parse(line.slice(6)) as AgentSSEEvent;
                  if (data.type === "token" && typeof data.content === "string") {
                    appendToLastMessage(data.content);
                  } else if (data.type === "metadata" && data.generatedSetId) {
                    setGeneratedSetId(data.generatedSetId);
                  } else if (data.type === "error") {
                    appendToLastMessage(`\n\n错误：${data.message ?? "未知错误"}`);
                  }
                } catch {
                  // ignore parse errors
                }
              }
            }
          }
        }
      } catch (e) {
        appendToLastMessage(`错误：${e instanceof Error ? e.message : "未知错误"}`);
      } finally {
        setLoading(false);
      }
    },
    [messages, addMessage, appendToLastMessage, setLoading],
  );

  return { sendToAgent, generatedSetId, setGeneratedSetId };
}
