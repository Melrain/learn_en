import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { llm } from "./llm";
import { tools } from "./tools";

const SYSTEM_PROMPT = `你是英语口语练习应用的 AI 助手。你可以：
1. 查看用户的练习历史与评分
2. 分析哪些题目得分低，给出改进建议
3. 根据用户需求生成新的练习题（单词、句子或段落）
4. 列出现有题目和题集

重要规则：
- 使用工具时，请用简洁的中文向用户说明结果，不要直接输出工具的原始 JSON 或数据结构。
- 例如：生成题目后，只说「已为你生成 N 道题，可以开始练习了」，不要展示题目列表的 JSON；查询练习历史后，用自然语言总结，不要粘贴原始数据。
- 生成题目时，确保 refText 为地道英文，type 为 en-word、en-sentence 或 en-paragraph 之一。
`;

export const agentGraph = createReactAgent({
  llm,
  tools,
  prompt: SYSTEM_PROMPT,
});
