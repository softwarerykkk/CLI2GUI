# CLI2GUI — 通用 AI API 聊天界面

## 一、项目概述

CLI2GUI 是一个轻量级 Web 聊天界面，目标是让用户**无需终端、无需安装 Codex 或 Claude Code**，仅通过浏览器即可与任意兼容 OpenAI/Anthropic 格式的 API 进行多模态对话。

用户只需三步即可开始：

1. 填入 **API Base URL**（如 `https://api.openai.com/v1`、`https://api.anthropic.com`）
2. 填入 **API Key**（sk-xxx）
3. 选择 **模型**（自动拉取可用模型列表或手动输入）

即可获得一个类似 Claude Web / ChatGPT 的聊天体验，并支持图片输入与图片输出。

---

## 二、核心需求

| 类别 | 需求 | 优先级 |
|------|------|--------|
| 配置 | 输入 API Base URL + API Key | P0 |
| 配置 | 自动获取可用模型列表 / 手动输入模型名 | P0 |
| 配置 | 配置信息本地持久化（localStorage） | P1 |
| 聊天 | Markdown 渲染 + 代码高亮 | P0 |
| 聊天 | 流式输出（SSE / streaming） | P0 |
| 聊天 | 多轮对话上下文管理 | P0 |
| 多模态 | 用户上传/粘贴图片作为输入 | P0 |
| 多模态 | 渲染模型返回的图片（base64 / URL） | P0 |
| 体验 | 新建对话 / 历史会话列表 | P1 |
| 体验 | 暗色/亮色主题切换 | P2 |
| 体验 | 移动端自适应 | P1 |

---

## 三、技术方案

### 3.1 整体架构

```
┌─────────────────────────────────────────┐
│              浏览器 (前端)                │
│                                         │
│  ┌───────────┐   ┌──────────────────┐   │
│  │ 配置面板   │   │   聊天主界面      │   │
│  │ URL/Key   │   │   消息列表        │   │
│  │ 模型选择  │   │   输入框+图片上传  │   │
│  └───────────┘   └──────────────────┘   │
│         │                 │              │
│         ▼                 ▼              │
│  ┌──────────────────────────────────┐   │
│  │       API 适配层 (Adapter)       │   │
│  │  OpenAI 格式 ←→ Anthropic 格式   │   │
│  └──────────────────────────────────┘   │
│                   │                      │
└───────────────────┼──────────────────────┘
                    │ HTTPS (直连 API)
                    ▼
          ┌──────────────────┐
          │  第三方 API 服务  │
          │  OpenAI/Claude/  │
          │  自部署模型等     │
          └──────────────────┘
```

**关键决策：纯前端方案，无自建后端。** 浏览器直接请求用户填入的 API 地址，API Key 仅存储在用户本地，不经过任何中间服务器，保证安全性和简洁性。

> ⚠️ 注意：部分 API 服务不允许浏览器直接跨域请求（CORS 限制）。对于此类情况，可提供一个可选的轻量代理模式（本地起一个 Node 代理）。

### 3.2 技术栈选型

| 层 | 选择 | 理由 |
|---|---|---|
| 框架 | **React + TypeScript** | 生态成熟、组件化、类型安全 |
| 构建 | **Vite** | 开发快、打包小 |
| 样式 | **Tailwind CSS** | 快速开发、响应式、暗色模式内建 |
| Markdown | **react-markdown + rehype-highlight** | 轻量、支持代码高亮 |
| 状态管理 | **Zustand** | 简洁、零模板代码 |
| 存储 | **localStorage / IndexedDB** | 配置 + 历史会话本地持久化 |
| 可选代理 | **Express / Hono** | 仅用于解决 CORS 问题 |

### 3.3 API 适配层设计

项目需要兼容两大主流 API 格式：

**OpenAI 兼容格式**（覆盖 OpenAI、DeepSeek、Groq、本地 Ollama 等）：
- 端点：`POST {base_url}/chat/completions`
- 模型列表：`GET {base_url}/models`
- 图片输入：`content` 数组中 `type: "image_url"` 项
- 流式输出：`stream: true`，SSE 格式

**Anthropic 格式**（Claude 系列）：
- 端点：`POST {base_url}/v1/messages`
- 无公开模型列表接口，需手动选择或预置列表
- 图片输入：`content` 数组中 `type: "image"`，base64 编码
- 流式输出：`stream: true`，SSE 格式
- 需设置 `anthropic-version` 头

适配层核心接口：

```typescript
interface ChatAdapter {
  // 发送消息并返回流式响应
  sendMessage(messages: Message[], config: ApiConfig): AsyncGenerator<StreamChunk>;
  // 获取可用模型列表
  listModels(config: ApiConfig): Promise<string[]>;
  // 检测 API 格式类型
  detectProvider(baseUrl: string): "openai" | "anthropic" | "unknown";
}
```

### 3.4 多模态处理

**图片输入：**
- 支持拖拽、粘贴（Ctrl+V）、点击上传
- 上传后转为 base64，按 API 格式要求嵌入消息体
- 显示缩略图预览，支持删除

