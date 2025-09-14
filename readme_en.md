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

- 🔍 Bocha Web Search Integration (Beta)
  - Automatically determine whether internet search is needed
  - Automatically generate query for internet search
  - Integrated BochaAI search API
  - Automatic citation of search results
  - Source link references
  - Support configuring Bocha API key in settings

- ⚙️ Customizable Settings
  - Customizable system prompts
  - Online model addition and management (multi-API support)
  - Multi-model switching (instant effect)
  - Categorized conversation management

## 📁 Project Structure

```
slio-chat/
├── index.html          # Main HTML file
├── css/
│   └── main.css        # Stylesheet
├── js/
│   ├── config.js       # Configuration file
│   └── main.js         # Main functionality code
├── scripts/
│   └── build.js        # Build script
├── dist/               # Build output directory
│   └── index.html      # Packaged single file
├── package.json        # Project configuration
└── README.md
```

## 🚀 Getting Started

### Online Model Configuration (Recommended)

SlioChat supports direct configuration and management of models through the web interface without modifying code files:

1. **Open Settings Panel**
   - Click the settings icon (⚙️) in the top right corner of the page
   - Or use keyboard shortcut to open the settings panel

2. **Add New Model**
   - Click the "Add Model" button in the "Model Settings" section
   - Fill in the model information:
     - **Model ID**: Unique identifier (e.g., qwen2-72b-instruct)
     - **Display Name**: Name shown in the interface (e.g., Qwen 72B)
     - **Type**: Choose "Normal" or "Deep Thinking" type
     - **API URL**: Model's API endpoint address
     - **API Key**: Your API key

3. **Configure Bocha Search API (Optional)**
   - In the "Bocha Search API Configuration" section:
     - **API Key**: Enter your BochaAI API key
     - **Enable Toggle**: Check to enable web search functionality

4. **Save Settings**
   - After configuration, click the "Save" button at the bottom
   - The system automatically saves all settings to browser local storage

5. **Switch Models**
   - Select configured models from the dropdown above the input box
   - The system intelligently matches conversation types based on model type

**Advantages**:
- ✅ No need to restart the application, configurations take effect immediately
- ✅ Support for configuring multiple models simultaneously
- ✅ Configuration information stored locally for privacy and security
- ✅ Support for dynamic addition, deletion, and modification of models
- ✅ Visual Bocha search configuration without code modification

### Development Mode (Advanced Users)

#### Method 1: Online Configuration (Recommended)

As described above, configure models directly in the web interface.

#### Method 2: Code Configuration

1. API Configuration
   - Set your API key in `js/config.js`
   - Large model configurations are defined in the `API_CONFIG.models` object:
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
   
   **Note**: Bocha search API can now also be configured visually through the "Bocha Search API Configuration" section in the settings panel without modifying code files

2. Development Environment
   - Open `index.html` directly in your browser
   - Or host the project files using any web server

### Production Deployment

1. Install Dependencies
   ```bash
   npm install
   ```

2. Build Single-File Version
   ```bash
   npm run build
   ```

3. Deploy
   - After building, `dist/index.html` is a complete single-file application
   - Contains all CSS, JavaScript, and external dependencies
   - File size approximately 3.9MB, can be deployed directly to any web server
   - Supports offline usage (except for API calls)

### Build Features

- ✅ **Automatic Inlining**: Local CSS and JS files are automatically inlined into HTML
- ✅ **CDN Resource Inlining**: External libraries (TailwindCSS, Marked.js, etc.) are automatically downloaded and inlined
- ✅ **Code Compression**: JavaScript, CSS, and HTML are automatically compressed and optimized
- ✅ **Dependency Order**: Ensures external libraries load before local code, preventing dependency errors
- ✅ **PDF.js Optimization**: Worker scripts converted to Data URI for complete offline support

## 🛠️ Tech Stack

- Pure Native JavaScript
- TailwindCSS for styling
- Marked.js for Markdown parsing
- Highlight.js for code highlighting
- PDF.js for PDF file parsing
- Other utility libraries: XLSX, Mammoth, jschardet

## 🔑 API Support

Currently available free APIs for direct experience:

- **Qwen2-57B** - Qwen2 model (general conversation)
- **DeepSeek-R1-Distill-Qwen-32B** - DeepSeek distilled model (reasoning & thinking)

These models are pre-configured and can be used directly without API keys.

Supports custom addition of OpenAI-compatible model APIs, including:
- GPT series models
- Claude series models
- DeepSeek series models
- Zhipu GLM series models
- Qwen series models
- Other APIs compatible with OpenAI format

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