import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

const AUTH_URL = "https://api.cloud.ssapi.cn/auth/authorize";

function isValidIpv4(ip: string): boolean {
  if (!ip || typeof ip !== "string") return false;
  const parts = ip.trim().split(".");
  if (parts.length !== 4) return false;
  return parts.every(
    (n) => /^\d+$/.test(n) && parseInt(n, 10) >= 0 && parseInt(n, 10) <= 255,
  );
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "127.0.0.1";
  return request.headers.get("x-real-ip") ?? "127.0.0.1";
}

function buildRequestSign(
  appid: string,
  appSecret: string,
  timestamp: string,
  userId: string,
  userClientIp: string,
): string {
  const params: Record<string, string> = {
    appid,
    app_secret: appSecret,
    timestamp,
    user_id: userId,
    user_client_ip: userClientIp,
  };
  const signStr = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("md5").update(signStr).digest("hex");
}

/**
 * 服务端鉴权：直接调用阿里云 auth/authorize 获取 warrantId。
 * warrantId 有效期 7200 秒（2 小时），前端可缓存复用。
 */
export async function POST(request: NextRequest) {
  const appId = process.env.NEXT_PUBLIC_ALIYUN_APP_ID;
  const appSecret = process.env.ALIYUN_APP_SECRET;
  const userId = process.env.NEXT_PUBLIC_ALIYUN_USER_ID;

  if (!appId || !appSecret || !userId) {
    return NextResponse.json(
      {
        error:
          "Missing env: NEXT_PUBLIC_ALIYUN_APP_ID, ALIYUN_APP_SECRET, NEXT_PUBLIC_ALIYUN_USER_ID",
      },
      { status: 500 },
    );
  }

  let userClientIp = getClientIp(request);
  try {
    const body = (await request.json().catch(() => ({}))) as {
      clientIp?: string;
    };
    const clientIpFromBody = body?.clientIp?.trim();
    if (clientIpFromBody && isValidIpv4(clientIpFromBody)) {
      userClientIp = clientIpFromBody;
    }
  } catch {
    // ignore parse error, use header/fallback
  }
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const requestSign = buildRequestSign(
    appId,
    appSecret,
    timestamp,
    userId,
    userClientIp,
  );

  const formBody = new URLSearchParams({
    appid: appId,
    timestamp,
    user_id: userId,
    user_client_ip: userClientIp,
    request_sign: requestSign,
    warrant_available: "7200",
  });

  try {
    const res = await fetch(AUTH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formBody.toString(),
    });

    const data = (await res.json()) as {
      code?: number;
      data?: { warrant_id?: string };
    };

    if (data?.code !== 0 || !data?.data?.warrant_id) {
      console.error("[warrant] Aliyun error:", data);
      return NextResponse.json(
        { error: "Failed to get warrant" },
        { status: 502 },
      );
    }

    return NextResponse.json({ warrantId: data.data.warrant_id });
  } catch (e) {
    console.error("[warrant] error:", e);
    return NextResponse.json(
      { error: "Warrant request failed" },
      { status: 500 },
    );
  }
}
