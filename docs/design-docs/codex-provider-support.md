# Codex / OpenAI Provider Support Research

## 1. 问题定义

目标不是“让当前仓库勉强接一个中转地址”，而是让当前项目能够像 Codex 一样，在 `~/.claude` 下声明一个可切换的 provider，例如 `codex`，并配置：

- `base_url`
- 认证来源或 API Key
- 默认模型
- 默认推理深度
- 未来可扩展的 provider 能力项

这里的关键差异是：Codex/OpenAI 官方自定义 provider 走的是 **Responses API**，而本仓库当前核心实现走的是 **Anthropic Messages / Beta Messages**。

## 2. 证据链

### 2.1 仓库当前状态

截至 **2026-04-05**，当前仓库的 provider 基础面有以下特征：

- provider 联合类型固定为 `firstParty | bedrock | vertex | foundry`
- 主请求客户端基于 `@anthropic-ai/sdk`
- 主调用入口基于 `anthropic.beta.messages.create`
- thinking、tool use、streaming 事件、usage 聚合都按 Anthropic 语义建模
- 当前全局用户配置入口是 `~/.claude/settings.json` 与 settings 派生环境变量
- 当前 effort 持久化语义只有 `low | medium | high | max`

这意味着仓库虽然已经支持“切换 Anthropic 的不同后端”，但**尚未具备 provider-neutral 的传输抽象层**。

### 2.2 本地产品参考

本机 Codex 当前使用两层能力：

- `~/.codex/config.toml`：provider / model / reasoning / sandbox / feature 配置
- `~/.codex/auth.json` 或系统凭据存储：认证缓存

官方文档也明确说明：

- 用户级配置在 `~/.codex/config.toml`
- `model_provider` 与 `model_providers.<id>.*` 是正式配置面
- `model_reasoning_effort` 支持 `minimal | low | medium | high | xhigh`
- 登录缓存保存在 `~/.codex/auth.json` 或系统凭据存储

### 2.3 官方协议事实

OpenAI 官方当前把自定义 provider 建立在 **Responses API** 上，而不是 Chat Completions，更不是 Anthropic Messages 兼容层。Responses API 的关键特征包括：

- 输出是 item-based，而不是 Anthropic 的 content-block 流
- tool calling 是 `function_call` / `function_call_output` 语义
- reasoning 是 `reasoning.effort` / `reasoning.summary` 语义
- streaming 事件是 `response.output_text.delta`、`response.output_item.added` 等 SSE 事件

因此，“只把 `ANTHROPIC_BASE_URL` 指到 OpenAI 或 Codex 网关”这条路，只有在网关**完整模拟 Anthropic Messages API** 时才可能成立，而且稳定性无法由本仓库自身保证。

## 3. 选项分析

### 选项 A：继续复用 `~/.claude/settings.json` 的 `env`，把 Codex 当 Anthropic 代理

做法：

- 在 `settings.json.env` 中继续设置 `ANTHROPIC_BASE_URL`
- 用 `ANTHROPIC_API_KEY` 或 `ANTHROPIC_AUTH_TOKEN` 注入凭据

优点：

- 改动最小
- 现有仓库已经支持这一类路由

问题：

- 本质依赖“上游网关会说 Anthropic”
- 无法原生支持 OpenAI Responses streaming 事件
- 无法原生支持 OpenAI/Codex `minimal` 与 `xhigh`
- `/effort`、状态栏、usage、tool loop、reasoning UI 全会语义错位
- 一旦网关只支持 OpenAI 官方 shape，就彻底失效

结论：

- **只能作为临时私有代理方案**
- **不能作为项目级正式能力设计**

### 选项 B：把 provider 直接塞进 `~/.claude/settings.json`

做法：

- 在现有 settings schema 里新增 `providers`、`defaultProvider`、`providerAuth`

优点：

- 复用现有 settings merge 机制
- 用户感知少一个文件

问题：

- 当前 settings source 有 user / project / local / flag / policy 多层来源
- provider 与认证属于高风险基础设施配置，不应该天然允许 project/local 层参与
- 会把“行为设置”和“后端接入设置”混在一起
- 容易与现有 `env`、`apiKeyHelper`、managed settings、trust model 冲突
- 对未来导入 `~/.codex/config.toml` 也不自然

