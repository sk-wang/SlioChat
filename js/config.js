const API_CONFIG = {
  defaultUrl:
    "https://0f68edf33a3a4219a5ab9d9ae6b3034c-cn-hangzhou.alicloudapi.com/compatible-mode/v1/chat/completions", //用来生成标题的 key
  defaultKey: "none", // 用来生成标题的 key
  defaultModel: "qwen2-57b-a14b-instruct", // 用来生成标题的模型
  defaultVlm: "qwen2.5-vl-3b-instruct", // 用来理解图片的模型
  defaultSystemPrompt:
    "你是一位专业、友善且富有同理心的AI助手。你会根据问题的复杂程度调整回答方式：对于复杂问题，你会条理清晰地展示思考过程并给出详细解释；对于简单问题，你会直接给出准确简洁的答案。你善于倾听用户的需求，用平易近人的语气进行交流，在必要时会主动询问以更好地理解用户意图。你的回答始终保持客观专业，并在适当时候提供有见地的建议。",
  models: {
    //deepseek蒸馏模型
    "deepseek-r1-distill-qwen-32b": {
      name: "r1-fast",
      type: "thinking",
      url: "https://0f68edf33a3a4219a5ab9d9ae6b3034c-cn-hangzhou.alicloudapi.com/compatible-mode/v1/chat/completions",
      key: "none",
    },
    //免费的大模型
    "qwen2-57b-a14b-instruct": {
      name: "qwen2-57b",
      type: "normal",
      url: "https://0f68edf33a3a4219a5ab9d9ae6b3034c-cn-hangzhou.alicloudapi.com/compatible-mode/v1/chat/completions",
      key: "none", // 智谱的免费模型
    },
    //可以新增更多的模型
  },
  contextCount: 20, // 设置上下文消息数量
  chatTypes: {
    normal: {
      name: "普通对话",
      systemPrompt:
        "你是一位专业、友善且富有同理心的AI助手。你会根据问题的复杂程度调整回答方式：对于复杂问题，你会条理清晰地展示思考过程并给出详细解释；对于简单问题，你会直接给出准确简洁的答案。你善于倾听用户的需求，用平易近人的语气进行交流，在必要时会主动询问以更好地理解用户意图。你的回答始终保持客观专业，并在适当时候提供有见地的建议。",
    },
    translator: {
      name: "翻译助手",
      systemPrompt:
        "你是一个好用的翻译助手。请将我的中文翻译成英文，将所有非中文的翻译成中文。我发给你所有的话都是需要翻译的内容，你只需要回答翻译结果。翻译结果请符合中文的语言习惯。",
    },
    it: {
      name: "IT专家",
      systemPrompt:
        "我希望你充当 IT 专家。我会向您提供有关我的技术问题所需的所有信息，而您的职责是解决我的问题。你应该使用你的项目管理知识，敏捷开发知识来解决我的问题。在您的回答中使用适合所有级别的人的智能、简单和易于理解的语言将很有帮助。用要点逐步解释您的解决方案很有帮助。我希望您回复解决方案，而不是写任何解释。",
    },
    redbook: {
      name: "小红书文案生成",
      systemPrompt:
        "小红书的风格是：很吸引眼球的标题，每个段落都加 emoji, 最后加一些 tag。请用小红书风格",
    },
    midjourney: {
      name: "MJ提示词大师",
      systemPrompt: `从现在开始，你是一名中英翻译，你会根据我输入的中文内容，翻译成对应英文。请注意，你翻译后的内容主要服务于一个绘画AI，它只能理解具象的描述而非抽象的概念，同时根据你对绘画AI的理解，比如它可能的训练模型、自然语言处理方式等方面，进行翻译优化。由于我的描述可能会很散乱，不连贯，你需要综合考虑这些问题，然后对翻译后的英文内容再次优化或重组，从而使绘画AI更能清楚我在说什么。请严格按照此条规则进行翻译，也只输出翻译后的英文内容。 例如，我输入：一只想家的小狗。
你不能输出：
/imagine prompt:
A homesick little dog.
你必须输出：
/imagine prompt:
A small dog that misses home, with a sad look on its face and its tail tucked between its legs. It might be standing in front of a closed door or a gate, gazing longingly into the distance, as if hoping to catch a glimpse of its beloved home.
如果你明白了，请回复"我准备好了"，当我输入中文内容后，请以"/imagine prompt:"作为开头，翻译我需要的英文内容。
             `,
    },
  },
  search: {
    url: "https://api.bochaai.com/v1/web-search",
    enabled: false, // 控制是否启用搜索功能
    token: "xxxxxxxxx", // bochaai的api key
  },
};

// Markdown 配置
marked.setOptions({
  breaks: true,
  gfm: true,
  highlight: function (code, language) {
    if (language && hljs.getLanguage(language)) {
      try {
        return hljs.highlight(code, { language }).value;
      } catch (err) {}
    }
    return code;
  },
  langPrefix: "hljs language-",
});

function processMathJax(element) {
  //TODO
  return;
}

// 状态变量
let currentEditingMessage = null;
let currentConversationId = null;
let conversations = JSON.parse(localStorage.getItem("conversations") || "{}");
console.log(localStorage.getItem("conversations"));
let isPaused = false;
let currentRequestController = null;
let isGenerating = false;
let autoScroll = true;

// 主题管理
const themeToggle = document.getElementById("theme-toggle");
const html = document.documentElement;
const thinkingHtml = `
                             <div class="think-container">
                                 <div class="think-header" onclick="toggleThinking(this)">
                                     <svg class="think-header-icon w-4 h-4 text-[var(--text-secondary)]" viewBox="0 0 20 20" fill="currentColor" style="transform: rotate(0deg);">
                                         <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                                     </svg>
                                     <span class="text-[var(--text-secondary)]">🤔 思考过程</span>
                                 </div>
                                 <div class="think-content" style="display: block;">
                                     <div class="markdown-body text-[var(--text-primary)]"></div>
                                 </div>
                             </div>
                             <div class="response-content markdown-body text-[var(--text-primary)] mt-4"></div>`;
