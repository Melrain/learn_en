# Learn EN 项目介绍

## 1. 项目概述

**Learn EN** 是一款基于阿里云智能科教内容生成平台的口语评测 Web 应用，致力于为学生提供高效、精准、个性化的英文口语评测服务。

- **目标**：帮助用户提升英文发音准确性与流利度，通过即时反馈有针对性地改进发音和表达方式。
- **对接关系**：项目接入阿里云中英文语音多维度智能评测能力，支持英文单词、句子、段落等题型的智能评测。

## 2. 功能特性

### 支持的题型（基于阿里云能力）

| 题型     | coreType       | 最长时长 | 说明                               |
| -------- | -------------- | -------- | ---------------------------------- |
| 英文单词 | en.word.score  | 20 秒    | 支持音素级实时评价                 |
| 英文句子 | en.sent.score  | 40 秒    | 精确到单词的准确度、完整度、流畅度 |
| 英文段落 | en.pred.score  | 300 秒   | 篇章跟读评测                       |

### 评测维度（参考阿里云）

- **准确度**：单词发音准确度
- **完整度**：是否完整读出
- **流畅度**：表达流畅程度
- **漏读 / 重复**：检测单词漏读、是否重复读
- **语速检测**：语速合理性
- **停顿检测**：停顿位置与时长
- **音频质量**：录音质量评估

### 当前实现

- **题目与集合管理**：通过管理后台管理口语测评题目及题目集合
- **练习流程**：选择题目集合 → 录音 → 提交评测
- **状态管理**：录音状态、任务 ID、评测结果展示（practice-store）

## 3. 技术架构

### 技术栈

- **框架**：Next.js 16、React 19
- **数据库**：MongoDB + Mongoose
- **UI**：Tailwind CSS、shadcn/ui、Radix UI
- **状态管理**：Zustand
- **验证**：Zod

### 架构图

```mermaid
flowchart TB
    subgraph frontend [前端]
        Home[首页]
        Practice[练习页]
        Admin[管理后台]
    end

    subgraph api [API]
        QuestionsAPI["/api/questions"]
        SetsAPI["/api/sets"]
    end

    subgraph data [数据层]
        Question[Question Model]
        QuestionSet[QuestionSet Model]
    end

    subgraph external [外部服务]
        Aliyun[阿里云语音评测]
    end

    Home --> Practice
    Practice --> QuestionsAPI
    Practice --> SetsAPI
    Practice -.录音评测.-> Aliyun
    QuestionsAPI --> Question
    SetsAPI --> QuestionSet
    Admin --> QuestionsAPI
    Admin --> SetsAPI
```

### 数据模型

#### Question

- `refText`：参考文本（必填）
- `type`：题型标识（如 en-word、en-sentence、en-paragraph）
- `coreType`：阿里云 coreType 映射
- `difficulty`：难度
- `sortOrder`：排序

#### QuestionSet

- `name`：集合名称
- `description`：描述
- `questionIds`：题目 ID 列表
- `sortOrder`：排序

### API

| 接口           | 方法 | 说明             |
| -------------- | ---- | ---------------- |
| /api/questions | GET  | 获取题目列表     |
| /api/questions | POST | 创建题目         |
| /api/sets      | GET  | 获取题目集合列表 |
| /api/sets      | POST | 创建题目集合     |

### 部署

- 本地开发使用 Docker Compose 启动 MongoDB
- 生产环境需配置 `MONGODB_URI` 环境变量

## 4. 项目目录结构

| 目录           | 职责                         |
|----------------|------------------------------|
| `app/`         | 页面与路由（App Router）     |
| `app/(main)/`  | 主业务页面（如练习页）       |
| `app/admin/`   | 管理后台                     |
| `app/api/`     | API 路由                     |
| `models/`      | MongoDB 数据模型             |
| `lib/`         | 数据库连接、常量、工具函数   |
| `stores/`      | Zustand 状态管理             |
| `components/`  | UI 组件                      |
| `types/`       | TypeScript 类型定义          |
| `public/`      | 静态资源                     |

## 5. 快速开始

### 环境要求

- Node.js 18+
- MongoDB（或 Docker）

### 本地启动

1. 启动 MongoDB（可选，使用 Docker）：

   ```bash
   docker-compose up -d
   ```

1. 配置环境变量：在项目根目录创建 `.env.local`，配置：

   ```env
   MONGODB_URI=mongodb://admin:learn_en_dev@localhost:27017/learn_en?authSource=admin
   ```

1. 安装依赖并启动开发服务器：

   ```bash
   npm install
   npm run dev
   ```

1. 访问 [http://localhost:3000](http://localhost:3000)

### 常用命令

| 命令            | 说明           |
| --------------- | -------------- |
| `npm run dev`   | 启动开发服务器 |
| `npm run build` | 构建生产版本   |
| `npm run start` | 启动生产服务   |
| `npm run lint`  | 运行 ESLint    |

## 6. 参考资料

- [阿里云 - 中英文语音多维度智能评测](https://help.aliyun.com/zh/document_detail/2846431.html)
