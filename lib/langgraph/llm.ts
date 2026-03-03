import { ChatDeepSeek } from "@langchain/deepseek";

export const llm = new ChatDeepSeek({
  model: "deepseek-chat",
  temperature: 0.3,
  apiKey: process.env.DEEPSEEK_API_KEY,
});
