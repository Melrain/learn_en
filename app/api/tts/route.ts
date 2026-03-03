import { NextRequest, NextResponse } from "next/server";
import RPCClient from "@alicloud/pop-core";

const TTS_URL = "https://nls-gateway-cn-shanghai.aliyuncs.com/stream/v1/tts";

interface TokenCache {
  token: string;
  expireTime: number;
}

let tokenCache: TokenCache | null = null;

async function getToken(): Promise<string> {
  const keyId = process.env.ALIYUN_ACCESS_KEY_ID;
  const keySecret = process.env.ALIYUN_ACCESS_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error("Missing ALIYUN_ACCESS_KEY_ID or ALIYUN_ACCESS_KEY_SECRET");
  }
  const now = Math.floor(Date.now() / 1000);
  if (tokenCache && tokenCache.expireTime > now + 300) {
    return tokenCache.token;
  }
  const client = new RPCClient({
    endpoint: "https://nls-meta.cn-shanghai.aliyuncs.com",
    apiVersion: "2019-02-28",
    accessKeyId: keyId,
    accessKeySecret: keySecret,
  });
  const result = (await client.request("CreateToken", {})) as {
    Token?: { Id?: string; ExpireTime?: number };
  };
  const tokenId = result?.Token?.Id;
  const expireTime = result?.Token?.ExpireTime;
  if (!tokenId || !expireTime) {
    throw new Error("Failed to get TTS token");
  }
  tokenCache = { token: tokenId, expireTime };
  return tokenId;
}

export async function POST(request: NextRequest) {
  const appKey = process.env.ALIYUN_TTS_APPKEY;
  if (!appKey) {
    return NextResponse.json(
      { error: "Missing ALIYUN_TTS_APPKEY" },
      { status: 500 },
    );
  }
  let body: { text?: string; voice?: string; speech_rate?: number };
  try {
    body = (await request.json()) as {
      text?: string;
      voice?: string;
      speech_rate?: number;
    };
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json(
      { error: "Missing or empty text" },
      { status: 400 },
    );
  }
  if (text.length > 300) {
    return NextResponse.json(
      { error: "Text exceeds 300 characters" },
      { status: 400 },
    );
  }
  const voice =
    typeof body.voice === "string" && body.voice.trim()
      ? body.voice.trim()
      : "cally";
  const speechRateRaw = body.speech_rate;
  const speech_rate =
    typeof speechRateRaw === "number" &&
    speechRateRaw >= -500 &&
    speechRateRaw <= 500
      ? Math.round(speechRateRaw)
      : undefined;
  let token: string;
  try {
    token = await getToken();
  } catch (e) {
    console.error("[tts] token error:", e);
    return NextResponse.json(
      { error: "Failed to get TTS token" },
      { status: 502 },
    );
  }
  const ttsBody: Record<string, unknown> = {
    appkey: appKey,
    token,
    text,
    voice,
    format: "mp3",
    sample_rate: 16000,
  };
  if (speech_rate !== undefined) ttsBody.speech_rate = speech_rate;
  try {
    const res = await fetch(TTS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ttsBody),
    });
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("audio/mpeg") || contentType.includes("audio/mp3")) {
      const arrayBuffer = await res.arrayBuffer();
      return new NextResponse(arrayBuffer, {
        headers: {
          "Content-Type": "audio/mpeg",
        },
      });
    }
    const errText = await res.text();
    console.error("[tts] Aliyun error:", res.status, errText);
    return NextResponse.json(
      { error: "TTS synthesis failed", detail: errText },
      { status: 502 },
    );
  } catch (e) {
    console.error("[tts] fetch error:", e);
    return NextResponse.json(
      { error: "TTS request failed" },
      { status: 500 },
    );
  }
}
