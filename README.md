# SlioChat

SlioChat 是一个现代化的、功能丰富的单文件大模型AI聊天应用，支持多种大语言模型的对话。它的所有功能都集成在一个 HTML 文件中，可以在各种环境下方便部署。

SlioChat is a modern, feature-rich single-file large language model (LLM) AI chat application that supports conversations with multiple LLMs. All its functionalities are integrated into a single HTML file, enabling easy deployment across various environments.

## ✨ 主要特性

- 🎨 优雅的用户界面
  - 支持亮色/暗色主题切换
  - 响应式设计，完美支持移动端
  - 现代化的 UI 组件和动画效果

- 💬 完整的对话功能
  - 自动生成对话标题
  - Markdown 格式支持
  - 代码块语法高亮
  - 一键复制代码
  - 流式响应
  - 支持暂停/继续生成
  - 思考过程可视化

- 📝 消息管理
  - 支持编辑和删除消息
  - 会话记录本地存储
  - 支持导出/导入对话记录

- 🔍 联网搜索（Alpha）
  - 支持联网搜索相关信息
  - 自动引用搜索结果
  - 提供信息来源链接

- ⚙️ 个性化设置
  - 自定义系统提示词
  - 多种模型切换
  - 对话分类管理

## 🚀 快速开始

1. 配置 API
   - 在 `index.html` 中配置你的 API 密钥
   - 大模型的配置在 `models` 对象中
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
   

2. 启动应用
   - 使用任意 Web 服务器托管项目文件
   - 直接打开 `index.html` 文件（本地使用）

## 🛠️ 技术栈

- 纯原生 JavaScript
- TailwindCSS 用于样式

## 🔑 API 支持

目前可以直接体验的 API：

- 智谱 GLM - 免费模型

支持自定义添加OPENAI兼容的模型API（gpt,claude,deepseek,glm,qwen）


## 📸 截图展示

![1](https://skwang-static.oss-cn-hongkong.aliyuncs.com/img/1.png)
![2](https://skwang-static.oss-cn-hongkong.aliyuncs.com/img/2.png)

## 📝 License

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📧 联系方式

skvdhsh@gmail.com