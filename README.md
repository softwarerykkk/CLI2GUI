# CLI2GUI

CLI2GUI 现在是一个面向 `PackyAPI` 的图片生成客户端。接口地址固定为 `https://www.packyapi.com/v1/`，模型固定为 `gpt-image-2`。前端不再允许修改 API 站点，只保留 `API Key` 和必要的连接配置。

## 当前能力

- 单轮图片生成
- 文生图：`POST /v1/images/generations`
- 图生图：`POST /v1/images/edits`
- 固定请求参数：
  - `model: gpt-image-2`
  - `size: 3840x2160`
  - `quality: high`
  - `output_format: png`
  - `n: 1`
- 图片上传、拖拽、粘贴输入
- 桌面客户端打包：`macOS arm64` / `Windows x64`
- 当前运行期内的会话记录
- 亮色界面
- 浏览器开发环境直连、代理，或桌面客户端内置请求桥接

## 启动

```bash
npm install
npm run dev
```

如果目标接口不允许浏览器直连，可以额外启动本地代理：

```bash
npm run proxy
```

或者同时启动前端和代理：

```bash
npm run dev:all
```

如果要启动桌面开发版：

```bash
npm run dev:desktop
```

## 构建

```bash
npm run build
npm run preview
```

生成安装包：

```bash
npm run dist:mac
npm run dist:win
```

## 使用方式

1. 打开设置面板
2. 填写 `API Key`
3. 保存后直接输入文本生成图片，或上传 1 张图片并输入文本做图生图

## 说明

- `API Base URL` 已写死为 `https://www.packyapi.com/v1/`
- 前端固定使用 `gpt-image-2`
- 图生图通过 `multipart/form-data` 调用上游接口
- 当前版本不做本地持久化；关闭应用后，`API Key` 与会话记录都会清空
- Electron 安装包默认输出到 `release/`
