<div align="center">

# 🚀 SlioChat

**Modern AI Chat UI | 现代化 AI 聊天界面**

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![GitHub Stars](https://img.shields.io/github/stars/user/slio-chat?style=social)](https://github.com/user/slio-chat)
[![Demo](https://img.shields.io/badge/Demo-Live-blue)](https://slio-chat.pages.dev/)

[中文](README.md) · [Live Demo](https://slio-chat.pages.dev/) · [Quick Start](#-quick-start) · [Features](#-key-features)

<img src="imgs/img.png" alt="SlioChat Interface Preview" width="800"/>

*A modern AI chat interface built with Svelte 5 + TypeScript*

</div>

---

## 📖 Table of Contents

- [Key Features](#-key-features)
- [Screenshots](#-screenshots)
- [Quick Start](#-quick-start)
- [Project Structure](#-project-structure)
- [Tech Stack](#️-tech-stack)
- [API Support](#-api-support)
- [Build & Deploy](#-build--deploy)
- [Contributing](#-contributing)
- [Contact](#-contact)

---

## ✨ Key Features

<table>
<tr>
<td width="50%">

### 🎨 Elegant User Interface
- 🌓 Seamless Light/Dark theme toggle
- 📱 Responsive design, mobile-ready
- ✨ Modern UI components with smooth animations

</td>
<td width="50%">

### 💬 Comprehensive Chat Features
- 🏷️ Automatic conversation title generation
- 📄 Support for image file conversations
- 📝 Markdown + Code syntax highlighting
- ⚡ Streaming responses
- 🧠 **Thinking process visualization**

</td>
</tr>
<tr>
<td width="50%">

### 📝 Message Management
- ✏️ Edit and delete messages
- 💾 Local storage for conversations
- 🗂️ Conversations grouped by date

</td>
<td width="50%">

### ⚙️ Customizable Settings
- 🤖 Multiple preset conversation types
- 🔧 Custom API configuration
- 🔄 Instant model switching

</td>
</tr>
</table>

---

## 📸 Screenshots

<div align="center">

### Dark Theme - Thinking Process Visualization

<img src="imgs/img.png" alt="SlioChat Dark Theme - Thinking Process Visualization" width="750"/>

*SlioChat dark theme interface showcasing AI thinking process, Markdown rendering, and sidebar conversation management*

</div>

---

## 🚀 Quick Start

### Development Environment

```bash
# 1. Clone the project
git clone https://github.com/user/slio-chat.git
cd slio-chat

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev

# 4. Open browser at http://localhost:5173
```

### Configure API

Configure your API in the settings panel:

| Step | Action |
|------|--------|
| 1️⃣ | Click the **Settings** button at the bottom of sidebar |
| 2️⃣ | Fill in API URL and API Key |
| 3️⃣ | Click **Save** — changes take effect immediately |

---

## 📁 Project Structure

```
slio-chat/
├── 📄 index.html              # Entry HTML
├── 📄 package.json            # Project config
├── 📄 vite.config.ts          # Vite config
├── 📄 tailwind.config.js      # Tailwind config
├── 📄 tsconfig.json           # TypeScript config
├── 📁 src/
│   ├── 📄 App.svelte          # Main app component
│   ├── 📄 app.css             # Global styles
│   ├── 📄 main.ts             # App entry point
│   └── 📁 lib/
│       ├── 📁 components/     # UI components
│       ├── 📁 services/       # API service layer
│       ├── 📁 stores/         # State management
│       ├── 📁 types/          # TypeScript types
│       └── 📁 utils/          # Utility functions
├── 📁 dist/                   # Build output
└── 📁 imgs/                   # Screenshot assets
```

---

## 🛠️ Tech Stack

<table>
<tr>
<td align="center" width="120">
<strong>Framework</strong><br/>
<sub>Svelte 5</sub>
</td>
<td align="center" width="120">
<strong>Language</strong><br/>
<sub>TypeScript</sub>
</td>
<td align="center" width="120">
<strong>Build</strong><br/>
<sub>Vite</sub>
</td>
<td align="center" width="120">
<strong>Styling</strong><br/>
<sub>TailwindCSS</sub>
</td>
</tr>
<tr>
<td align="center" width="120">
<strong>Markdown</strong><br/>
<sub>Marked.js</sub>
</td>
<td align="center" width="120">
<strong>Code Highlight</strong><br/>
<sub>Highlight.js</sub>
</td>
<td align="center" width="120">
<strong>Icons</strong><br/>
<sub>Lucide</sub>
</td>
<td align="center" width="120">
<strong>Storage</strong><br/>
<sub>IndexedDB</sub>
</td>
</tr>
</table>

---

## 🔑 API Support

### Supported Model Services

<table>
<tr>
<td>✅ GPT Series</td>
<td>✅ Claude Series</td>
<td>✅ DeepSeek Series</td>
</tr>
<tr>
<td>✅ Zhipu GLM Series</td>
<td>✅ Qwen Series</td>
<td>✅ Other OpenAI-compatible APIs</td>
</tr>
</table>

---

## 📦 Build & Deploy

### Production Build

```bash
# Build for production
npm run build

# Preview build result
npm run preview

# Deploy dist/ directory to any static server
```

---

## 📝 License

[MIT License](LICENSE) © 2024

---

## 🤝 Contributing

Issues and Pull Requests are welcome!

---

## 📧 Contact

<div align="center">

**Email**: skvdhsh@gmail.com

---

<sub>Made with ❤️ by SlioChat Team</sub>

</div>
