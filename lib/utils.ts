import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 移除消息中的 JSON 块，只保留人类可读文本 */
export function stripJsonFromMessage(content: string): string {
  if (!content?.trim()) return content ?? "";

  let result = content;
  let start: number;

  while ((start = result.indexOf("{")) !== -1) {
    let depth = 0;
    let end = -1;
    for (let i = start; i < result.length; i++) {
      if (result[i] === "{") depth++;
      if (result[i] === "}") depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
    if (end === -1) break;
    const before = result.slice(0, start).replace(/\s+$/, "");
    const after = result.slice(end + 1).replace(/^\s+/, "");
    result = (before + (before && after ? " " : "") + after).trim();
  }

  return result;
}
