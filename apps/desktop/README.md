# 桌面外壳

此应用程序是 `Refinex-Code` 的 TypeScript 优先的 Mac 桌面外壳。

## 范围

- 重用来自 `Refinex-Omni` 的视觉外壳方向
- 仅保留通用桌面框架、命令面板、侧边栏、主题系统和终端面板
- 用 Electron `main` + `preload` + IPC 替换旧的 Rust/Tauri 桥接
- 仅在内存中保持工作区状态

## 明确未迁移

- 模型选择和提供商设置
- 聊天记录解析和结构化 LLM 响应块
- 会话持久化和配置文件处理
- Rust 命令、事件和存储
- 最终聊天 UX 和对话模式

## 终端边界

终端桥接使用 macOS `script` 命令从 TypeScript 分配伪终端。这使第一个切片免于 Electron 原生 PTY 重建工作。它足以作为引导外壳，但还不是完整的终端子系统。

## 命令

从此目录验证的路径：

```bash
npm install
npm run dev
npm run typecheck
npm run test
npm run build
```

从仓库根目录：

```bash
bun run desktop:dev
bun run desktop:typecheck
bun run desktop:test
bun run desktop:build
```

如果在当前网络环境中 Electron 二进制下载超时，请使用镜像安装：

```bash
cd apps/desktop
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ node node_modules/electron/install.js
```
