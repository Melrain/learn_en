# Learn EN 开发计划

本文档记录 Learn EN 英语口语练习项目的功能规划与开发优先级。

---

## 一、当前已实现

- Next.js 16 + MongoDB + 阿里云语音评测
- 练习流程：选题集 → 录音 → 评测 → 展示评分
- 练习记录持久化（PracticeRecord）
- LangGraph + DeepSeek AI Agent
- AI 能力：查询练习历史、统计、列出题目、生成练习题
- 聊天界面 `/chat`

---

## 二、待开发功能

### 2.1 体验增强（高优先级）

| 功能 | 描述 | 实现要点 |
|------|------|----------|
| **流式输出** | AI 回复逐字/逐句显示 | `/api/agent` 使用 `graph.stream()` + SSE，前端用 `EventSource` 或 `fetch` 流式解析 |
| **生成题目后一键练习** | AI 生成题集后直接进入练习 | 生成流程返回题集 ID，前端跳转 `/practice` 并自动选中该题集，或提供「开始练习」按钮 |
| **快捷示例提示** | 聊天页预设示例问题 | 展示「最近练习情况」「生成 5 道句子题」等，点击即发送 |

### 2.2 功能补齐（中优先级）

| 功能 | 描述 | 实现要点 |
|------|------|----------|
| **题目管理 CRUD** | `/admin/questions` 增删改查 | 对接 `/api/questions`、`/api/sets`，实现题目与题集管理界面 |
| **练习历史页面** | 用户可查看自己的练习记录 | 新建 `/practice/history`，查询 `PracticeRecord`，展示列表与简单统计 |

### 2.3 稳定性与可靠性（中优先级）

| 功能 | 描述 | 实现要点 |
|------|------|----------|
| **对话持久化** | 聊天记录不随刷新丢失 | 使用 `localStorage` 或后端存储，页面加载时恢复 |
| **错误与限流提示** | 区分网络、超时、限流等错误 | Agent API 捕获异常，返回更明确的错误类型与提示文案 |

### 2.4 技术优化（低优先级）

| 功能 | 描述 | 实现要点 |
|------|------|----------|
| **LangSmith / Tracing** | 观测 Agent 调用链路 | 配置 `LANGSMITH_TRACING`、`LANGCHAIN_API_KEY` |
| **多用户与鉴权** | 支持多用户使用 | 引入 NextAuth/Clerk，`PracticeRecord` 等增加 `userId` 字段 |

---

## 三、推荐实施顺序

1. **流式输出**（体验提升明显）
2. **生成题目后一键练习**（打通核心闭环）
3. **快捷示例提示**（实现简单、见效快）
4. **题目管理 CRUD**（补全后台能力）
5. **练习历史页面**（增强数据可视化）
6. **对话持久化**（适合长期使用场景）
7. **错误与限流提示**（提升稳定性）
8. **多用户与鉴权**（面向正式上线）

---

## 四、技术参考

- 流式输出：[LangGraph streaming](https://langchain-ai.github.io/langgraphjs/how-tos/streaming/)
- Next.js Stream：`ReadableStream` + `TextEncoder`
- 前端流式解析：`fetch` + `getReader()` 或 `EventSource`

---

*最后更新：按项目进展维护*
