<div align="center">

# 🚀 SlioChat

**Modern Single-File AI Chat UI | 现代化单文件 AI 聊天界面**

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![GitHub Stars](https://img.shields.io/github/stars/user/slio-chat?style=social)](https://github.com/user/slio-chat)
[![Demo](https://img.shields.io/badge/Demo-Live-blue)](https://slio-chat.pages.dev/)

[中文](README.md) · [Live Demo](https://slio-chat.pages.dev/) · [Quick Start](#-quick-start) · [Features](#-key-features)

<img src="imgs/img.png" alt="SlioChat Interface Preview" width="800"/>

*A modern chat interface supporting multiple LLMs, all packed into a single HTML file*

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
- 📄 Support for Image, PDF, Excel, Word files
- 📝 Markdown + Code syntax highlighting
- ⚡ Streaming responses + Pause/Resume
- 🧠 **Thinking process visualization**

</td>
</tr>
<tr>
<td width="50%">

### 📝 Message Management
- ✏️ Edit and delete messages
- 💾 Local storage for conversations
- 📤 Export/Import chat history

</td>
<td width="50%">

### 🔍 Bocha Web Search <sup>Beta</sup>
- 🤖 Auto-detect when web search is needed
- 🔗 Auto-generate search queries
- 📚 Auto-cite results with source links

</td>
</tr>
<tr>
<td colspan="2">

### ⚙️ Customizable Settings
Custom system prompts · Online model management · Instant model switching · Conversation categorization

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

### Option 1: Online Configuration (Recommended)

SlioChat supports direct model configuration through the web interface — **no code changes required**:

| Step | Action |
|------|--------|
| 1️⃣ | Click the **Settings icon** ⚙️ in the top-right corner |
| 2️⃣ | Click **Add Model** in the "Model Settings" section |
| 3️⃣ | Fill in Model ID, Display Name, Type, API URL, and Key |
| 4️⃣ | (Optional) Configure Bocha Search API for web search |
| 5️⃣ | Click **Save** — changes take effect immediately |

> **✅ Advantages**: No restart needed · Multi-model support · Privacy-safe local storage · Dynamic CRUD for models

### Option 2: Code Configuration (Advanced)

<details>
<summary>📝 Click to expand code configuration guide</summary>

#### 1. Configure Model API

Edit `js/config.js`:

```javascript
const API_CONFIG = {
    models: {
        'deepseek-r1': {
            name: 'deepseek-r1',
            type: 'thinking',  // Deep thinking model
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

#### 2. Configure Bocha Search API (Optional)

```javascript
search: {
    url: 'https://api.bochaai.com/v1/web-search',
    enabled: false,
    token: 'your-bocha-api-key'  // Get it at: https://open.bochaai.com/
}
```

#### 3. Run Development Environment

Open `index.html` directly in your browser, or host with any web server.

</details>

---

## 📁 Project Structure

```
slio-chat/
├── 📄 index.html          # Main HTML file
├── 📁 css/
│   └── main.css           # Stylesheet
├── 📁 js/
│   ├── config.js          # Configuration file
│   └── main.js            # Core functionality
├── 📁 scripts/
│   └── build.js           # Build script
├── 📁 dist/               # Build output directory
│   └── index.html         # Bundled single file (~3.9MB)
├── 📁 imgs/               # Screenshot assets
└── 📄 package.json
```

---

## 🛠️ Tech Stack

<table>
<tr>
<td align="center" width="120">
<strong>Core</strong><br/>
<sub>Vanilla JS</sub>
</td>
<td align="center" width="120">
<strong>Styling</strong><br/>
<sub>TailwindCSS</sub>
</td>
<td align="center" width="120">
<strong>Markdown</strong><br/>
<sub>Marked.js</sub>
</td>
<td align="center" width="120">
<strong>Code Highlight</strong><br/>
<sub>Highlight.js</sub>
</td>
</tr>
<tr>
<td align="center" width="120">
<strong>PDF Parsing</strong><br/>
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
<strong>Encoding</strong><br/>
<sub>jschardet</sub>
</td>
</tr>
</table>

---

## 🔑 API Support

### Free Trial Models

| Model | Type | Description |
|-------|------|-------------|
| **Qwen2-57B** | General Chat | Alibaba Cloud Qwen2 model |
| **DeepSeek-R1-Distill-Qwen-32B** | Reasoning | DeepSeek distilled model |

> These models are pre-configured — **no API key required** for immediate use

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

### Production Deployment

```bash
# 1. Install dependencies
npm install

# 2. Build single-file version
npm run build

# 3. Deploy dist/index.html to any web server
```

### Build Features

| Feature | Description |
|---------|-------------|
| ✅ Auto Inlining | Local CSS and JS inlined into HTML |
| ✅ CDN Inlining | External libraries downloaded and inlined |
| ✅ Code Compression | JS, CSS, HTML auto-minified |
| ✅ Dependency Order | External libs load before local code |
| ✅ PDF.js Optimization | Worker converted to Data URI for offline |

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
