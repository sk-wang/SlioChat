# SlioChat

SlioChat 是一个现代化的、功能丰富的单文件大模型AI聊天网页UI，支持多种大语言模型的对话。它的所有功能都集成在一个 HTML 文件中，可以在各种环境下方便部署。
[English Version](readme_en.md)
[体验站点](https://slio-chat.pages.dev/)
## ✨ 主要特性

- 🎨 优雅的用户界面
  - 支持亮色/暗色主题切换
  - 响应式设计，完美支持移动端
  - 现代化的 UI 组件和动画效果

- 💬 完整的对话功能
  - 自动生成对话标题
  - 支持根据图片、PDF、Excel、Word文件对话
  - Markdown 格式支持
  - 代码块语法高亮
  - 一键复制代码
  - 流式响应
  - 支持暂停/继续生成
  - 思考过程可视化
  - 支持预览生成的html代码

- 📝 消息管理
  - 支持编辑和删除消息
  - 会话记录本地存储
  - 支持导出/导入对话记录

- 🔍 博查联网搜索（Beta）
  - 自动判断是否需要联网搜索
  - 自动生成联网搜索的query
  - 集成博查AI搜索API
  - 自动引用搜索结果
  - 提供信息来源链接
  - 支持在设置中配置博查API密钥

- ⚙️ 个性化设置
  - 自定义系统提示词
  - 在线添加和管理模型（支持多种API）
  - 多种模型切换（即时生效）
  - 对话分类管理

## 📁 项目结构

```
slio-chat/
├── index.html          # 主HTML文件
├── css/
│   └── main.css        # 样式文件
├── js/
│   ├── config.js       # 配置文件
│   └── main.js         # 主要功能代码
├── scripts/
│   └── build.js        # 构建脚本
├── dist/               # 构建输出目录
│   └── index.html      # 打包后的单文件
├── package.json        # 项目配置
└── README.md
```

## 🚀 快速开始

### 在线配置模型（推荐）

SlioChat 支持在网页界面上直接配置和管理模型，无需修改代码文件：

1. **打开设置面板**
   - 点击页面右上角的设置图标（⚙️）
   - 或使用快捷键打开设置面板

2. **添加新模型**
   - 在"模型设置"区域点击"新增模型"按钮
   - 填写模型信息：
     - **模型ID**：唯一标识符（如：qwen2-72b-instruct）
     - **显示名称**：界面显示的名称（如：通义千问72B）
     - **类型**：选择"普通"或"深度思考"类型
     - **API URL**：模型的API端点地址
     - **API Key**：你的API密钥

3. **配置博查搜索API（可选）**
   - 在"博查搜索API配置"区域：
     - **API Key**：输入博查AI的API密钥
     - **启用开关**：勾选以启用联网搜索功能

4. **保存设置**
   - 配置完成后点击底部的"保存"按钮
   - 系统会自动保存所有设置到浏览器本地存储

5. **切换模型**
   - 在输入框上方选择已配置的模型
   - 系统会根据模型类型智能匹配对话类型

**优势**：
- ✅ 无需重启应用，配置即时生效
- ✅ 支持多个模型同时配置
- ✅ 配置信息本地存储，隐私安全
- ✅ 支持动态增删改模型
- ✅ 博查搜索配置可视化，无需修改代码

### 开发模式（高级用户）

#### 方法一：在线配置（推荐）

如上所述，在网页界面上直接配置模型。

#### 方法二：代码配置

1. 配置 API
   - 在 `js/config.js` 中配置你的 API 密钥
   - 大模型的配置在 `API_CONFIG.models` 对象中
   ```javascript
   const API_CONFIG = {
        models: {
            //deepseek大模型
            'deepseek-r1': {
                name: 'deepseek-r1',
                type: 'thinking', //深度思考大模型
                url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
                key: 'xxxxxxxxxxx',  // key
            },
            'deepseek-v3': {
                name: 'deepseek-v3',
                type: 'normal',
                url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
                key: 'xxxxxxxxxxx',  // key
            },
            //免费的大模型
            "glm-4v-plus": {
                name: '智谱flash',
                type: 'normal',
                url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
                key: '4343afe401f046afa592b4fa4f33cdab.zRzWA4Thv2FYZ2ba',  // 智谱的免费模型
            },
            //可以新增更多的模型
        },
        // 设置默认使用的视觉语言模型（带视觉能力的模型）
        defaultVlm: 'qwen2.5-vl-3b-instruct', // 指定默认使用的视觉模型ID
   };
   ```
   - 搜索的api配置在 `search` 对象中
   ```javascript
    search: {
        url: 'https://api.bochaai.com/v1/web-search',
        enabled: false,  // 控制是否启用搜索功能
        token: 'xxxxxxxxx'  // bochaai的api key
    }
   ```
   获取apikey：https://open.bochaai.com/
   
   **注意**：现在也可以通过设置面板中的"博查搜索API配置"区域进行可视化配置，无需修改代码文件
   

2. 开发环境运行
   - 直接用浏览器打开 `index.html` 文件
   - 或使用任意 Web 服务器托管项目文件

### 生产部署

1. 安装依赖
   ```bash
   npm install
   ```

2. 构建单文件版本
   ```bash
   npm run build
   ```

3. 部署
   - 构建完成后，`dist/index.html` 是一个完整的单文件应用
   - 包含了所有 CSS、JavaScript 和外部依赖
   - 文件大小约 3.9MB，可直接部署到任何 Web 服务器
   - 支持离线使用（除了 API 调用）

### 构建特性

- ✅ **自动内联**：本地 CSS 和 JS 文件自动内联到 HTML 中
- ✅ **CDN 资源内联**：外部库（TailwindCSS、Marked.js 等）自动下载并内联
- ✅ **代码压缩**：JavaScript、CSS 和 HTML 自动压缩优化
- ✅ **依赖顺序**：确保外部库在本地代码之前加载，避免依赖错误
- ✅ **PDF.js 优化**：Worker 脚本转换为 Data URI，支持完全离线使用

## 🛠️ 技术栈

- 纯原生 JavaScript
- TailwindCSS 用于样式
- Marked.js 用于 Markdown 解析
- Highlight.js 用于代码高亮
- PDF.js 用于 PDF 文件解析
- 其他工具库：XLSX、Mammoth、jschardet

## 🔑 API 支持

目前可以直接体验的免费 API：

- **Qwen2-57B** - 阿里云Qwen2模型（普通对话）
- **DeepSeek-R1-Distill-Qwen-32B** - DeepSeek 蒸馏模型（思考推理）

这些模型已预配置，无需 API Key 即可直接使用。

支持自定义添加 OpenAI 兼容的模型 API，包括：
- GPT 系列模型
- Claude 系列模型  
- DeepSeek 系列模型
- 智谱 GLM 系列模型
- 通义千问系列模型
- 其他兼容 OpenAI 格式的 API


## 📸 截图展示

![1](https://skwang-static.oss-cn-hongkong.aliyuncs.com/img/1.png)
![2](https://skwang-static.oss-cn-hongkong.aliyuncs.com/img/2.png)
![3](https://skwang-static.oss-cn-hongkong.aliyuncs.com/img/3.png)

## 📝 License

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📧 联系方式

skvdhsh@gmail.com