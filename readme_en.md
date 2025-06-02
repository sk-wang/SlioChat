# SlioChat

SlioChat is a modern, feature-rich, single-file AI chat web UI designed for large language model interactions. All functionalities are encapsulated within a single HTML file, enabling seamless deployment across various environments.
[try it now](https://slio-chat.pages.dev/)

## ✨ Key Features

- 🎨 Elegant User Interface
  - Light/Dark theme toggle support
  - Responsive design optimized for mobile devices
  - Modern UI components with smooth animations

- 💬 Comprehensive Conversation Capabilities
  - Automatic conversation title generation
  - Support parse Image/PDF/Word/Excel File
  - Markdown formatting support
  - Syntax highlighting for code blocks
  - One-click code copying
  - Streaming responses
  - Pause/Resume response generation
  - Visualized reasoning process
  - Support preview HTML code

- 📝 Message Management
  - Edit and delete message functionality
  - Local storage for conversation history
  - Import/Export of conversation logs

- 🔍 Web Search Integration (Bata)
  - Automatically determine whether internet search is needed
  - Automatically generate query for internet search
  - Online information retrieval
  - Automatic citation of search results
  - Source link references

- ⚙️ Customizable Settings
  - Customizable system prompts
  - Multi-model switching
  - Categorized conversation management

## 🚀 Getting Started

1. API Configuration
   - Set your API key in `index.html`
   - Large model configurations are defined in the `models` object:
   ```javascript
   const API_CONFIG = {
        models: {
            // Deepseek large model
            'deepseek-r1': {
                name: 'deepseek-r1',
                type: 'thinking', // Advanced reasoning large model
                url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
                key: 'xxxxxxxxxxx',  // API key
            },
            'deepseek-v3': {
                name: 'deepseek-v3',
                type: 'normal',
                url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
                key: 'xxxxxxxxxxx',  // API key
            },
            // Free large model
            "glm-4v-plus": {
                name: 'Zhipu Flash',
                type: 'normal',
                url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
                key: '4343afe401f046afa592b4fa4f33cdab.zRzWA4Thv2FYZ2ba',  // Zhipu's free model
            },
            // Additional models can be added here
        },
        // Set the default vision language model (model with visual capabilities)
        defaultVlm: 'qwen2.5-vl-3b-instruct', // Specify the default vision model ID
   };
   ```
   - Search API configuration is located in the `search` object:
   ```javascript
    search: {
        url: 'https://api.bochaai.com/v1/web-search',
        enabled: false,  // Toggle to enable/disable search functionality
        token: 'xxxxxxxxx'  // BochaAI API key
    }
   ```
   Acquire apikey：https://open.bochaai.com/

2. Launching the Application
   - For intranet deployment, run `yarn && yarn build` and use the packaged `index.html` from the `dist` directory.
   - Alternatively, directly use the existing `index.html`.
   - Host the project files using any web server.
   - Open `index.html` locally for standalone use.

## 🛠️ Tech Stack

- Pure Native JavaScript
- TailwindCSS for styling

## 🔑 API Support

Currently supported APIs for direct use:

- GLM - Free Model
- DeepSeek-R1-Qwen-32B

OPENAI-compatible model APIs (e.g., GPT, Claude, Deepseek, GLM, Qwen).

## 📸 Screenshots

![1](https://skwang-static.oss-cn-hongkong.aliyuncs.com/img/1.png)
![2](https://skwang-static.oss-cn-hongkong.aliyuncs.com/img/2.png)
![3](https://skwang-static.oss-cn-hongkong.aliyuncs.com/img/3.png)

## 📝 License

MIT License

## 🤝 Contributions

Contributions are welcome! Feel free to submit Issues or Pull Requests.

## 📧 Contact

For inquiries, please reach out to: skvdhsh@gmail.com