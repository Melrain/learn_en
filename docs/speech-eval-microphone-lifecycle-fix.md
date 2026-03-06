# 语音评测麦克风生命周期 Bug 修复心得

本文档记录练习页在切换到下一题后麦克风出现状态异常的问题，以及通过运行时日志验证根因、完成修复的过程与心得。

## 1. 问题现象

| 场景 | 表现 |
|------|------|
| 第一次录音 | 正常 |
| 切换到下一题后再录音 | ① 提示「麦克风已被收回，请重新点击」，但点击无效；② 或需「先说一次话激活」，第二次说话才被录取 |

## 2. 根因分析

### 2.1 直接原因

在 `engineBackResultDone` 和 `engineBackResultFail` 回调中，每次评测完成或失败时都会执行：

```javascript
initPromiseRef.current = null;
engineRef.current = null;
```

这会**销毁引擎实例**，强制下次录音时重新创建 `EngineEvaluat`。

### 2.2 后果

下次录音时，`ensureEngine()` 被迫创建全新的 `EngineEvaluat` 实例。新实例在内部调用 `startRecord` 时，会尝试使用 `createMediaStreamSource` 创建音频源；但此时旧的 MediaStream 已被释放或失效，传入的流参数不再有效，导致报错：

```
Failed to execute 'createMediaStreamSource' on 'AudioContext': parameter 1 is not of type 'MediaStream'.
```

### 2.3 生命周期对比

```mermaid
flowchart TB
    subgraph beforeFix [修复前]
        A1[第一次录音] --> A2[ensureEngine 创建引擎]
        A2 --> A3[startRecord 成功]
        A3 --> A4[engineBackResultDone]
        A4 --> A5[engineRef = null 销毁]
        A5 --> A6[第二次录音]
        A6 --> A7[ensureEngine 创建新引擎]
        A7 --> A8["startRecord 抛出 MediaStream 错误"]
    end

    subgraph afterFix [修复后]
        B1[第一次录音] --> B2[ensureEngine 创建引擎]
        B2 --> B3[startRecord 成功]
        B3 --> B4[engineBackResultDone]
        B4 --> B5[引擎保持存活]
        B5 --> B6[第二次录音]
        B6 --> B7[ensureEngine 返回缓存 promise]
        B7 --> B8[复用同一引擎 startRecord 成功]
    end
```

## 3. 调试验证

通过运行时日志确认了根因：

### 3.1 第一次录音（正常）

- `ensureEngine` 创建新引擎：`hasCachedPromise: false, hasEngine: false`
- `startRecord` 成功，VAD phase 正确从 `waitingForSpeech` 转为 `speaking`
- `engineBackResultDone` 触发，引擎被销毁（修复前）

### 3.2 第二次录音（失败）

- `ensureEngine` 被迫再次创建新引擎：`hasCachedPromise: false, hasEngine: false`
- `startRecord` 抛出错误：`Failed to execute 'createMediaStreamSource' on 'AudioContext': parameter 1 is not of type 'MediaStream'`
- 关键日志：`startRecord-catch` 中 `data.error` 为该错误信息

### 3.3 修复后验证

- 第二次及后续录音：`hasCachedPromise: true, hasEngine: true`，引擎被正确复用
- `startRecord` 不再抛出错误，连续多题录音均正常

## 4. 解决方法

### 4.1 核心修改

在 `engineBackResultDone` 和 `engineBackResultFail` 中**移除**以下两行：

```javascript
// 移除
initPromiseRef.current = null;
engineRef.current = null;
```

使引擎实例在评测完成后**保持存活**，供后续录音复用同一 AudioContext 与 MediaStream。

### 4.2 涉及文件

| 文件 | 修改说明 |
|------|----------|
| `hooks/use-speech-eval.ts` | 在 `engineBackResultDone` 与 `engineBackResultFail` 中移除引擎销毁逻辑 |

### 4.3 保留的销毁场景

以下场景仍会正常销毁引擎，避免资源泄漏或状态错乱：

| 场景 | 实现位置 |
|------|----------|
| 页面隐藏（visibilitychange） | `useEffect` 中 `document.visibilityState === 'hidden'` 时调用 `cancelRecord` 并置空 ref |
| 用户手动 reset | `resetEngine` 被调用时 |
| 取消录音 | `cancelEval` 被调用时 |

## 5. 相关文件

| 文件 | 说明 |
|------|------|
| `hooks/use-speech-eval.ts` | 引擎创建、复用及生命周期管理 |
| `app/(main)/practice/page.tsx` | 练习页，使用 `useSpeechEval` |

## 6. 注意事项

- 引擎复用后，同一会话内多次录音共用同一 AudioContext 和 MediaStream，避免了重建导致的 MediaStream 失效。
- 若用户切换标签页或页面被隐藏，`visibilitychange` 仍会调用 `cancelRecord` 并销毁引擎，下次返回页面时会重新创建。
- 与 [speech-eval-success-flow.md](./speech-eval-success-flow.md) 配合阅读，可了解完整语音评测流程。
- 汇总多平台避坑点见 [speech-eval-pitfalls-guide.md](./speech-eval-pitfalls-guide.md)。