**图片输出：**
- 检测响应中的 base64 图片数据或图片 URL
- 内联渲染，支持点击放大
- 支持右键保存

---

## 四、页面设计

### 4.1 配置面板（首次使用 / 设置页）

```
┌─────────────────────────────────────┐
│         ⚙️  API 配置                │
│                                     │
│  API 地址   [https://api.openai... ]│
│  API Key    [sk-****************** ]│
│  模型       [▾ gpt-4o            ] │
│                                     │
│        [ 测试连接 ]  [ 保存 ]       │
└─────────────────────────────────────┘
```

### 4.2 聊天主界面

```
┌──────────┬──────────────────────────┐
│ 历史会话  │   模型: gpt-4o    ⚙️    │
│          │──────────────────────────│
│ ● 会话1  │                          │
│   会话2  │  👤 帮我分析这张图片      │
│   会话3  │     [图片缩略图]          │
│          │                          │
│          │  🤖 这张图片显示的是...    │
│          │     分析内容...           │
│          │                          │
│          │──────────────────────────│
│          │ 📎 [消息输入框...]   ➤   │
│ [+ 新建] │                          │
└──────────┴──────────────────────────┘
```

---

## 五、项目结构

```
cli2gui/
├── src/
│   ├── main.tsx                 # 入口
│   ├── App.tsx                  # 根组件
│   ├── components/
│   │   ├── ChatView.tsx         # 聊天主界面
│   │   ├── MessageList.tsx      # 消息列表
│   │   ├── MessageBubble.tsx    # 单条消息（含 Markdown 渲染）
│   │   ├── InputBar.tsx         # 输入框 + 图片上传
│   │   ├── Sidebar.tsx          # 历史会话侧栏
│   │   └── ConfigPanel.tsx      # API 配置面板
│   ├── adapters/
│   │   ├── types.ts             # 统一接口定义
│   │   ├── openai.ts            # OpenAI 兼容适配器
│   │   └── anthropic.ts         # Anthropic 适配器
│   ├── store/
│   │   ├── chatStore.ts         # 会话状态管理
│   │   └── configStore.ts       # 配置状态管理
│   └── utils/
│       ├── image.ts             # 图片处理（压缩、base64）
│       └── stream.ts            # SSE 流式解析
├── index.html
├── tailwind.config.js
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## 六、开发计划

### 第一阶段：MVP（约 3-4 天）

- [ ] 项目初始化（Vite + React + Tailwind）
- [ ] 配置面板：URL / Key / 模型输入与持久化
- [ ] OpenAI 适配器 + 流式输出
- [ ] 基础聊天界面（输入框 + 消息列表 + Markdown 渲染）
- [ ] 多轮对话上下文传递

### 第二阶段：多模态 + Anthropic 支持（约 2-3 天）

- [ ] 图片上传（拖拽 + 粘贴 + 按钮）
- [ ] 图片输入适配（OpenAI / Anthropic 两种格式）
- [ ] 图片输出渲染
- [ ] Anthropic 适配器

### 第三阶段：体验优化（约 2-3 天）

- [ ] 历史会话管理（新建 / 切换 / 删除）
- [ ] 暗色/亮色主题
- [ ] 移动端适配
- [ ] 连接测试 + 错误提示优化
- [ ] 可选：本地 CORS 代理

### 第四阶段：扩展功能（可选）

- [ ] 系统 Prompt 自定义
- [ ] 对话导出（Markdown / JSON）
- [ ] 温度、Top-P 等参数调节
- [ ] 多 API 配置快速切换
- [ ] PWA 支持（离线可用）

---

## 七、CORS 解决方案

由于是纯前端应用直接调用第三方 API，CORS 是主要挑战：

| 方案 | 适用场景 | 说明 |
|------|---------|------|
| 直连 | API 服务已开放 CORS | 最理想，零配置 |
| 本地代理 | 开发/本机使用 | 提供 `npx cli2gui-proxy` 一键启动 |
| 自部署代理 | 团队共享使用 | Docker 镜像，一行命令部署 |
| 浏览器插件 | 个人临时使用 | 推荐 CORS Unblock 类插件 |

---

## 八、与现有工具对比

| 特性 | CLI2GUI（本项目） | Claude Code | Codex CLI | ChatGPT Web |
|------|:-:|:-:|:-:|:-:|
| 图形界面 | ✅ | ❌ | ❌ | ✅ |
| 自定义 API 地址 | ✅ | ❌ | ❌ | ❌ |
| 自定义 API Key | ✅ | ✅ | ✅ | ❌ |
| 多模型支持 | ✅ | 仅 Claude | 仅 OpenAI | 仅 OpenAI |
| 图片输入 | ✅ | ✅ | ❌ | ✅ |
| 图片输出 | ✅ | ❌ | ❌ | ✅ |
| 无需安装 | ✅ | ❌ | ❌ | ✅ |
| 开源自部署 | ✅ | ❌ | ✅ | ❌ |

---

## 九、总结

CLI2GUI 的核心价值是**简洁**和**通用**：一个界面接入所有 API，三个字段完成配置，开箱即用。不做复杂的 Agent 功能、不做文件系统操作，只专注于做一个干净好用的多模态聊天前端。