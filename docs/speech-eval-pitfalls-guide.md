# 语音评测避坑指南

本文档汇总阿里云语音评测在 Web/PWA 上的常见坑点与当前稳定方案，供后续开发参考。涉及 PC、Android、iOS 多平台，需兼顾引擎生命周期、AudioContext 限制、VAD 参数与用户手势约束。

## 1. 引擎生命周期：评测完成后不销毁

### 现象

- 第一次录音正常，切换到下一题后提示「麦克风已被收回，请重新点击」，点击无效
- 或需「先说一次话激活」，第二次说话才被录取

### 根因

`engineBackResultDone` 和 `engineBackResultFail` 中销毁引擎（`engineRef = null`），导致下次 `startRecord` 时创建新实例。新实例的 `createMediaStreamSource` 收到已失效的 MediaStream，抛出 `parameter 1 is not of type 'MediaStream'`。

### 正确做法

- 评测完成后**不**销毁引擎，保持同一实例、同一 AudioContext/MediaStream 复用
- 仅在 `visibilitychange` 隐藏、`resetEngine`、`cancelEval` 时销毁

详见 [speech-eval-microphone-lifecycle-fix.md](./speech-eval-microphone-lifecycle-fix.md)。

---

## 2. iOS AudioContext：避免额外 AudioContext

### 现象

- PC 和 Android 正常，iOS Web/PWA 上 `micVolumeCallback` 不触发，一直「等待音量回调」

### 根因

iOS Safari 并发 AudioContext 上限约 4–6 个。若用 `unlockAudioContext()` 等方案创建**额外**且未关闭的 AudioContext，会挤占 SDK 内部使用的 AudioContext，导致 `micVolumeCallback` 失效。

### 正确做法

- **不要**创建多余的 AudioContext（如 `new AudioContext()` 用于 unlock）
- 改为**提前初始化引擎**：在用户选好题目集或 SDK 就绪后，尽早调用 `ensureEngine()` + `getWarrantId()`，让 SDK 在用户手势上下文中完成麦克风权限获取
- 点击录音时只做 `startRecord`，减少 async 链路

---

## 3. 引擎复用冷却期

### 现象

- 复用同一引擎时，第一次说话不触发评分，第二次说话才生效（且音量已超阈值）

### 根因

SDK 在 `stopRecord` 到下一次 `startRecord` 之间需要内部清理时间，若用户在评测完成后短时间内再次点击，可能尚未完成清理。

### 正确做法

- 使用 `lastEvalEndRef` 记录上次评测完成时间
- `startRecord` 前检查：若距上次完成不足 `ENGINE_COOLDOWN_MS`（如 500ms），则 `await` 补足剩余时间后再调用

---

## 4. VAD phase 时序：先设 phase 再 startRecord

### 现象

- 用户感觉「点击开始录音后，第一次说话像在激活 SDK，第二次才真正录取」

### 根因

`micVolumeCallback` 一进来就检查 `if (vad.phase === "idle") return`。若 `startRecord()` 先于 `v.phase = "waitingForSpeech"` 执行，首批音量回调会被忽略。

### 正确做法

- 在调用 `startRecord()` **之前**设置 `v.phase = "waitingForSpeech"` 及相关 VAD 状态、`maxRecordTimerId`
- 确保 SDK 首次 `micVolumeCallback` 时，phase 已非 `idle`

---

## 5. VAD 最短说话时长：短单词误过滤

### 现象

- 短单词（如 "cat"、"go"）需说两次才触发评分
- 拉长发音或说整句则正常

### 根因

VAD 在静音定时器到期后检查 `speechDuration >= minSpeechMs`（原 500ms）。短词发音往往 200–300ms，被静默过滤，phase 停在 `silenceDetected`，`autoStop` 不触发。

### 正确做法

1. **降低默认值**：`VAD_MIN_SPEECH_MS` 从 500 降为 200
2. **参数化**：`startEval` options 支持 `minSpeechMs`，按 `coreType` 传入：
  - `en.word.score` → 150ms
  - `en.sent.score` → 200ms
  - `en.pred.score` → 300ms
3. **时长不足时重置**：当 `speechDuration < minSpeechMs` 时，不静默忽略，而将 phase 重置为 `waitingForSpeech` 并 `setRecordingStatus("waitingForSpeech")`，让用户明确看到「请开始说话」状态

---

## 6. 相关文件速查


| 文件                                             | 职责                                       |
| ---------------------------------------------- | ---------------------------------------- |
| `hooks/use-speech-eval.ts`                     | 引擎生命周期、VAD、冷却期、minSpeechMs、debugInfo     |
| `app/(main)/practice/page.tsx`                 | 提前初始化 useEffect、按 coreType 传 minSpeechMs |
| `app/(main)/practice/test/page.tsx`            | 同上                                       |
| `docs/speech-eval-microphone-lifecycle-fix.md` | 引擎生命周期 bug 详解                            |
| `docs/speech-eval-success-flow.md`             | 完整评测闭环流程                                 |


---

## 7. 修改时的检查清单

修改语音评测相关逻辑时，建议确认：

- `engineBackResultDone` / `engineBackResultFail` 中不销毁引擎
- 无额外创建、未关闭的 AudioContext
- 有提前初始化（selectedSet/sdkReady 时 ensureEngine + getWarrantId）
- `v.phase` 在 `startRecord` 前已设为 `waitingForSpeech`
- 有引擎复用冷却期（500ms）
- `minSpeechMs` 按 coreType 合理设置，短词不会误过滤
- 时长不足时重置 phase 而非静默忽略

