# Refinex Code

> 一个面向研究、调试与二次实验的 Claude Code TypeScript 工程，可在本地直接启动。

<p align="center">
  <img src="preview.png?raw=true" alt="Refinex Code CLI 预览" width="700">
</p>

## 项目简介

这个仓库基于 `@anthropic-ai/claude-code` 已发布 npm 包中的公开 source map 进行重建，并在此基础上整理为一个可运行、可阅读、可继续研究的本地工程。

它更适合下面几类工作：

- 本地启动 CLI，验证入口、命令和 UI 交互
- 阅读还原后的实现细节，追踪 feature gate、内部命令和服务模块
- 结合 `docs/` 中的研究笔记，快速定位关键能力，而不是在 2000+ 个源文件里盲搜
- 把它当作个人实验底座，继续补充注释、兼容层或派生功能

当前仓库包含：

- `2042` 个 `src/` 下的源码文件
- `87` 个一级命令目录
- `7` 篇针对重点能力的研究文档

> [!WARNING]
> 本仓库不是官方发布版本，也不代表 Anthropic 的正式立场。请把它视为个人研究/学习用途的还原工程，而不是官方分发渠道。

## 快速开始

### 环境要求

- Bun `>= 1.3.5`
- Node.js `>= 24`

### 安装依赖

```bash
bun install
```

### 启动与验证

```bash
bun run dev
bun run version
```

如果只是做一次最小可用性检查，优先运行：

```bash
bun run version
```

## 作为全局命令使用

如果你希望像普通 CLI 一样在任意目录执行 `ccc`，可以用 Bun 的链接机制注册全局命令。

### 1. 注册命令

```bash
bun link
```

### 2. 确保 `~/.bun/bin` 在 `PATH` 中

```bash
printf '\nexport PATH="$HOME/.bun/bin:$PATH"\n' >> ~/.zshrc
source ~/.zshrc
rehash
```

### 3. 验证是否生效

```bash
which ccc
ccc --help
ccc --version
```

如果你的 shell 还没有刷新，也可以先直接调用：

```bash
~/.bun/bin/ccc --help
```

## 文档导航

仓库首页不再展开长篇分析，细节统一放到 `docs/` 中维护。

| 文档 | 主题 | 适合什么时候看 |
| --- | --- | --- |
| [docs/01-buddy.md](docs/01-buddy.md) | Buddy 宠物系统 | 想看隐藏交互、随机生成与 ASCII 动画 |
| [docs/02-kairos.md](docs/02-kairos.md) | Kairos 持久助手模式 | 想看跨会话、日志、Dream 整合与主动执行 |
| [docs/03-ultraplan.md](docs/03-ultraplan.md) | Ultraplan 云端规划 | 想看远程研究会话与 teleport 相关链路 |
| [docs/04-coordinator.md](docs/04-coordinator.md) | Coordinator 多 Agent 编排 | 想看主控与 worker 的任务分发模型 |
| [docs/05-hidden-commands.md](docs/05-hidden-commands.md) | 隐藏命令与 CLI 参数 | 想快速盘点 feature-gated 命令入口 |
| [docs/06-bridge.md](docs/06-bridge.md) | Bridge 远程控制 | 想了解 WebSocket 桥接和远程审批机制 |
| [docs/07-feature-gates.md](docs/07-feature-gates.md) | Feature gate 总览 | 想先理解哪些能力在外部环境不可直接复现 |

## 仓库结构

```text
.
├── bin/        # CLI 启动脚本
├── docs/       # 研究笔记与专题分析
├── shims/      # 本地兼容包与替代实现
├── src/        # 还原后的核心 TypeScript 源码
├── vendor/     # 兼容或恢复时引入的本地依赖
└── package.json
```

更细一点看：

- `src/commands/`：命令入口与命令级 UI，当前包含 80+ 个命令目录
- `src/services/`：能力编排、远程服务、记忆、插件与上下文处理
- `src/tools/`：文件、终端、MCP、计划模式等工具层
- `src/components/`：Ink/React 终端界面组件
- `src/bridge/`、`src/coordinator/`、`src/proactive/`：较核心的“隐藏能力”实现区域

## 已知边界

- 这是还原工程，不是上游的干净源码仓库
- 某些功能受编译开关、用户类型或远程配置共同控制，外部环境下无法完整复现
- 本地能跑通入口，不等于所有内部链路都可用；接手二次开发前，建议先验证你的目标命令
- `package.json` 中仍保留上游包名与部分元信息，这是当前还原状态的一部分

## 适合谁使用

- 想研究 Claude Code CLI 架构的人
- 想排查隐藏命令、内部 feature gate 与实验功能的人
- 想把还原工程作为个人实验仓库继续整理的人

如果你的目标是稳定生产使用，这个仓库不是最佳入口；如果你的目标是学习、拆解和验证实现细节，它很合适。

## 归因与说明

- 当前仓库基于公开发布产物的还原与整理
- 相关源码版权归原作者/原项目权利方所有
- 仓库内容应以研究、学习和本地实验为主要用途

