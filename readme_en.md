<div align="center">

# SlioChat

**A lightweight AI Agent chat application with tool calling and virtual sandbox - let AI truly execute tasks**

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Demo](https://img.shields.io/badge/Demo-Live-blue)](https://slio-chat.pages.dev/)

[Live Demo](https://slio-chat.pages.dev/)

<img src="imgs/img.png" alt="SlioChat Interface Preview" width="800"/>

</div>

## ✨ Core Features

### 🤖 Agent Mode
- **Tool Calling** - Supports OpenAI-compatible function calling, AI can actively invoke tools to complete tasks
- **Multi-round Execution** - Automatic loop execution until task completion, up to 100 iterations
- **YOLO Mode** - Auto-execute tools without manual confirmation
- **Thinking Visualization** - Display AI reasoning process with multi-round accumulation

### 📁 Virtual Sandbox
- **Virtual File System** - IndexedDB-based sandbox environment, AI can safely read/write files
- **File Manager** - Built-in file browser with rename, move, download, delete support
- **Code Editor** - Built-in editor to directly modify files in sandbox

### 💬 Chat Features
- **Streaming Response** - Real-time AI replies with SSE streaming
- **Multi-model Support** - Compatible with OpenAI API format (GPT, Claude, DeepSeek, Qwen, GLM, etc.)
- **Multimodal Support** - Image understanding and visual interaction
- **Document Parsing** - Read and understand PDF / Word / Excel files
- **Markdown Rendering** - Code syntax highlighting, tables, HTML preview

### 🎨 User Experience
- **Theme Toggle** - Seamless light/dark theme switching
- **Responsive Design** - Mobile-friendly
- **Local Storage** - Sessions saved in browser, privacy-focused
- **Conversation Management** - Edit, delete, group by date

## 🚀 Quick Start

```bash
git clone https://github.com/sk-wang/SlioChat.git
cd slio-chat
npm install
npm run dev
```

Open http://localhost:5173 and configure API URL and Key in settings.

## 📦 Build & Deploy

```bash
npm run build
```

Deploy `dist/index.html` to any static server:
- Cloudflare Pages
- Vercel
- Netlify
- GitHub Pages
- Any static file server

## 🛠 Tech Stack

- **Framework**: Svelte 5 (Runes) + TypeScript
- **Build**: Vite 6
- **Styling**: TailwindCSS 4
- **Markdown**: Marked.js + Highlight.js
- **Storage**: IndexedDB (Virtual File System)

## 🔧 Built-in Tools

| Tool | Description |
|------|-------------|
| `fs_read` | Read files from sandbox |
| `fs_write` | Write files to sandbox |
| `fs_delete` | Delete files or directories |
| `fs_list` | List directory contents |
| `fs_mkdir` | Create directories |
| `fs_move` | Move files |
| `fs_rename` | Rename files |

## 📝 Supported Models

Models with **Function Calling / Tool Use** support required:

### OpenAI
- GPT-4o / GPT-4o mini
- GPT-4.1 / GPT-4.1 mini / GPT-4.1 nano
- o1 / o1-mini / o1-pro
- o3 / o3-mini
- o4-mini

### Anthropic
- Claude 4 Opus / Claude 4 Sonnet
- Claude 3.7 Sonnet
- Claude 3.5 Sonnet / Haiku

### Google
- Gemini 2.5 Pro / Gemini 2.5 Flash
- Gemini 2.0 Flash
- Gemini 1.5 Pro / Flash

### Chinese Models
- **DeepSeek**: V3 / R1 / R1-0528
- **Qwen**: 3 / 2.5 / Qwen-Max / Qwen-Plus
- **GLM**: GLM-4 / GLM-4.5
- **Doubao**: Seed-1.6 / Seed-1.6-thinking
- **Moonshot**: Kimi k1.5
- **MiniMax**: abab7 / abab6.5s
- **Baidu**: ERNIE 4.5 / ERNIE X1

### Others
- Grok 2 / Grok 3
- Mistral Large 2
- Other OpenAI-compatible APIs with function calling support

## 📄 License

[MIT](LICENSE)
