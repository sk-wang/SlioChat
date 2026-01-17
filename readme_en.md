<div align="center">

# SlioChat

**A clean and elegant AI chat interface built with Svelte 5 + TypeScript, supporting multiple LLMs**

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Demo](https://img.shields.io/badge/Demo-Live-blue)](https://slio-chat.pages.dev/)

[中文](README.md) | [Live Demo](https://slio-chat.pages.dev/)

<img src="imgs/img.png" alt="SlioChat Interface Preview" width="800"/>

</div>

## Features

- **Theme Toggle** - Seamless light/dark theme switching
- **Responsive Design** - Mobile-friendly
- **Streaming Response** - Real-time AI replies
- **Thinking Visualization** - Display AI reasoning process
- **Markdown Rendering** - Code syntax highlighting
- **Conversation Management** - Edit, delete, group by date
- **Local Storage** - Sessions saved in browser
- **Multi-model Support** - Custom API configuration

## Quick Start

```bash
git clone https://github.com/user/slio-chat.git
cd slio-chat
npm install
npm run dev
```

Open http://localhost:5173 and configure API URL and Key in settings.

## Build & Deploy

```bash
npm run build
```

Deploy `dist/index.html` to any static server.

## Tech Stack

Svelte 5 · TypeScript · Vite · TailwindCSS · Marked.js · Highlight.js

## Supported Models

GPT · Claude · DeepSeek · Qwen · GLM · Other OpenAI-compatible APIs

## License

[MIT](LICENSE)