结论：

- **不推荐作为主设计**

### 选项 C：新增 `~/.claude/providers.json` + `~/.claude/auth.json`/keychain，并引入 provider adapter

做法：

- 保留 `~/.claude/settings.json` 作为用户行为设置
- 新增 provider 注册表，专门管理 provider 定义与默认模型/默认推理
- 新增 provider 认证存储，默认优先系统 keychain，文件存储作为显式选项
- 在代码层抽出 provider-neutral adapter interface

优点：

- 边界清晰
- 安全模型正确
- 与 Codex 的 `config + auth store` 分层一致
- 适合后续增加 `codex` / `openai` / 其他 Responses-compatible provider
- 允许做 `import-codex` 迁移工具

问题：

- 需要真正抽象请求/流式/工具调用边界
- 实现成本显著高于 env hack

结论：

- **推荐方案**

## 4. 最终设计结论

### 4.1 配置边界

推荐采用三层：

1. `~/.claude/settings.json`
2. `~/.claude/providers.json`
3. `~/.claude/auth.json` 或系统 keychain

职责分工：

- `settings.json`
  - 用户行为与会话偏好
  - 当前默认 provider 选择
  - 与 UI / sandbox / permissions / language 相关的现有设置
- `providers.json`
  - provider 定义
  - provider 默认模型
  - provider 默认 reasoning effort
  - provider base URL / wire protocol / 额外 header / query 参数
- `auth.json` 或 keychain
  - provider 认证材料
  - 不进入 project settings
  - 不参与普通 settings merge

### 4.2 为什么不把所有内容都放到 `settings.json`

原因不是“不能”，而是“不值得”：

- 当前 `settings.json` 的 merge 语义过强
- provider 配置是基础设施级别，而不是项目行为级别
- 认证信息和 provider registry 未来很可能需要 keychain/file 切换
- 单独文件更接近 Codex 的产品模型，也更适合做导入与诊断

### 4.3 推荐文件结构

推荐新增：

```json
{
  "$schema": "https://example.invalid/claude-code-providers.schema.json",
  "defaultProvider": "anthropic",
  "providers": {
    "anthropic": {
      "driver": "anthropic-messages",
      "baseUrl": "https://api.anthropic.com",
      "defaultModel": "claude-sonnet-4-6",
      "defaultReasoningEffort": "high"
    },
    "codex": {
      "driver": "openai-responses",
      "baseUrl": "https://api.openai.com/v1",
      "defaultModel": "gpt-5.4",
      "defaultReasoningEffort": "high",
      "defaultVerbosity": "medium",
      "authSource": {
        "type": "auth_json",
        "entry": "codex"
      }
    }
  }
}
```

对应的文件认证存储：

```json
{
  "providers": {
    "codex": {
      "apiKey": "<redacted>"
    }
  }
}
```

更稳妥的默认行为：

- macOS 优先 keychain
- `auth.json` 作为显式 fallback
- 明确拒绝 project 级 provider secret

### 4.4 与现有 `settings.json` 的关系

建议只给 `settings.json` 加极少量新字段：

- `modelProvider`
- 可选的 provider profile 覆盖字段

已有 `model` 可以继续保留为会话级 override，但其解释方式变为：

1. CLI / slash command override
2. `settings.json.model`
3. `providers.json.providers[modelProvider].defaultModel`
4. adapter 默认值

对于 reasoning，不建议继续复用当前 `effortLevel` 直接承载 OpenAI 语义，因为当前只支持：

- `low`
- `medium`
- `high`
- `max`

而 Codex/OpenAI 需要：

- `minimal`
- `low`
- `medium`
- `high`
- `xhigh`

所以推荐新增 provider-neutral 的 `reasoningEffort` 概念，并在 Anthropic adapter 中做兼容映射。

## 5. 代码架构建议

### 5.1 先抽象，再接 OpenAI

不要直接把 OpenAI 逻辑塞进 `src/services/api/claude.ts`。推荐新增：

- `src/services/api/providerAdapter.ts`
- `src/services/api/adapters/anthropicMessagesAdapter.ts`
- `src/services/api/adapters/openaiResponsesAdapter.ts`
- `src/services/api/providerRegistry.ts`
- `src/services/api/providerAuthStore.ts`

