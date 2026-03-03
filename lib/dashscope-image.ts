/**
 * DashScope / Qwen-Image 文生图 API 封装
 * 文档：https://help.aliyun.com/zh/model-studio/qwen-image-api
 */

const DASHSCOPE_BASE = "https://dashscope.aliyuncs.com/api/v1";
const DEFAULT_MODEL = "qwen-image-2.0";

export interface GenerateImageOptions {
  prompt: string;
  model?: string;
  size?: string;
  negativePrompt?: string;
  promptExtend?: boolean;
}

export interface GenerateImageResult {
  imageUrl: string;
}

export async function generateImage(
  options: GenerateImageOptions
): Promise<GenerateImageResult> {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    throw new Error("DASHSCOPE_API_KEY is not configured");
  }

  const {
    prompt,
    model = DEFAULT_MODEL,
    size = "1024*1024",
    negativePrompt = "低分辨率，低画质，肢体畸形，手指畸形，画面过饱和，蜡像感，人脸无细节，过度光滑，画面具有AI感。构图混乱。文字模糊，扭曲。",
    promptExtend = true,
  } = options;

  const res = await fetch(`${DASHSCOPE_BASE}/services/aigc/multimodal-generation/generation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: {
        messages: [
          {
            role: "user",
            content: [{ text: prompt }],
          },
        ],
      },
      parameters: {
        negative_prompt: negativePrompt,
        prompt_extend: promptExtend,
        watermark: false,
        size,
      },
    }),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as {
      code?: string;
      message?: string;
    };
    throw new Error(
      err.message ?? `DashScope API error: ${res.status} ${res.statusText}`
    );
  }

  const data = (await res.json()) as {
    output?: {
      choices?: Array<{
        message?: {
          content?: Array<{ image?: string }>;
        };
      }>;
    };
    code?: string;
    message?: string;
  };

  if (data.code) {
    throw new Error(data.message ?? `DashScope error: ${data.code}`);
  }

  const imageUrl =
    data.output?.choices?.[0]?.message?.content?.[0]?.image;
  if (!imageUrl) {
    throw new Error("No image URL in DashScope response");
  }

  return { imageUrl };
}
