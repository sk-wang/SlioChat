<div align="center">

# 🚀 SlioChat

**现代化单文件 AI 聊天界面 | Modern Single-File AI Chat UI**

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![GitHub Stars](https://img.shields.io/github/stars/user/slio-chat?style=social)](https://github.com/user/slio-chat)
[![Demo](https://img.shields.io/badge/Demo-Live-blue)](https://slio-chat.pages.dev/)

[English](readme_en.md) · [在线体验](https://slio-chat.pages.dev/) · [快速开始](#-快速开始) · [功能特性](#-主要特性)

<img src="imgs/img.png" alt="SlioChat 界面预览" width="800"/>

*支持多种大语言模型的现代化聊天界面，所有功能集成在单个 HTML 文件中*

</div>

---

## 📖 目录

- [主要特性](#-主要特性)
- [界面预览](#-界面预览)
- [快速开始](#-快速开始)
- [项目结构](#-项目结构)
- [技术栈](#️-技术栈)
- [API 支持](#-api-支持)
- [构建部署](#-构建部署)
- [贡献指南](#-贡献)
- [联系方式](#-联系方式)

---

## ✨ 主要特性

<table>
<tr>
<td width="50%">

### 🎨 优雅的用户界面
- 🌓 亮色/暗色主题无缝切换
- 📱 响应式设计，完美支持移动端
- ✨ 现代化 UI 组件和流畅动画

</td>
<td width="50%">

### 💬 完整的对话功能
- 🏷️ 自动生成对话标题
- 📄 支持图片、PDF、Excel、Word 文件对话
- 📝 Markdown 格式 + 代码语法高亮
- ⚡ 流式响应 + 暂停/继续生成
- 🧠 **思考过程可视化**

</td>
</tr>
<tr>
<td width="50%">

### 📝 消息管理
- ✏️ 支持编辑和删除消息
- 💾 会话记录本地存储
- 📤 导出/导入对话记录

</td>
<td width="50%">

### 🔍 博查联网搜索 <sup>Beta</sup>
- 🤖 自动判断是否需要联网搜索
- 🔗 自动生成搜索 Query
- 📚 自动引用搜索结果并提供来源链接

</td>
</tr>
<tr>
<td colspan="2">

### ⚙️ 个性化设置
自定义系统提示词 · 在线添加和管理模型 · 多种模型即时切换 · 对话分类管理

</td>
</tr>
</table>

---

## 📸 界面预览

<div align="center">

### 深色主题 - 思考过程可视化

<img src="imgs/img.png" alt="SlioChat 深色主题界面 - 展示思考过程可视化功能" width="750"/>

*SlioChat 深色主题界面，展示 AI 思考过程可视化、Markdown 渲染和侧边栏对话管理*

</div>

---

## 🚀 快速开始

### 方式一：在线配置（推荐）

SlioChat 支持在网页界面上直接配置和管理模型，**无需修改代码**：

| 步骤 | 操作 |
|------|------|
| 1️⃣ | 点击右上角 **设置图标** ⚙️ 打开设置面板 |
| 2️⃣ | 在「模型设置」区域点击 **新增模型** |
| 3️⃣ | 填写模型 ID、显示名称、类型、API URL 和 Key |
| 4️⃣ | （可选）配置博查搜索 API 启用联网搜索 |
| 5️⃣ | 点击 **保存**，配置即时生效 |

> **✅ 优势**：无需重启 · 多模型同时配置 · 本地存储隐私安全 · 动态增删改模型

### 方式二：代码配置（高级用户）

<details>
<summary>📝 点击展开代码配置说明</summary>

#### 1. 配置模型 API

在 `js/config.js` 中配置：

```javascript
const API_CONFIG = {
    models: {
        'deepseek-r1': {
            name: 'deepseek-r1',
            type: 'thinking',  // 深度思考模型
            url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
            key: 'your-api-key',
        },
        'deepseek-v3': {
            name: 'deepseek-v3',
            type: 'normal',
            url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
            key: 'your-api-key',
        },
    },
    defaultVlm: 'qwen2.5-vl-3b-instruct',
};
```

#### 2. 配置博查搜索 API（可选）

```javascript
search: {
    url: 'https://api.bochaai.com/v1/web-search',
    enabled: false,
    token: 'your-bocha-api-key'  // 获取: https://open.bochaai.com/
}
```

#### 3. 开发环境运行

直接用浏览器打开 `index.html`，或使用任意 Web 服务器托管。

</details>

---

## 📁 项目结构

```
slio-chat/
├── 📄 index.html          # 主 HTML 文件
├── 📁 css/
│   └── main.css           # 样式文件
├── 📁 js/
│   ├── config.js          # 配置文件
│   └── main.js            # 主要功能代码
├── 📁 scripts/
│   └── build.js           # 构建脚本
├── 📁 dist/               # 构建输出目录
│   └── index.html         # 打包后的单文件（~3.9MB）
├── 📁 imgs/               # 截图资源
└── 📄 package.json
```

---

## 🛠️ 技术栈

<table>
<tr>
<td align="center" width="120">
<strong>核心</strong><br/>
<sub>Vanilla JS</sub>
</td>
<td align="center" width="120">
<strong>样式</strong><br/>
<sub>TailwindCSS</sub>
</td>
<td align="center" width="120">
<strong>Markdown</strong><br/>
<sub>Marked.js</sub>
</td>
<td align="center" width="120">
<strong>代码高亮</strong><br/>
<sub>Highlight.js</sub>
</td>
</tr>
<tr>
<td align="center" width="120">
<strong>PDF 解析</strong><br/>
<sub>PDF.js</sub>
</td>
<td align="center" width="120">
<strong>Excel</strong><br/>
<sub>SheetJS</sub>
</td>
<td align="center" width="120">
<strong>Word</strong><br/>
<sub>Mammoth.js</sub>
</td>
<td align="center" width="120">
<strong>编码检测</strong><br/>
<sub>jschardet</sub>
</td>
</tr>
</table>

---

## 🔑 API 支持

### 免费体验模型

| 模型 | 类型 | 说明 |
|------|------|------|
| **Qwen2-57B** | 普通对话 | 阿里云 Qwen2 模型 |
| **DeepSeek-R1-Distill-Qwen-32B** | 思考推理 | DeepSeek 蒸馏模型 |

> 以上模型已预配置，**无需 API Key** 即可直接使用

### 支持的模型服务

<table>
<tr>
<td>✅ GPT 系列</td>
<td>✅ Claude 系列</td>
<td>✅ DeepSeek 系列</td>
</tr>
<tr>
<td>✅ 智谱 GLM 系列</td>
<td>✅ 通义千问系列</td>
<td>✅ 其他 OpenAI 兼容 API</td>
</tr>
</table>

---

## 📦 构建部署

### 生产部署

```bash
# 1. 安装依赖
npm install

# 2. 构建单文件版本
npm run build

# 3. 部署 dist/index.html 到任意 Web 服务器
```

### 构建特性

| 特性 | 说明 |
|------|------|
| ✅ 自动内联 | 本地 CSS 和 JS 自动内联到 HTML |
| ✅ CDN 资源内联 | 外部库自动下载并内联 |
| ✅ 代码压缩 | JS、CSS、HTML 自动压缩优化 |
| ✅ 依赖顺序 | 确保外部库在本地代码前加载 |
| ✅ PDF.js 优化 | Worker 转换为 Data URI，支持离线 |

---

## 📝 License

[MIT License](LICENSE) © 2024

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📧 联系方式

<div align="center">

**Email**: skvdhsh@gmail.com

---

<sub>Made with ❤️ by SlioChat Team</sub>

</div>
