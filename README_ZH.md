# SLM-Translation: 在 VSCODE 中使用 SLM 进行翻译

![example](example.gif)

## 如何使用

-   **启用插件功能**：在命令面板中输入`SLM-Translation: Enable`
-   **禁用插件功能**：在命令面板中输入`SLM-Translation: Disable`
-   **选中翻译**：选中待翻译文本后，按下快捷键`shift` + `alt` + `t` 或在命令面板中输入`SLM-Translation: Translate`
-   **在面板中显示对照翻译**：在命令面板中输入`SLM-Translation: Translate on Panel`
-   **根据描述命名**：选中描述文本后，按下快捷键`shift` + `alt` + `n` 或在命令面板中输入`SLM-Translation: Naming`

## 要求

本地部署 ollama 并拉取 qwen2.5:1.5b 模型

> 目前为 demo 版本，暂时只提供了该模型支持

## 发行说明

### 0.0.1

demo 版本，实现了如下核心功能：

-   选中翻译
-   在面板中对照翻译整个文档
-   根据描述提供变量、函数、类标识符建议
