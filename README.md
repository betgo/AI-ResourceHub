# 全自动编程 Agent 模板（Codex 版）

## 免责声明

本项目主要用于自动化开发流程实验。请在运行前自行审查脚本和生成代码，任何后果自行承担。

## 项目定位

这是一个用于驱动 **Codex** 长时自动开发的模板仓库，目标项目为：

- 产品类型：`Resource Sharing Website`
- 核心场景：资源上传、分类检索、收藏下载、评论互动、后台审核
- 技术方向：Next.js 全栈 + PostgreSQL + Object Storage

你可以把它当成“自动化开发脚手架”：`architecture.md` 定义架构，`task.json` 拆解任务，`run-automation.sh` 循环驱动 Codex 执行任务。

## 核心文件

- `AGENT.md`：Codex 工作流与约束
- `architecture.md`：资源分享网站架构设计
- `task.json`：可执行任务清单（`passes: false` 表示待完成）
- `progress.txt`：每次会话的工作记录
- `init.sh`：初始化/启动开发环境
- `run-automation.sh`：循环调用 Codex 自动执行任务

## 前置要求

- [Codex CLI](https://github.com/openai/codex)
- Node.js 20+
- npm

## 使用方式

### 方式一：手动交互（推荐）

```bash
./init.sh
codex
```

然后让 Codex 按 `AGENT.md` + `task.json` 执行下一个未完成任务。

### 方式二：非交互自动循环

```bash
./run-automation.sh 10
```

脚本会循环执行 `codex exec`，每轮只完成一个任务并写入 `automation-logs/`。

## 建议流程

1. 先阅读 `architecture.md`，确认目标架构。
2. 按优先级从 `task.json` 中选择 `passes: false` 的任务。
3. 每轮只完成一个任务，并更新 `progress.txt`。
4. 完成验证后，将该任务标记为 `passes: true`。

## 注意事项

- 自动模式默认是高权限执行，请只在可信环境使用。
- 对 UI 任务建议配合 Playwright 做端到端验证。
- 如果遇到不可解决的外部阻塞，记录到 `progress.txt` 并停止该任务。
