# ResourceHub - Codex Session Guide

本仓库使用 Codex 驱动任务执行，请优先遵循以下流程：

1. 运行 `./init.sh`
2. 读取 `task.json`，只选择一个 `passes: false` 的任务
3. 完成实现后在应用目录运行 `npm run lint` 和 `npm run build`
4. 更新 `progress.txt`
5. 仅在验证通过后将该任务标记为 `passes: true`
6. 一次性提交该任务的全部更改

详细规则请查看 `AGENT.md`。
