<div align="center">

# 🚀 SlioChat

**现代化 AI 聊天界面 | Modern AI Chat UI**

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![GitHub Stars](https://img.shields.io/github/stars/user/slio-chat?style=social)](https://github.com/user/slio-chat)
[![Demo](https://img.shields.io/badge/Demo-Live-blue)](https://slio-chat.pages.dev/)

[English](readme_en.md) · [在线体验](https://slio-chat.pages.dev/) · [快速开始](#-快速开始) · [功能特性](#-主要特性)

<img src="imgs/img.png" alt="SlioChat 界面预览" width="800"/>

*基于 Svelte 5 + TypeScript 构建的现代化 AI 聊天界面*

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
- 📄 支持图片文件对话
- 📝 Markdown 格式 + 代码语法高亮
- ⚡ 流式响应
- 🧠 **思考过程可视化**

</td>
</tr>
<tr>
<td width="50%">

### 📝 消息管理
- ✏️ 支持编辑和删除消息
- 💾 会话记录本地存储
- 🗂️ 对话按日期分组管理

</td>
<td width="50%">

### ⚙️ 个性化设置
- 🤖 多种预设对话类型
- 🔧 自定义 API 配置
- 🔄 多模型即时切换

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

### 开发环境

```bash
# 1. 克隆项目
git clone https://github.com/user/slio-chat.git
cd slio-chat

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev

# 4. 打开浏览器访问 http://localhost:5173
```

### 配置 API

在设置面板中配置你的 API：

| 步骤 | 操作 |
|------|------|
| 1️⃣ | 点击侧边栏底部 **设置** 按钮 |
| 2️⃣ | 填写 API URL 和 API Key |
| 3️⃣ | 点击 **保存**，配置即时生效 |

---

## 📁 项目结构

```
slio-chat/
├── 📄 index.html              # 入口 HTML
├── 📄 package.json            # 项目配置
├── 📄 vite.config.ts          # Vite 配置
├── 📄 tailwind.config.js      # Tailwind 配置
├── 📄 tsconfig.json           # TypeScript 配置
├── 📁 src/
│   ├── 📄 App.svelte          # 主应用组件
│   ├── 📄 app.css             # 全局样式
│   ├── 📄 main.ts             # 应用入口
│   └── 📁 lib/
│       ├── 📁 components/     # UI 组件
│       ├── 📁 services/       # API 服务层
│       ├── 📁 stores/         # 状态管理
│       ├── 📁 types/          # TypeScript 类型
│       └── 📁 utils/          # 工具函数
├── 📁 dist/                   # 构建输出
└── 📁 imgs/                   # 截图资源
```

---

## 🛠️ 技术栈

<table>
<tr>
<td align="center" width="120">
<strong>框架</strong><br/>
<sub>Svelte 5</sub>
</td>
<td align="center" width="120">
<strong>语言</strong><br/>
<sub>TypeScript</sub>
</td>
<td align="center" width="120">
<strong>构建</strong><br/>
<sub>Vite</sub>
</td>
<td align="center" width="120">
<strong>样式</strong><br/>
<sub>TailwindCSS</sub>
</td>
</tr>
<tr>
<td align="center" width="120">
<strong>Markdown</strong><br/>
<sub>Marked.js</sub>
</td>
<td align="center" width="120">
<strong>代码高亮</strong><br/>
<sub>Highlight.js</sub>
</td>
<td align="center" width="120">
<strong>图标</strong><br/>
<sub>Lucide</sub>
</td>
<td align="center" width="120">
<strong>存储</strong><br/>
<sub>IndexedDB</sub>
</td>
</tr>
</table>

---

## 🔑 API 支持

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

### 生产构建

```bash
# 构建生产版本
npm run build

# 预览构建结果
npm run preview

# 部署 dist/ 目录到任意静态服务器
```

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
