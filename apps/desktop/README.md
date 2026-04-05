# RWork 桌面外壳

`RWork` 是 `Refinex-Code` 的 TypeScript 优先 Mac 桌面外壳，命名上对标 `Claude Code` 的 `CWork`。

## 范围

- 重用来自 `Refinex-Omni` 的视觉外壳方向
- 仅保留通用桌面框架、命令面板、支持多项目 WorkTree/多线程的侧边栏、主题系统和终端面板
- 用 Electron `main` + `preload` + IPC 替换旧的 Rust/Tauri 桥接
- 将 WorkTree 与线程元数据持久化到 Electron 本地应用数据目录

## 明确未迁移

- 模型选择和提供商设置
- 聊天记录解析和结构化 LLM 响应块
- 完整聊天 transcript 持久化和配置文件处理
- Rust 命令、事件和存储
- 最终聊天 UX 和对话模式

## 应用图标

- 规范化资源位置：`apps/desktop/resources/icons/`
- 当前提交内容：`icon.svg`、`icon.png`、`icon.icns`
- 选用来源：`/Users/refinex/develop/素材/logo/android-chrome-512x512.png` 与同目录 `logo.svg`

## 终端边界

终端桥接使用 macOS `script` 命令从 TypeScript 分配伪终端。这使第一个切片免于 Electron 原生 PTY 重建工作。它足以作为引导外壳，但还不是完整的终端子系统。

## 本地存储设计

项目与线程状态不会写回用户打开的代码仓库，而是统一放在：

```text
~/Library/Application Support/RWork/sidebar-state/
├── index.json
└── worktrees/
    └── <worktree-id>/
        ├── worktree.json
        └── sessions/
            └── <session-id>.json
```

这样设计的原因：

- Electron 桌面应用天然拥有稳定的 `userData` 目录，适合跨重启保存状态
- 当前产品要支持多个项目并行打开，状态应该归应用本身管理，而不是污染任意目标仓库
- 后续如果补聊天 transcript、工件缓存或配置文件，可以继续按 `worktree-id/session-id` 向下扩展

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
