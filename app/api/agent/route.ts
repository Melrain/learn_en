import { NextRequest, NextResponse } from "next/server";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import type { BaseMessageChunk } from "@langchain/core/messages";
import { agentGraph } from "@/lib/langgraph/graph";
import connectDB from "@/lib/db";

function toLangChainMessages(
  messages: Array<{ role: string; content: string }>
): (HumanMessage | AIMessage)[] {
  return messages.map((m) => {
    if (m.role === "assistant") {
      return new AIMessage({ content: m.content });
    }
    return new HumanMessage({ content: m.content });
  });
}

function extractContentFromChunk(chunk: BaseMessageChunk): string {
  const raw = chunk.content;
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) {
    return (raw as { type?: string; text?: string }[])
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("");
  }
  return "";
}

function tryParseGeneratedSetId(toolContent: unknown): string | null {
  if (typeof toolContent !== "string") return null;
  try {
    const parsed = JSON.parse(toolContent) as { setId?: string };
    return typeof parsed.setId === "string" ? parsed.setId : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  if (!process.env.DEEPSEEK_API_KEY) {
    return NextResponse.json(
      { error: "DEEPSEEK_API_KEY is not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { messages } = body as {
      messages?: Array<{ role: string; content: string }>;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "messages array is required and must not be empty" },
        { status: 400 }
      );
    }

    await connectDB();

    const langchainMessages = toLangChainMessages(messages);

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        let generatedSetId: string | null = null;

        const sendEvent = (data: object) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        };

        try {
          const graphStream = await agentGraph.stream(
            { messages: langchainMessages },
            { streamMode: ["messages", "tools"] }
          );

          for await (const chunk of graphStream) {
            if (Array.isArray(chunk)) {
              const [mode, data] = chunk;
              if (mode === "messages") {
                const [msgChunk, _meta] = data as [BaseMessageChunk, Record<string, unknown>];
                const text = extractContentFromChunk(msgChunk);
                if (text) {
                  sendEvent({ type: "token", content: text });
                }
              } else if (mode === "tools" && typeof data === "object" && data !== null) {
                const tool = data as { event?: string; name?: string; output?: unknown };
                if (tool.event === "on_tool_end" && tool.name === "generate_questions") {
                  const sid = tryParseGeneratedSetId(tool.output);
                  if (sid) generatedSetId = sid;
                }
              }
            }
          }

          if (generatedSetId) {
            sendEvent({ type: "metadata", generatedSetId });
          }
          sendEvent({ type: "done" });
        } catch (e) {
          console.error("[agent] error:", e);
          sendEvent({
            type: "error",
            message: e instanceof Error ? e.message : "Agent request failed",
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    console.error("[agent] error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Agent request failed" },
      { status: 500 }
    );
  }
}