核心接口应至少覆盖：

- `createClient`
- `createResponse`
- `streamResponse`
- `normalizeUsage`
- `normalizeToolCall`
- `normalizeToolResult`
- `normalizeReasoning`
- `normalizeError`
- `listModelCapabilities`

### 5.2 内部统一事件模型

当前仓库大量依赖 Anthropic 原生块类型，例如：

- `tool_use`
- `tool_result`
- `thinking`
- `redacted_thinking`
- `content_block_*`

这意味着必须新增一层内部统一事件模型，例如：

- `assistant_text_delta`
- `assistant_text_done`
- `tool_call_started`
- `tool_call_arguments_delta`
- `tool_call_completed`
- `tool_result_attached`
- `reasoning_summary`
- `usage_report`

Anthropic 与 OpenAI 适配器都把各自协议映射到这套内部模型，然后现有 UI / executor / transcript / retry 逻辑再逐步脱离 Anthropic 原生类型。

### 5.3 reasoning 的 UI 策略

Anthropic 当前支持 raw thinking / redacted thinking 视图；OpenAI 官方更强调 reasoning effort 与 reasoning summary。

因此建议：

- 第一版只支持 provider-neutral `reasoning summary`
- Anthropic 继续保留现有 raw thinking 能力，但在内部标记为 provider-specific extension
- OpenAI/Codex 不强行伪造 `thinking` block

这能显著降低 UI 与 transcript 的错配风险。

## 6. 推荐实施阶段

### Phase 1：配置与认证基座

- 新增 `providers.json` 读取与 schema
- 新增 `auth.json` / keychain 认证抽象
- 新增 `modelProvider` 用户设置
- `/status` 增加 provider、driver、auth source 展示

### Phase 2：Anthropic 适配器抽离

- 从 `src/services/api/claude.ts` 提炼出 adapter interface
- 先把当前 Anthropic 流程包裹成 `anthropic-messages` adapter
- 行为不变，测试先绿

### Phase 3：OpenAI Responses 适配器

- 新增 OpenAI client 与 Responses streaming 映射
- 接入 API-key auth
- 支持基础文本、tool calling、structured output、reasoning effort

### Phase 4：UI 与命令层兼容

- `/effort` 改为 provider-aware
- model picker 改为 provider-aware
- transcript / status bar 由 provider-neutral 事件驱动

### Phase 5：迁移与增强亮点

- 新增 `claude providers import-codex`
- 读取 `~/.codex/config.toml`
- 读取 `~/.codex/auth.json` 或提示迁移到 keychain
- 输出 provider 诊断与兼容性报告

## 7. 风险清单

### 高风险

- 当前 Query/streaming 层对 Anthropic `content_block_*` 事件强依赖
- 当前 transcript 与 retry 对 `tool_use` / `tool_result` 配对规则强依赖
- 当前 effort / thinking UI 与 OpenAI reasoning 语义不一致

### 中风险

- usage/cost 统计字段不一致
- `/status`、SDK schema、analytics 里的 provider 枚举需要扩展
- settings merge 需要避免 project/local 污染 provider 认证

### 低风险

- 导入工具
- provider 列表 UI
- keychain/file 存储切换

## 8. 最终建议

结论很明确：

- **不建议**把 Codex 支持实现成 `ANTHROPIC_BASE_URL` 的长期 hack
- **不建议**把 provider registry 直接塞进现有 `~/.claude/settings.json`
- **建议**新增 `~/.claude/providers.json` + `~/.claude/auth.json`/keychain，并通过 provider adapter 正式接入 OpenAI Responses

如果只做短期实验，现有仓库已经可以继续走“Anthropic 兼容代理”路线；但如果目标是“把 Codex 自定义 provider 支持做成仓库亮点能力”，就必须做成 **原生 OpenAI Responses 适配**，否则后续 reasoning、tool calling、streaming、状态展示都会持续失真。

## 9. 验证清单

实施阶段建议最少覆盖：

- provider config 解析测试
- auth store 测试
- Anthropic adapter 回归测试
- OpenAI Responses streaming 事件 golden tests
- tool call/tool result 回环测试
- reasoning effort 映射测试
- `/status` 与 `/effort` 的 provider-aware 行为测试
