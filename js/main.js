function initializeTheme() {
  html.classList.remove("no-transition");

  const userPreference = localStorage.getItem("theme");
  const systemPreference = window.matchMedia(
    "(prefers-color-scheme: dark)",
  ).matches;

  if (userPreference === "dark" || (!userPreference && systemPreference)) {
    html.classList.add("dark");
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    html.classList.remove("dark");
    document.documentElement.setAttribute("data-theme", "light");
  }
  updateThemeIcons();
}

function toggleTheme() {
  html.classList.add("no-transition");

  const isDark = html.classList.contains("dark");
  if (isDark) {
    html.classList.remove("dark");
    document.documentElement.setAttribute("data-theme", "light");
    localStorage.setItem("theme", "light");
  } else {
    html.classList.add("dark");
    document.documentElement.setAttribute("data-theme", "dark");
    localStorage.setItem("theme", "dark");
  }

  void html.offsetHeight;

  html.classList.remove("no-transition");

  showThemeToast(!isDark);
  updateThemeIcons();
}

function showThemeToast(isDark) {
  const existingToast = document.querySelector(".theme-toast");
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement("div");
  toast.className = "theme-toast";
  toast.textContent = `已切换至${isDark ? "暗色" : "亮色"}主题`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

function updateThemeIcons() {
  const darkIcon = document.getElementById("dark-icon");
  const lightIcon = document.getElementById("light-icon");
  
  // 确保DOM元素存在
  if (!darkIcon || !lightIcon) {
    console.warn('主题图标元素未找到，跳过主题图标更新');
    return;
  }
  
  const isDark = html.classList.contains("dark");
  darkIcon.style.display = isDark ? "block" : "none";
  lightIcon.style.display = isDark ? "none" : "block";
}

// 确保在运行时已正确配置 PDF.js worker
function ensurePdfWorkerConfigured() {
  try {
    if (typeof pdfjsLib !== 'undefined') {
      const hasGlobal = pdfjsLib.GlobalWorkerOptions && pdfjsLib.GlobalWorkerOptions.workerSrc;
      if (!hasGlobal) {
        // 运行时兜底：设置为CDN地址。构建时会被替换为 data URI，离线可用
        pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      }
    }
  } catch (_) {}
}

// 移动端菜单控制
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  sidebar.classList.toggle("active");
  overlay.classList.toggle("active");
}

// PC端侧边栏控制
function togglePCSidebar() {
  const sidebar = document.getElementById("sidebar");
  const mainContent = document.querySelector(".main-content");

  sidebar.classList.toggle("collapsed");
  mainContent.classList.toggle("sidebar-collapsed");

  // 保存侧边栏状态到本地存储
  const isCollapsed = sidebar.classList.contains("collapsed");
  localStorage.setItem("pc-sidebar-collapsed", isCollapsed);
}

// 初始化应用
function initialize() {
  initializeTheme();

  // 初始化模型选择下拉框
  const modelSelect = document.getElementById("model-select");
  if (modelSelect) {
    refreshModelSelectOptions();
  } else {
    console.warn('模型选择下拉框元素未找到');
  }

  // 如果没有对话，创建一个新对话
  if (Object.keys(conversations).length === 0) {
    const conversationId = "conv_" + Date.now();
    conversations[conversationId] = {
      title: "普通对话 1",
      messages: [],
      systemPrompt: API_CONFIG.chatTypes.normal.systemPrompt,
      type: "normal",
    };
    saveConversations();
    currentConversationId = conversationId;
  } else {
    // 优先使用上一次选中的对话
    const lastSelectedId = localStorage.getItem("lastSelectedConversation");
    if (lastSelectedId && conversations[lastSelectedId]) {
      currentConversationId = lastSelectedId;
    } else {
      // 如果没有上次选中的对话或该对话已被删除，使用最新的对话
      currentConversationId = Object.keys(conversations)[0];
    }
  }

  // 刷新对话列表和消息
  refreshConversationList();
  // 先刷新消息，然后等待渲染完成后滚动
  refreshMessages();
  scrollWhenReady();

  // 更新当前对话标题
  const currentTitleElement = document.getElementById("current-conversation-title");
  if (currentTitleElement) {
    currentTitleElement.textContent = conversations[currentConversationId].title;
  }

  // 设置事件监听器
  const menuToggle = document.getElementById("menu-toggle");
  if (menuToggle) {
    menuToggle.addEventListener("click", toggleSidebar);
  }
  
  if (themeToggle) {
    themeToggle.addEventListener("click", toggleTheme);
  }

  // 监听系统主题变化
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", (e) => {
      if (!localStorage.getItem("theme")) {
        if (e.matches) {
          html.classList.add("dark");
          document.documentElement.setAttribute("data-theme", "dark");
        } else {
          html.classList.remove("dark");
          document.documentElement.setAttribute("data-theme", "light");
        }
        updateThemeIcons();
      }
    });

  // 监听输入框回车事件
  const userInput = document.getElementById("user-input");
  if (userInput) {
    userInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && e.ctrlKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  // 修改滚动监听器
  const chatContainer = document.getElementById("chat-container");
  if (chatContainer) {
    chatContainer.addEventListener("scroll", function () {
      const scrollButton = document.getElementById("scroll-to-bottom-btn");
      if (scrollButton) {
        const isNearBottom =
          this.scrollHeight - this.scrollTop - this.clientHeight < 100;
        scrollButton.classList.toggle("visible", !isNearBottom);
        // 当用户向上滚动时，禁用自动滚动
        if (!isNearBottom) {
          autoScroll = false;
        }
        // 当用户滚动到底部时，重新启用自动滚动
        if (isNearBottom) {
          autoScroll = true;
        }
      }
    });
  }

  // 恢复上次选择的模型
  const savedModel = localStorage.getItem("preferred-model");
  if (savedModel && API_CONFIG.models[savedModel]) {
    modelSelect.value = savedModel;
  } else {
    modelSelect.value = API_CONFIG.defaultModel;
  }

  // 初始化时更新模型按钮可见性
  updateModelButtonsVisibility();

  // 恢复PC端侧边栏状态
  const isPCSidebarCollapsed =
    localStorage.getItem("pc-sidebar-collapsed") === "true";
  if (isPCSidebarCollapsed) {
    const sidebar = document.getElementById("sidebar");
    const mainContent = document.querySelector(".main-content");
    sidebar.classList.add("collapsed");
    mainContent.classList.add("sidebar-collapsed");
  }
}

function refreshModelSelectOptions() {
  const modelSelect = document.getElementById("model-select");
  if (!modelSelect) return;
  modelSelect.innerHTML = "";
  Object.entries(API_CONFIG.models).forEach(([modelId, modelInfo]) => {
    const option = document.createElement("option");
    option.value = modelId;
    option.id = `model-${modelId}`;
    option.textContent = modelInfo.name;
    modelSelect.appendChild(option);
  });
  // 恢复选中
  const savedModel = localStorage.getItem("preferred-model");
  if (savedModel && API_CONFIG.models[savedModel]) {
    modelSelect.value = savedModel;
  } else if (API_CONFIG.defaultModel && API_CONFIG.models[API_CONFIG.defaultModel]) {
    modelSelect.value = API_CONFIG.defaultModel;
  } else {
    const first = Object.keys(API_CONFIG.models)[0];
    if (first) {
      modelSelect.value = first;
      localStorage.setItem("preferred-model", first);
      API_CONFIG.defaultModel = first;
    }
  }
}

// 添加新的滚动函数
function scrollWhenReady() {
  const isWechat = /MicroMessenger/i.test(navigator.userAgent);
  if (isWechat) return;

  // 使用 requestAnimationFrame 确保在下一帧渲染时执行
  requestAnimationFrame(() => {
    const messagesDiv = document.getElementById("messages");
    const chatContainer = document.getElementById("chat-container");

    if (messagesDiv.children.length > 0) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    } else {
      // 如果还没有渲染完成，使用 MutationObserver 继续监听
      const observer = new MutationObserver((mutations, obs) => {
        if (messagesDiv.children.length > 0) {
          chatContainer.scrollTop = chatContainer.scrollHeight;
          obs.disconnect();
        }
      });

      observer.observe(messagesDiv, {
        childList: true,
        subtree: true,
      });
    }
  });
}

// 对话管理功能
async function createNewConversation() {
  // 显示对话类型选择对话框
  const type = await showChatTypeDialog();
  if (!type) return; // 用户取消了选择

  // 保存当前的待上传文件
  const currentPendingFiles = [...(window.pendingFiles || [])];

  const conversationId = "conv_" + Date.now();
  // 根据对话类型设置标题
  const typeName = API_CONFIG.chatTypes[type].name;
  const count =
    Object.values(conversations).filter((conv) => conv.type === type).length +
    1;
  const title = `${typeName} ${count}`;

  conversations[conversationId] = {
    title: title,
    messages: [],
    systemPrompt: API_CONFIG.chatTypes[type].systemPrompt,
    type: type,
  };
  saveConversations();
  switchConversation(conversationId);
  refreshConversationList();
  updateModelButtonsVisibility();

  // 恢复待上传文件的显示
  if (currentPendingFiles.length > 0) {
    displayPendingFiles(currentPendingFiles);
  } else {
    // 如果没有待上传文件，清除所有文件预览
    const filePreviews = document.querySelectorAll(".file-preview");
    filePreviews.forEach((preview) => preview.remove());
  }

  // 在手机端自动收起侧边栏
  if (window.innerWidth < 768) {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebar-overlay");
    sidebar.classList.remove("active");
    overlay?.classList.remove("active");
  }
}

function switchConversation(conversationId) {
  // 如果正在生成，不允许切换对话
  if (isGenerating) {
    return;
  }

  // 保存当前的待上传文件
  const currentPendingFiles = [...(window.pendingFiles || [])];

  // 移除之前的选中状态
  const previousActive = document.querySelector(".conversation-item.active");
  if (previousActive) {
    previousActive.classList.remove("active");
  }

  currentConversationId = conversationId;
  // 保存当前选中的对话ID
  localStorage.setItem("lastSelectedConversation", conversationId);

  document.getElementById("current-conversation-title").textContent =
    conversations[conversationId].title;
  document.getElementById("title-input").classList.add("hidden");
  document
    .getElementById("current-conversation-title")
    .classList.remove("hidden");
  refreshMessages();

  // 恢复待上传文件的显示
  if (currentPendingFiles.length > 0) {
    displayPendingFiles(currentPendingFiles);
  } else {
    // 如果没有待上传文件，清除所有文件预览
    const filePreviews = document.querySelectorAll(".file-preview");
    filePreviews.forEach((preview) => preview.remove());
  }

  // 检查是否在微信浏览器中
  scrollWhenReady();

  // 添加新的选中状态
  const newActive = document.querySelector(
    `.conversation-item[data-id="${conversationId}"]`,
  );
  if (newActive) {
    newActive.classList.add("active");
  }

  // 检查当前选中的模型是否与对话类型匹配
  const currentType = getConversationType(
    conversations[conversationId]?.messages,
  );
  const activeModel = document
    .querySelector(".model-btn.active")
    ?.onclick.toString()
    .match(/'([^']+)'/)?.[1];

  if (
    currentType !== "none" &&
    (!activeModel ||
      API_CONFIG.models[activeModel].type !==
        (currentType === "deepseek" ? "thinking" : "normal"))
  ) {
    // 自动选择匹配类型的第一个模型
    const matchingModel = Object.entries(API_CONFIG.models).find(
      ([_, info]) =>
        info.type === (currentType === "deepseek" ? "thinking" : "normal"),
    )?.[0];
    if (matchingModel) {
      switchModel(matchingModel);
    }
  }

  // 更新模型按钮的可见性
  updateModelButtonsVisibility();

  // 在手机端自动收起侧边栏
  if (window.innerWidth < 768) {
    // 768px 是 md 断点
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebar-overlay");
    sidebar.classList.remove("active");
    overlay?.classList.remove("active");
  }
}

async function deleteConversation(conversationId, event) {
  event.stopPropagation();
  if (!(await showDialog("删除确认", "确定要删除这个对话吗？"))) return;

  if (currentConversationId === conversationId) {
    const remainingIds = Object.keys(conversations);
    const currentIndex = remainingIds.indexOf(conversationId);
    // 获取前一个对话的 ID，如果没有前一个则获取下一个
    const nextId =
      remainingIds[currentIndex - 1] || remainingIds[currentIndex + 1];

    delete conversations[conversationId];
    saveConversations();

    if (nextId) {
      switchConversation(nextId);
    } else {
      createNewConversation();
    }
  } else {
    delete conversations[conversationId];
    saveConversations();
  }

  refreshConversationList();
}

function refreshConversationList() {
  const listElement = document.getElementById("conversation-list");
  listElement.innerHTML = "";

  // 获取当前时间
  const now = new Date();

  // 分组对话
  const groups = {
    today: { label: "今天", items: [] },
    week: { label: "最近一周", items: [] },
    earlier: { label: "更早", items: [] },
  };

  // 将对话按时间戳分组
  Object.entries(conversations).forEach(([id, conv]) => {
    // 从 ID 中提取时间戳
    const timestamp = parseInt(id.split("_")[1]);
    const date = new Date(timestamp);
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays < 1) {
      groups.today.items.push({ id, conv });
    } else if (diffDays <= 7) {
      groups.week.items.push({ id, conv });
    } else {
      groups.earlier.items.push({ id, conv });
    }
  });

  // 在每个组内按时间戳倒序排序
  Object.values(groups).forEach((group) => {
    group.items.sort((a, b) => {
      const timeA = parseInt(a.id.split("_")[1]);
      const timeB = parseInt(b.id.split("_")[1]);
      return timeB - timeA;
    });
  });

  // 渲染分组
  Object.values(groups).forEach((group) => {
    if (group.items.length > 0) {
      // 添加分组标题
      const groupTitle = document.createElement("div");
      groupTitle.className =
        "px-4 py-1.5 text-xs text-[var(--text-secondary)] opacity-75";
      groupTitle.textContent = group.label;
      listElement.appendChild(groupTitle);

      // 渲染组内对话
      group.items.forEach(({ id, conv }) => {
        const item = document.createElement("div");
        item.setAttribute("data-id", id);
        item.className = `conversation-item p-4 flex justify-between items-center ${
          isGenerating && id === currentConversationId
            ? "cursor-pointer"
            : isGenerating
              ? "opacity-50 cursor-not-allowed"
              : "cursor-pointer"
        } ${currentConversationId === id ? "active" : ""}`;

        const titleDiv = document.createElement("div");
        titleDiv.className = "flex-1 truncate mr-2";
        titleDiv.textContent = conv.title;
        item.onclick = (e) => {
          if (!e.target.closest("button") && !isGenerating) {
            switchConversation(id);
          }
        };

        const deleteButton = document.createElement("button");
        deleteButton.className =
          "p-1 text-[var(--text-secondary)] hover:text-red-500 hover:bg-[var(--hover-bg)] rounded transition-colors";
        deleteButton.innerHTML = `
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                `;
        deleteButton.title = "删除对话";
        deleteButton.onclick = (e) => deleteConversation(id, e);

        item.appendChild(titleDiv);
        item.appendChild(deleteButton);
        listElement.appendChild(item);
      });
    }
  });
}

function saveConversations() {
  localStorage.setItem("conversations", JSON.stringify(conversations));
}

function createMessageElement(role, index) {
  const messageDiv = document.createElement("div");
  messageDiv.className = `message-container rounded-lg ${
    role === "user"
      ? "bg-[var(--message-bg-user)] ml-0 md:ml-12 py-3 px-4" // 用户消息使用更紧凑的垂直内边距
      : "bg-[var(--message-bg-assistant)] mr-0 md:mr-12 p-4" // 助手消息保持原有内边距
  }`;
  messageDiv.dataset.index = index;

  const containerDiv = document.createElement("div");
  containerDiv.className = "flex items-start space-x-4";

  const avatar = document.createElement("div");
  avatar.className = `w-8 h-8 rounded-full flex items-center justify-center ${
    role === "user" ? "bg-gray-500" : "bg-blue-600"
  }`;

  if (role === "user") {
    avatar.innerHTML = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' class="w-5 h-5"><path d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'/><circle cx='12' cy='7' r='4'/></svg>`;
  } else {
    avatar.innerHTML = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' class="w-5 h-5"><path d='M12 2C6.5 2 2 6.5 2 12s4.5 10 10 11c.9 0 1.8-.1 2.6-.4'/><path d='M17.6 14.2c-.8.8-1.3 2-1.1 3.2.2 1.2 1.1 2.2 2.3 2.4 1.2.2 2.4-.3 3.2-1.1.8-.8 1.3-2 1.1-3.2-.2-1.2-1.1-2.2-2.3-2.4-1.2-.2-2.4.3-3.2 1.1z'/><path d='M9.4 9.8c.8-.8 1.3-2 1.1-3.2-.2-1.2-1.1-2.2-2.3-2.4-1.2-.2-2.4.3-3.2 1.1-.8.8-1.3 2-1.1 3.2.2 1.2 1.1 2.2 2.3 2.4 1.2.2 2.4-.3 3.2-1.1z'/><path d='M14.5 8.5l-5 7'/></svg>`;
  }

  const contentContainer = document.createElement("div");
  contentContainer.className = "flex-1 min-w-0";

  const actionsDiv = document.createElement("div");
  actionsDiv.className = "message-actions flex space-x-2";

  // 添加复制按钮
  const copyButton = document.createElement("button");
  copyButton.className =
    "p-1 text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] rounded";
  copyButton.innerHTML = `
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
        </svg>
    `;
  copyButton.title = "复制消息";
  copyButton.onclick = (e) => {
    e.stopPropagation();
    const content =
      conversations[currentConversationId].messages[index].content;
    navigator.clipboard.writeText(content).then(() => {
      // 显示复制成功的 toast
      const toast = document.createElement("div");
      toast.className = "copy-toast";
      toast.innerHTML = `
                <svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>复制成功</span>
            `;
      document.body.appendChild(toast);

      // 2秒后移除 toast
      setTimeout(() => {
        toast.remove();
      }, 2000);
    });
  };
  actionsDiv.appendChild(copyButton);

  // 编辑按钮
  const editButton = document.createElement("button");
  editButton.className =
    "p-1 text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] rounded";
  editButton.innerHTML = `
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
    `;
  editButton.title = "编辑消息";
  editButton.onclick = () => openEditModal(index);

  // 重新生成按钮（仅对最后一条助手消息显示）
  if (
    role === "assistant" &&
    index === conversations[currentConversationId].messages.length - 1
  ) {
    const regenerateButton = document.createElement("button");
    regenerateButton.className =
      "p-1 text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] rounded";
    regenerateButton.innerHTML = `
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
        `;
    regenerateButton.title = "重新生成";
    regenerateButton.onclick = () => regenerateMessage(index);
    actionsDiv.appendChild(regenerateButton);
  }

  const deleteButton = document.createElement("button");
  deleteButton.className =
    "p-1 text-[var(--text-secondary)] hover:text-red-500 hover:bg-[var(--hover-bg)] rounded transition-colors";
  deleteButton.innerHTML = `
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
    `;
  deleteButton.title = "删除消息";
  deleteButton.onclick = () => deleteMessage(index);

  actionsDiv.appendChild(editButton);
  actionsDiv.appendChild(deleteButton);

  const textDiv = document.createElement("div");
  textDiv.className = "markdown-body text-[var(--text-primary)]";

  contentContainer.appendChild(actionsDiv);
  contentContainer.appendChild(textDiv);

  containerDiv.appendChild(avatar);
  containerDiv.appendChild(contentContainer);
  messageDiv.appendChild(containerDiv);

  document.getElementById("messages").appendChild(messageDiv);
  return textDiv;
}

function refreshMessages() {
  const messagesDiv = document.getElementById("messages");
  messagesDiv.innerHTML = "";

  // 不在这里清除文件预览，因为我们需要保留它们
  // 文件预览会在切换对话或创建新对话时通过displayPendingFiles函数处理

  if (currentConversationId && conversations[currentConversationId]) {
    conversations[currentConversationId].messages.forEach((msg, index) => {
      const textDiv = createMessageElement(msg.role, index);
      if (msg.role === "assistant" && msg.type === "thinking") {
        try {
          const parsedContent = JSON.parse(msg.content);
          const { thinking: thinkingContent, content: finalContent } =
            parsedContent;
          if (thinkingContent) {
            // 如果有思考过程，显示完整的思考+回答结构
            const container = document.createElement("div");
            container.style.marginLeft = "-2.2rem";
            container.style.marginTop = "1rem";
            container.innerHTML = thinkingHtml;

            textDiv.appendChild(container);
            const reasoningDiv = container.querySelector(
              ".think-content .markdown-body",
            );
            const contentDiv = container.querySelector(".response-content");
            reasoningDiv.innerHTML = marked.parse(thinkingContent);
            contentDiv.innerHTML = marked.parse(finalContent);

            // 处理数学公式
            processMathJax(reasoningDiv);
            processMathJax(contentDiv);
          }
        } catch (error) {
          // 如果解析失败，作为普通消息显示
          const container = document.createElement("div");
          container.style.marginLeft = "-2.2rem";
          container.style.marginTop = "1rem";
          container.className = "markdown-body text-[var(--text-primary)]";
          container.innerHTML = marked.parse(msg.content);
          textDiv.appendChild(container);

          // 处理数学公式
          processMathJax(container);
        }
      } else {
        const container = document.createElement("div");
        container.style.marginLeft = "-2.2rem";
        container.style.marginTop = "1rem";
        container.className = "markdown-body text-[var(--text-primary)]";
        container.innerHTML = marked.parse(msg.content || "");
        textDiv.appendChild(container);

        // 处理数学公式
        processMathJax(container);
      }

      textDiv.querySelectorAll("pre code").forEach((block) => {
        hljs.highlightElement(block);
        addCopyButton(block);
      });
    });
    // 确保所有代码块都正确高亮
    messagesDiv.querySelectorAll("pre code").forEach((block) => {
      hljs.highlightElement(block);
      addCopyButton(block);
    });
    scrollToBottom();
  }
}

function addCopyButton(block) {
  // 添加复制按钮到代码块
  const pre = block.parentElement;

  // 检查是否为HTML代码块
  const isHtmlCode =
    block.classList.contains("language-html") ||
    block.classList.contains("hljs-html") ||
    block.parentElement.querySelector('code[class*="language-html"]') ||
    /^<!DOCTYPE html|<html|<\!DOCTYPE/i.test(block.textContent.trim());

  // 添加HTML预览按钮
  if (isHtmlCode) {
    const previewButton = document.createElement("button");
    previewButton.className = "html-preview-btn";
    previewButton.innerHTML = `
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
        `;
    previewButton.title = "预览HTML";
    previewButton.onclick = (e) => {
      e.stopPropagation();
      showHtmlPreview(block.textContent);
    };
    pre.appendChild(previewButton);
  }

  const copyButton = document.createElement("button");
  copyButton.className = "code-copy-btn";
  copyButton.innerHTML = `
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
        </svg>
    `;
  copyButton.title = "复制代码";
  copyButton.onclick = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(block.textContent).then(() => {
      // 显示复制成功的 toast
      const toast = document.createElement("div");
      toast.className = "copy-toast";
      toast.innerHTML = `
                <svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>代码已复制</span>
            `;
      document.body.appendChild(toast);

      // 2秒后移除 toast
      setTimeout(() => {
        toast.remove();
      }, 2000);

      // 按钮视觉反馈
      copyButton.classList.add("copied");
      setTimeout(() => {
        copyButton.classList.remove("copied");
      }, 1000);
    });
  };
  pre.appendChild(copyButton);
}

// 添加搜索函数
async function performSearch(query) {
  try {
    const response = await fetch(API_CONFIG.search.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_CONFIG.search.token}`,
      },
      body: JSON.stringify({
        query,
        freshness: "oneWeek",
        summary: true,
      }),
    });

    if (!response.ok) {
      throw new Error("Search request failed");
    }

    const data = await response.json();
    return data.data.webPages.value || [];
  } catch (error) {
    console.error("Search error:", error);
    return [];
  }
}

// 提取生成消息的公共方法
async function generateAssistantMessage(
  messages,
  assistantDiv,
  previousMessages = null,
) {
  let finalContent = "";
  let isThinking = false;
  let thinkingContent = "";
  let firstTokenReceived = false;

  // 添加加载动画
  assistantDiv.style.marginLeft = "-2.2rem";
  assistantDiv.style.marginTop = "1rem";
  assistantDiv.innerHTML = `
        <div class="loading-dots">
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
        </div>`;

  try {
    const modelId = document.getElementById("model-select").value;
    const modelConfig = API_CONFIG.models[modelId];
    const response = await fetch(modelConfig.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${modelConfig.key || API_CONFIG.defaultKey}`,
        "X-DashScope-SSE": "enable",
      },
      signal: currentRequestController.signal,
      body: JSON.stringify({
        model: modelId,
        messages: messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`请求失败: ${response.status} ${errorText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n");

      if (isPaused) {
        const waitForResume = async () => {
          while (isPaused) {
            if (!currentRequestController) return false;
            await new Promise((resolve) => setTimeout(resolve, 10));
          }
          return true;
        };

        const shouldContinue = await waitForResume();
        if (!shouldContinue) return;
      }

      let isDone = false;
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine === "data: [DONE]") {
          isDone = true;
          break;
        } else if (trimmedLine.startsWith("data:")) {
          try {
            const data = JSON.parse(trimmedLine.slice(5));
            if (data.choices && data.choices[0]) {
              const delta = data.choices[0].delta;
              const content = delta.content || delta.reasoning_content;

              if (content) {
                // 移除加载动画
                if (!firstTokenReceived) {
                  firstTokenReceived = true;
                  assistantDiv.innerHTML = "";
                }

                if (delta.reasoning_content) {
                  if (!isThinking) {
                    isThinking = true;
                    thinkingContent = "";
                    assistantDiv.innerHTML = thinkingHtml;
                  }
                  thinkingContent += content;
                  const reasoningDiv = assistantDiv.querySelector(
                    ".think-content .markdown-body",
                  );
                  reasoningDiv.innerHTML = marked.parse(thinkingContent);

                  // 确保在思考过程更新时也滚动到底部
                  if (autoScroll) {
                    const chatContainer =
                      document.getElementById("chat-container");
                    requestAnimationFrame(() => {
                      chatContainer.scrollTop = chatContainer.scrollHeight;
                    });
                  }
                } else {
                  if (!finalContent && !isThinking) {
                    // 如果是第一条内容且没有思考过程，创建普通响应容器
                    assistantDiv.style.marginLeft = "-2.2rem";
                    assistantDiv.style.marginTop = "1rem";
                    assistantDiv.innerHTML = `<div class="markdown-body text-[var(--text-primary)]"></div>`;
                  }
                  finalContent += content;

                  // 检查是否正在构建链接
                  const isInLink = /\[([^\]]+)?(\]\([^\)]*)?$/.test(
                    finalContent,
                  );
                  const contentDiv = isThinking
                    ? assistantDiv.querySelector(".response-content")
                    : assistantDiv.querySelector(".markdown-body");

                  // 只有在不在链接中时才渲染
                  if (!isInLink) {
                    contentDiv.innerHTML = marked.parse(finalContent);
                    // 重新应用代码高亮和复制按钮
                    contentDiv.querySelectorAll("pre code").forEach((block) => {
                      hljs.highlightElement(block);
                      addCopyButton(block);
                    });
                  }

                  if (autoScroll) {
                    scrollToBottom(true);
                  }
                }
              }
            }
          } catch (e) {
            console.error("Error parsing SSE data:", e);
          }
        }
      }
      if (isDone) {
        break;
      }
    }

    let fullContent = "";
    if (thinkingContent) {
      fullContent = JSON.stringify({
        thinking: thinkingContent,
        content: finalContent,
      });
    } else {
      fullContent = finalContent;
    }

    return {
      role: "assistant",
      type: thinkingContent ? "thinking" : "normal",
      content: fullContent,
    };
  } catch (error) {
    if (error.name === "AbortError") {
      console.log("请求被取消");
      return null;
    } else {
      // 显示错误提示
      const toast = document.createElement("div");
      toast.className =
        "fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50";
      toast.textContent = error.message || "请求失败，请稍后重试";
      document.body.appendChild(toast);

      setTimeout(() => {
        toast.remove();
      }, 3000);

      // 恢复到发送消息前的状态
      if (previousMessages) {
        conversations[currentConversationId].messages = previousMessages;
        refreshMessages();
      }

      return null;
    }
  }
}

// 重新生成消息
async function regenerateMessage(index) {
  if (isGenerating) return;

  // 检查是否是最后一条消息
  if (index !== conversations[currentConversationId].messages.length - 1) {
    showAlert("只能重新生成最后一条消息");
    return;
  }

  // 获取用户消息
  const userMessage = conversations[currentConversationId].messages[index - 1];
  if (!userMessage || userMessage.role !== "user") {
    showAlert("无法重新生成此消息");
    return;
  }

  // 保存当前状态
  const previousMessages = [...conversations[currentConversationId].messages];

  // 删除当前的助手回复
  conversations[currentConversationId].messages.splice(index, 1);

  // 初始化生成状态
  if (currentRequestController) {
    currentRequestController.abort();
  }
  currentRequestController = new AbortController();
  toggleSendStopButton(true);
  isGenerating = true;
  refreshConversationList();

  // 刷新消息显示，删除原来的消息
  refreshMessages();

  // 创建新的助手消息元素
  const assistantDiv = createMessageElement("assistant", index);

  // 准备消息上下文
  const messages = getMessagesWithContext();

  // 生成新的回复
  const newMessage = await generateAssistantMessage(
    messages,
    assistantDiv,
    previousMessages,
  );

  if (newMessage) {
    conversations[currentConversationId].messages.push(newMessage);
    saveConversations();
  }

  // 重置状态
  currentRequestController = null;
  toggleSendStopButton(false);
  isGenerating = false;
  refreshConversationList();
  refreshMessages();
}

// 修改 sendMessage 函数，使用新的 generateAssistantMessage 方法
async function sendMessage(autoSend = false) {
  const input = document.getElementById("user-input");
  const message = input.value.trim();
  const pendingFiles = window.pendingFiles;

  // 如果既没有消息也没有待发送的文件，则返回
  if (
    (!message && (!pendingFiles || pendingFiles.length === 0)) ||
    isGenerating
  )
    return;

  if (!autoSend) {
    input.value = "";
  }

  // 移除文件预览
  const filePreviews = document.querySelectorAll(".file-preview");
  filePreviews.forEach((preview) => preview.remove());

  // 构建完整的用户消息
  let fullMessage = "";
  if (pendingFiles && pendingFiles.length > 0) {
    if (pendingFiles.length === 1) {
      fullMessage = `我上传了一个文件：${pendingFiles[0].fileName}\n\n\`\`\`\n${pendingFiles[0].content}\n\`\`\``;
    } else {
      fullMessage = `我上传了 ${pendingFiles.length} 个文件：\n\n`;
      pendingFiles.forEach((file, index) => {
        fullMessage += `### 文件 ${index + 1}：${file.fileName}\n\n\`\`\`\n${file.content}\n\`\`\`\n\n`;
      });
    }

    if (message) {
      fullMessage += "\n\n" + message;
    }

    // 清除待发送的文件
    window.pendingFiles = [];
  } else {
    fullMessage = message;
  }

  // 创建用户消息元素
  const userDiv = createMessageElement(
    "user",
    conversations[currentConversationId].messages.length,
  );
  userDiv.style.marginLeft = "-2.2rem";
  userDiv.style.marginTop = "1rem";
  userDiv.innerHTML = marked.parse(fullMessage);

  let searchResults = "";
  if (API_CONFIG.search.enabled) {
    const loadingDiv = document.createElement("div");
    loadingDiv.className = "search-loading";
    loadingDiv.innerHTML = `
            <span>正在搜索相关信息</span>
            <div class="dots">
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
            </div>
        `;
    userDiv.appendChild(loadingDiv);
    scrollToBottom(true);

    try {
      // 使用默认小模型判断是否需要搜索
      const searchCheckRequest = await fetch(API_CONFIG.defaultUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_CONFIG.defaultKey}`,
        },
        body: JSON.stringify({
          model: API_CONFIG.defaultModel,
          messages: [
            {
              role: "system",
              content:
                '你是一个搜索判断器。请根据用户的消息判断是否需要联网搜索。如果需要搜索，请直接返回"true"，否则返回"false"。不要任何多余的话。',
            },
            {
              role: "user",
              content: fullMessage,
            },
          ],
        }),
      });

      const searchCheckResponse = await searchCheckRequest.json();
      const needsSearch =
        searchCheckResponse.choices[0].message.content === "true";

      if (needsSearch) {
        // 如果需要搜索，生成搜索请求
        const searchRequest = await fetch(API_CONFIG.defaultUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${API_CONFIG.defaultKey}`,
          },
          body: JSON.stringify({
            model: API_CONFIG.defaultModel,
            messages: [
              {
                role: "system",
                content:
                  "你是一个搜索请求生成器。请根据用户的消息生成一个适合搜索的简洁查询语句，直接返回查询语句，不要任何多余的话。",
              },
              {
                role: "user",
                content: fullMessage,
              },
            ],
          }),
        });

        const searchQuery = await searchRequest.json();
        const results = await performSearch(
          searchQuery.choices[0].message.content,
        );
        loadingDiv.remove();
        if (results.length > 0) {
          searchResults = formatSearchResults(results);
        }
      } else {
        loadingDiv.remove();
      }
    } catch (error) {
      loadingDiv.remove();
      console.error("Search error:", error);
    }
  }

  if (currentRequestController) {
    currentRequestController.abort();
  }
  currentRequestController = new AbortController();
  toggleSendStopButton(true);

  autoScroll = true;
  scrollToBottom(true);

  const previousMessages = [...conversations[currentConversationId].messages];

  conversations[currentConversationId].messages.push({
    role: "user",
    content: fullMessage,
    searchResults: searchResults,
    metadata:
      pendingFiles && pendingFiles.length > 0
        ? {
            type: "files",
            files: pendingFiles.map((file) => ({
              fileName: file.fileName,
              fileType: file.type,
              fileSize: file.size,
            })),
          }
        : undefined,
  });

  const assistantDiv = createMessageElement(
    "assistant",
    conversations[currentConversationId].messages.length,
  );

  isGenerating = true;
  refreshConversationList();

  const newMessage = await generateAssistantMessage(
    getMessagesWithContext(),
    assistantDiv,
    previousMessages,
  );

  if (newMessage) {
    conversations[currentConversationId].messages.push(newMessage);

    // 如果这是第一轮对话且标题还是默认的，则自动生成标题
    if (conversations[currentConversationId].messages.length === 2) {
      try {
        const titleResponse = await fetch(API_CONFIG.defaultUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${API_CONFIG.defaultKey}`,
          },
          body: JSON.stringify({
            model: API_CONFIG.defaultModel,
            messages: [
              {
                role: "system",
                content:
                  "你是一个对话标题生成器。请根据用户的消息和AI的回复生成一个简短的标题（不超过15个字），直接返回标题文本，不要任何多余的话。标题要简洁且能反映对话的主要内容。",
              },
              {
                role: "user",
                content: `用户问题：${fullMessage}\nAI回复：${newMessage.content}`,
              },
            ],
          }),
        });

        const titleData = await titleResponse.json();
        if (
          titleData.choices &&
          titleData.choices[0] &&
          titleData.choices[0].message
        ) {
          const newTitle = titleData.choices[0].message.content.trim();
          conversations[currentConversationId].title = newTitle;
          document.getElementById("current-conversation-title").textContent =
            newTitle;
          refreshConversationList();
        }
      } catch (error) {
        console.error("获取标题失败:", error);
      }
    }

    saveConversations();
  }

  currentRequestController = null;
  toggleSendStopButton(false);
  isGenerating = false;
  refreshConversationList();
  refreshMessages();
}

function getMessagesWithContext() {
  const allMessages = conversations[currentConversationId].messages.map(
    (msg) => ({
      role: msg.role,
      content: msg.content,
    }),
  );
  const currentIndex = allMessages.length - 1;

  // 获取当前对话的系统提示词
  let systemPrompt =
    conversations[currentConversationId].systemPrompt ||
    API_CONFIG.defaultSystemPrompt;

  // 如果有搜索结果，将其添加到系统提示词中，并添加引用说明
  if (
    allMessages.length > 0 &&
    conversations[currentConversationId].messages[currentIndex].searchResults
  ) {
    systemPrompt +=
      "\n\n以下是与用户问题相关的搜索结果，你可以参考这些信息来回答。在引用信息时，请使用markdown格式的链接，例如：根据[来源1](链接)显示...。这样可以让用户直接点击查看原始来源：\n" +
      conversations[currentConversationId].messages[currentIndex].searchResults;
  }

  // 如果消息数量小于等于上下文限制，返回所有消息
  if (allMessages.length <= API_CONFIG.contextCount) {
    return [{ role: "system", content: systemPrompt }, ...allMessages];
  }

  // 获取最近的几条消息作为上下文
  const contextMessages = allMessages.slice(-API_CONFIG.contextCount - 1);

  return [
    {
      role: "system",
      content: `${systemPrompt}\n\n这是一段对话的继续，之前已经进行了 ${currentIndex - API_CONFIG.contextCount} 轮对话。`,
    },
    ...contextMessages,
  ];
}

function openEditModal(index) {
  const modal = document.getElementById("edit-modal");
  const textarea = document.getElementById("edit-content");

  currentEditingMessage = index;
  textarea.value = conversations[currentConversationId].messages[index].content;
  modal.classList.remove("hidden");
}

function closeEditModal() {
  const modal = document.getElementById("edit-modal");
  modal.classList.add("hidden");
  currentEditingMessage = null;
}

function saveEdit() {
  if (currentEditingMessage === null) return;

  const textarea = document.getElementById("edit-content");
  const newContent = textarea.value.trim();

  conversations[currentConversationId].messages[currentEditingMessage].content =
    newContent;
  saveConversations();
  refreshMessages();

  closeEditModal();
}

async function deleteMessage(index) {
  if (!(await showDialog("删除确认", "确定要删除这条消息吗？"))) return;

  conversations[currentConversationId].messages.splice(index, 1);
  saveConversations();
  refreshMessages();
}

async function clearCurrentChat() {
  if (!(await showDialog("清空确认", "确定要清空当前对话吗？"))) return;

  conversations[currentConversationId].messages = [];
  saveConversations();
  refreshMessages();
}

function scrollToBottom(force = false) {
  const chatContainer = document.getElementById("chat-container");
  const lastMessage = chatContainer.querySelector("#messages > div:last-child");
  const scrollButton = document.getElementById("scroll-to-bottom-btn");

  if (lastMessage) {
    requestAnimationFrame(() => {
      chatContainer.scrollTop = chatContainer.scrollHeight;

      // 更新按钮可见性
      const isNearBottom =
        chatContainer.scrollHeight -
          chatContainer.scrollTop -
          chatContainer.clientHeight <
        100;
      scrollButton.classList.toggle("visible", !isNearBottom);

      // 当滚动到底部时，重新启用自动滚动
      if (isNearBottom) {
        autoScroll = true;
      }
    });
  }
}

function toggleSendStopButton(isGenerating) {
  const sendButton = document.getElementById("send-button");
  const stopButton = document.getElementById("stop-button");
  const pauseButton = document.getElementById("pause-button");
  const newChatButton = document.getElementById("new-chat-btn"); // 添加这行

  if (isGenerating) {
    sendButton.disabled = true;
    sendButton.classList.add("opacity-50", "cursor-not-allowed");
    stopButton.classList.remove("hidden");
    pauseButton.classList.remove("hidden");
    const pauseIcon = document.getElementById("pause-icon");
    const playIcon = document.getElementById("play-icon");
    pauseIcon.classList.remove("hidden");
    playIcon.classList.add("hidden");
    pauseButton.classList.add("text-[var(--text-secondary)]");

    // 禁用新建对话按钮
    newChatButton.disabled = true;
    newChatButton.classList.add("opacity-50", "cursor-not-allowed");
  } else {
    sendButton.disabled = false;
    sendButton.classList.remove("opacity-50", "cursor-not-allowed");
    stopButton.classList.add("hidden");
    pauseButton.classList.add("hidden");
    isPaused = false;

    // 启用新建对话按钮
    newChatButton.disabled = false;
    newChatButton.classList.remove("opacity-50", "cursor-not-allowed");
  }
}

function stopGeneration() {
  if (currentRequestController) {
    currentRequestController.abort();
    currentRequestController = null;
    isPaused = false;
    toggleSendStopButton(false);
    isGenerating = false;
    refreshConversationList(); // 停止生成时更新列表
  }
}

function startEditingTitle(titleElement) {
  const input = document.getElementById("title-input");
  input.value = titleElement.textContent;
  titleElement.classList.add("hidden");
  input.classList.remove("hidden");
  input.focus();
  input.select();
}

function saveTitle() {
  const titleElement = document.getElementById("current-conversation-title");
  const input = document.getElementById("title-input");
  const newTitle = input.value.trim();

  if (newTitle && currentConversationId) {
    conversations[currentConversationId].title = newTitle;
    titleElement.textContent = newTitle;
    saveConversations();
    refreshConversationList();
  }

  titleElement.classList.remove("hidden");
  input.classList.add("hidden");
}

function handleTitleKeyPress(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    saveTitle();
  }
}

function togglePause() {
  const pauseButton = document.getElementById("pause-button");
  const pauseIcon = document.getElementById("pause-icon");
  const playIcon = document.getElementById("play-icon");
  isPaused = !isPaused;
  if (isPaused) {
    pauseIcon.classList.add("hidden");
    playIcon.classList.remove("hidden");
  } else {
    pauseIcon.classList.remove("hidden");
    playIcon.classList.add("hidden");
  }
}

function switchModel(modelId) {
  const modelSelect = document.getElementById("model-select");

  // 检查当前对话类型
  const currentType = getConversationType(
    conversations[currentConversationId]?.messages,
  );

  // 如果已有对话，检查模型兼容性
  if (currentType !== "none") {
    const modelType = API_CONFIG.models[modelId].type;
    const currentModelType = currentType === "deepseek" ? "thinking" : "normal";

    if (modelType !== currentModelType) {
      showAlert("不能在同一个对话中混用深度思考模型和普通模型");
      // 恢复之前的选择
      modelSelect.value =
        localStorage.getItem("preferred-model") || "deepseek-r1";
      return;
    }
  }

  // 保存选择的模型
  localStorage.setItem("preferred-model", modelId);
  // 更新下拉框的值
  modelSelect.value = modelId;
}

async function showDialog(title, message) {
  return new Promise((resolve) => {
    const dialog = document.getElementById("custom-dialog");
    const titleEl = document.getElementById("dialog-title");
    const messageEl = document.getElementById("dialog-message");
    const confirmBtn = document.getElementById("dialog-confirm");
    const cancelBtn = document.getElementById("dialog-cancel");

    titleEl.textContent = title;
    messageEl.textContent = message;
    dialog.classList.remove("hidden");

    const handleConfirm = () => {
      dialog.classList.add("hidden");
      cleanup();
      resolve(true);
    };

    const handleCancel = () => {
      dialog.classList.add("hidden");
      cleanup();
      resolve(false);
    };

    const cleanup = () => {
      confirmBtn.removeEventListener("click", handleConfirm);
      cancelBtn.removeEventListener("click", handleCancel);
    };

    confirmBtn.addEventListener("click", handleConfirm);
    cancelBtn.addEventListener("click", handleCancel);
  });
}

function showAlert(message) {
  return new Promise((resolve) => {
    const alert = document.getElementById("custom-alert");
    const messageEl = document.getElementById("alert-message");
    const confirmBtn = document.getElementById("alert-confirm");

    messageEl.textContent = message;
    alert.classList.remove("hidden");

    const handleConfirm = () => {
      alert.classList.add("hidden");
      confirmBtn.removeEventListener("click", handleConfirm);
      resolve();
    };

    confirmBtn.addEventListener("click", handleConfirm);
  });
}

// 添加函数来判断对话类型
function getConversationType(messages) {
  if (!messages || messages.length === 0) return "none";

  for (const msg of messages) {
    if (msg.role === "assistant") {
      if (msg.type === "thinking") return "deepseek";
      if (msg.type === "normal") return "normal";
    }
  }
  return "none";
}

// 添加更新模型按钮可见性的函数
function updateModelButtonsVisibility() {
  const currentType = getConversationType(
    conversations[currentConversationId]?.messages,
  );
  const modelSelect = document.getElementById("model-select");

  // 获取所有选项
  const options = Array.from(modelSelect.options);

  if (currentType === "none") {
    // 新对话，显示所有选项
    options.forEach((opt) => {
      opt.style.display = "";
    });
  } else {
    // 根据类型显示对应选项
    const targetType = currentType === "deepseek" ? "thinking" : "normal";

    options.forEach((opt) => {
      const modelInfo = API_CONFIG.models[opt.value];
      opt.style.display = modelInfo.type === targetType ? "" : "none";
    });

    // 如果当前选中的模型类型不匹配，切换到第一个可用的模型
    const currentModelInfo = API_CONFIG.models[modelSelect.value];
    if (currentModelInfo.type !== targetType) {
      const firstMatchingOption = options.find(
        (opt) =>
          API_CONFIG.models[opt.value].type === targetType &&
          opt.style.display !== "none",
      );
      if (firstMatchingOption) {
        modelSelect.value = firstMatchingOption.value;
      }
    }
  }
}

function toggleThinking(header) {
  const content = header.nextElementSibling;
  const icon = header.querySelector(".think-header-icon");
  const isCollapsed = content.classList.contains("collapsed");

  // 如果要展开
  if (isCollapsed) {
    content.style.display = "block";
    // 使用 requestAnimationFrame 确保 display 更改已应用
    requestAnimationFrame(() => {
      content.classList.remove("collapsed");
      icon.style.transform = "rotate(0deg)";
    });
  } else {
    // 如果要收起
    content.classList.add("collapsed");
    icon.style.transform = "rotate(-90deg)";
    // 等待动画完成后隐藏元素
    content.addEventListener("transitionend", function handler() {
      if (!content.classList.contains("collapsed")) return;
      content.style.display = "none";
      content.removeEventListener("transitionend", handler);
    });
  }
}

function openSystemPromptModal() {
  const modal = document.getElementById("system-prompt-modal");
  const systemPrompt = document.getElementById("system-prompt");
  const currentChat = conversations[currentConversationId];

  systemPrompt.value =
    currentChat?.systemPrompt || API_CONFIG.defaultSystemPrompt;
  modal.classList.remove("hidden");

  // 渲染模型设置
  renderModelSettings();
}

function closeSystemPromptModal() {
  document.getElementById("system-prompt-modal").classList.add("hidden");
}

function saveSystemPrompt() {
  const systemPrompt = document.getElementById("system-prompt").value.trim();

  // 保存到当前对话
  if (currentConversationId && conversations[currentConversationId]) {
    conversations[currentConversationId].systemPrompt = systemPrompt;
    saveConversations();
  }

  // 同时保存模型配置
  saveModelsFromSettings();

  closeSystemPromptModal();
  showAlert("保存成功");
}

// 设置面板：模型设置渲染
function renderModelSettings() {
  const container = document.getElementById('model-settings');
  if (!container) return;
  container.innerHTML = '';
  const entries = Object.entries(API_CONFIG.models);
  if (entries.length === 0) {
    container.innerHTML = '<div class="text-[var(--text-secondary)] text-sm]">暂无模型，点击"新增模型"添加</div>';
    return;
  }
  entries.forEach(([id, info]) => {
    const card = document.createElement('div');
    card.className = 'rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)]';
    card.innerHTML = `
      <div class="p-3 border-b border-[var(--border-color)] flex items-center justify-between">
        <div class="text-sm font-medium text-[var(--text-primary)] truncate">${info.name || id}</div>
        <button class="p-1.5 rounded-md hover:bg-[var(--hover-bg)] text-red-500" title="删除" onclick="deleteModelCard(this)">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label class="block text-xs mb-1 text-[var(--text-secondary)]">模型ID</label>
          <input data-field="id" class="w-full px-2 py-1 rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)]" placeholder="例如 qwen2-57b-a14b-instruct" value="${id}" />
        </div>
        <div>
          <label class="block text-xs mb-1 text-[var(--text-secondary)]">显示名称</label>
          <input data-field="name" class="w-full px-2 py-1 rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)]" placeholder="例如 qwen2-57b" value="${info.name || ''}" />
        </div>
        <div>
          <label class="block text-xs mb-1 text-[var(--text-secondary)]">类型</label>
          <select data-field="type" class="w-full px-2 py-1 rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)]">
            <option value="normal" ${info.type === 'normal' ? 'selected' : ''}>普通</option>
            <option value="thinking" ${info.type === 'thinking' ? 'selected' : ''}>深度思考</option>
          </select>
        </div>
        <div>
          <label class="block text-xs mb-1 text-[var(--text-secondary)]">API Key（可选）</label>
          <input data-field="key" class="w-full px-2 py-1 rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)]" placeholder="Bearer ..." value="${info.key || ''}" />
        </div>
        <div class="md:col-span-2">
          <label class="block text-xs mb-1 text-[var(--text-secondary)]">API URL</label>
          <input data-field="url" class="w-full px-2 py-1 rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)]" placeholder="https://.../v1/chat/completions" value="${info.url || ''}" />
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function addModelRow() {
  const container = document.getElementById('model-settings');
  const card = document.createElement('div');
  card.className = 'rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)]';
  card.innerHTML = `
    <div class="p-3 border-b border-[var(--border-color)] flex items-center justify-between">
      <div class="text-sm font-medium text-[var(--text-primary)] truncate">新模型</div>
      <button class="p-1.5 rounded-md hover:bg-[var(--hover-bg)] text-red-500" title="删除" onclick="deleteModelCard(this)">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    </div>
    <div class="p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
      <div>
        <label class="block text-xs mb-1 text-[var(--text-secondary)]">模型ID</label>
        <input data-field="id" class="w-full px-2 py-1 rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)]" placeholder="例如 my-model-id" value="" />
      </div>
      <div>
        <label class="block text-xs mb-1 text-[var(--text-secondary)]">显示名称</label>
        <input data-field="name" class="w-full px-2 py-1 rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)]" placeholder="例如 My Model" value="" />
      </div>
      <div>
        <label class="block text-xs mb-1 text-[var(--text-secondary)]">类型</label>
        <select data-field="type" class="w-full px-2 py-1 rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)]">
          <option value="normal">普通</option>
          <option value="thinking">深度思考</option>
        </select>
      </div>
      <div>
        <label class="block text-xs mb-1 text-[var(--text-secondary)]">API Key（可选）</label>
        <input data-field="key" class="w-full px-2 py-1 rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)]" placeholder="Bearer ..." value="" />
      </div>
      <div class="md:col-span-2">
        <label class="block text-xs mb-1 text-[var(--text-secondary)]">API URL</label>
        <input data-field="url" class="w-full px-2 py-1 rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)]" placeholder="https://.../v1/chat/completions" value="" />
      </div>
    </div>
  `;
  container.appendChild(card);
}

function deleteModelCard(btn) {
  const card = btn.closest('.rounded-lg');
  card.remove();
}

function saveModelsFromSettings() {
  const container = document.getElementById('model-settings');
  if (!container) return;
  const cards = Array.from(container.children);
  const nextModels = {};
  for (const card of cards) {
    const id = card.querySelector('[data-field="id"]').value.trim();
    const name = card.querySelector('[data-field="name"]').value.trim();
    const type = card.querySelector('[data-field="type"]').value === 'thinking' ? 'thinking' : 'normal';
    const url = card.querySelector('[data-field="url"]').value.trim();
    const key = card.querySelector('[data-field="key"]').value.trim();
    if (!id || !name || !url) continue;
    nextModels[id] = { name, type, url, key };
  }
  if (Object.keys(nextModels).length === 0) {
    showAlert('请至少配置一个有效模型（含 ID、名称、URL）');
    return;
  }
  // 保持引用不变，原位更新 models，避免潜在引用失效
  Object.keys(API_CONFIG.models).forEach((k) => delete API_CONFIG.models[k]);
  Object.entries(nextModels).forEach(([k, v]) => (API_CONFIG.models[k] = v));
  localStorage.setItem('models', JSON.stringify(nextModels));
  // 处理选中模型
  const prevSelected = localStorage.getItem('preferred-model');
  let nextSelected = prevSelected && nextModels[prevSelected] ? prevSelected : Object.keys(nextModels)[0];
  if (nextSelected) {
    localStorage.setItem('preferred-model', nextSelected);
    API_CONFIG.defaultModel = nextSelected;
  }
  refreshModelSelectOptions();
  if (nextSelected) {
    try {
      const currentType = getConversationType(conversations[currentConversationId]?.messages);
      const newModelType = nextModels[nextSelected].type;
      const currentModelType = currentType === 'deepseek' ? 'thinking' : (currentType === 'normal' ? 'normal' : 'none');
      if (currentModelType !== 'none' && newModelType !== currentModelType) {
        showAlert('当前对话类型与所选模型不兼容，请新建对话后再切换该模型');
      } else {
        switchModel(nextSelected);
      }
    } catch (_) {}
  }
  updateModelButtonsVisibility();
}

// 添加对话类型选择对话框
function showChatTypeDialog() {
  return new Promise((resolve) => {
    const dialog = document.createElement("div");
    dialog.className =
      "fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center";
    dialog.innerHTML = `
            <div class="bg-[var(--bg-primary)] rounded-lg shadow-xl max-w-sm w-[calc(100%-2rem)] mx-4">
                <div class="p-4 border-b border-[var(--border-color)]">
                    <h3 class="text-lg font-medium">选择对话类型</h3>
                </div>
                <div class="p-4 space-y-4">
                    ${Object.entries(API_CONFIG.chatTypes)
                      .map(
                        ([key, type]) => `
                        <button class="w-full p-4 text-left rounded-lg border border-[var(--border-color)] hover:bg-[var(--hover-bg)] transition-colors"
                                onclick="selectChatType('${key}')">
                            <div class="font-medium">${type.name}</div>
                        </button>
                    `,
                      )
                      .join("")}
                </div>
            </div>
        `;
    document.body.appendChild(dialog);

    // 添加点击背景关闭的功能
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) {
        document.body.removeChild(dialog);
        resolve(null);
      }
    });

    // 添加选择类型的函数到 window
    window.selectChatType = (type) => {
      document.body.removeChild(dialog);
      resolve(type);
    };
  });
}

// 格式化搜索结果
function formatSearchResults(results) {
  if (!results.length) return "";

  // Sort results by dateLastCrawled in descending order
  results.sort(
    (a, b) => new Date(b.dateLastCrawled) - new Date(a.dateLastCrawled),
  );

  // 使用 markdown 格式的链接
  return results
    .map((result, index) => {
      const sourceNumber = index + 1;
      return `[来源${sourceNumber}] ${result.name}
链接：[${result.url}](${result.url})
摘要：${result.summary}
---`;
    })
    .join("\n\n");
}

// 添加搜索开关按钮到设置面板
function addSearchToggleToSettings() {
  const settingsDiv = document.querySelector("#system-prompt-modal .p-4");
  const searchToggle = document.createElement("div");
  searchToggle.className = "space-y-2 mt-4";
  searchToggle.innerHTML = `
        <label class="flex items-center space-x-2">
            <input type="checkbox" id="search-toggle"
                    class="rounded border-[var(--border-color)]"
                    ${API_CONFIG.search.enabled ? "checked" : ""}>
            <span class="text-sm font-medium">启用联网搜索（Beta）</span>
        </label>
    `;

  settingsDiv.appendChild(searchToggle);

  // 添加切换事件
  document.getElementById("search-toggle").addEventListener("change", (e) => {
    API_CONFIG.search.enabled = e.target.checked;
    // 可以选择将设置保存到localStorage
    localStorage.setItem("search_enabled", e.target.checked);
  });
}

// 在页面加载时初始化搜索设置
document.addEventListener("DOMContentLoaded", () => {
  // 从localStorage加载搜索设置
  const searchEnabled = localStorage.getItem("search_enabled");
  if (searchEnabled !== null) {
    API_CONFIG.search.enabled = searchEnabled === "true";
  }

  // 添加搜索开关到设置面板
  addSearchToggleToSettings();
});

// 导入对话功能
function importChat() {
  document.getElementById("chat-import").click();
}

async function handleFileImport(input) {
  const file = input.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const chatData = JSON.parse(text);

    // 验证导入的数据格式
    if (!chatData.title || !Array.isArray(chatData.messages)) {
      throw new Error("无效的对话文件格式");
    }

    // 创建新的对话 ID
    const conversationId = "conv_" + Date.now();

    // 构建新的对话对象
    conversations[conversationId] = {
      title: chatData.title,
      messages: chatData.messages,
      systemPrompt: chatData.systemPrompt || API_CONFIG.defaultSystemPrompt,
      type: chatData.type || "normal",
    };

    // 保存并切换到新导入的对话
    saveConversations();
    switchConversation(conversationId);
    refreshConversationList();

    // 显示成功提示
    showAlert("对话导入成功");

    // 关闭设置面板
    closeSystemPromptModal();
  } catch (error) {
    showAlert("导入失败：" + (error.message || "文件格式错误"));
  }

  // 清除文件输入，允许重复导入相同文件
  input.value = "";
}

// 修改导出函数，增加更多元数据
function exportCurrentChat() {
  if (!currentConversationId || !conversations[currentConversationId]) {
    showAlert("没有可导出的对话");
    return;
  }

  const currentChat = conversations[currentConversationId];
  const chatData = {
    title: currentChat.title,
    messages: currentChat.messages,
    systemPrompt: currentChat.systemPrompt,
    type: currentChat.type,
    exportDate: new Date().toISOString(),
    version: "1.0",
  };

  // 创建 Blob 对象
  const blob = new Blob([JSON.stringify(chatData, null, 2)], {
    type: "application/json",
  });

  // 创建下载链接
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${currentChat.title}_${new Date().toISOString().split("T")[0]}.json`;

  // 触发下载
  document.body.appendChild(a);
  a.click();

  // 清理
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 修改文件处理函数
async function handleFileUpload(input) {
  const files = input.files;
  if (!files || files.length === 0) return;

  // 检查文件总大小（限制为50MB）
  let totalSize = 0;
  for (let i = 0; i < files.length; i++) {
    totalSize += files[i].size;
  }

  if (totalSize > 50 * 1024 * 1024) {
    showAlert("文件总大小不能超过50MB");
    input.value = "";
    return;
  }

  // 显示加载中提示
  const loadingToast = document.createElement("div");
  loadingToast.className = "copy-toast";
  loadingToast.innerHTML = `
        <svg class="w-5 h-5 text-blue-500 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>正在处理文件...</span>
    `;
  document.body.appendChild(loadingToast);

  try {
    // 确保 window.pendingFiles 已初始化
    if (!window.pendingFiles) {
      window.pendingFiles = [];
    }

    // 处理每个文件
    const newPendingFiles = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // 检查单个文件大小（限制为20MB）
      if (file.size > 20 * 1024 * 1024) {
        showAlert(`文件 ${file.name} 大小不能超过20MB`);
        continue;
      }

      let content = "";
      let fileType = file.type;
      let encoding = "";

      // 根据文件类型处理
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
        // 处理 Excel 文件
        fileType = fileName.endsWith(".xlsx") ? "XLSX" : "XLS";

        // 读取 Excel 文件
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: "array" });

        // 提取所有工作表的内容
        let extractedText = "";

        // 遍历所有工作表
        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];

          // 将工作表转换为JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          // 添加工作表名称
          extractedText += `--- 工作表: ${sheetName} ---\n\n`;

          // 格式化数据为表格形式
          if (jsonData.length > 0) {
            // 获取最大列数
            const maxCols = Math.max(...jsonData.map((row) => row.length));

            // 生成表头行（A, B, C...）
            let headerRow = "    ";
            for (let i = 0; i < maxCols; i++) {
              const colLetter = XLSX.utils.encode_col(i);
              headerRow += colLetter.padEnd(15, " ");
            }
            extractedText += headerRow + "\n";

            // 生成分隔行
            extractedText += "    " + "-".repeat(maxCols * 15) + "\n";

            // 生成数据行
            jsonData.forEach((row, rowIndex) => {
              let rowText = `${(rowIndex + 1).toString().padStart(3, " ")}|`;

              for (let i = 0; i < maxCols; i++) {
                const cellValue = row[i] !== undefined ? row[i].toString() : "";
                // 限制单元格内容长度，防止过长
                const truncatedValue =
                  cellValue.length > 14
                    ? cellValue.substring(0, 11) + "..."
                    : cellValue;
                rowText += truncatedValue.padEnd(15, " ");
              }

              extractedText += rowText + "\n";
            });
          } else {
            extractedText += "(空工作表)\n";
          }

          extractedText += "\n\n";
        }

        content = extractedText;
      } else if (fileName.endsWith(".docx")) {
        // 处理 DOCX 文件
        fileType = "DOCX";

        // 读取 DOCX 文件
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        content = result.value || "";

        // 如果内容为空，尝试提取 HTML 并转换为纯文本
        if (!content.trim()) {
          const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
          const tempDiv = document.createElement("div");
          tempDiv.innerHTML = htmlResult.value;
          content = tempDiv.textContent || "";
        }
      } else if (fileName.endsWith(".doc")) {
        // 处理 DOC 文件
        fileType = "DOC";

        // 读取 DOC 文件
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        content = result.value || "";

        // 如果内容为空，尝试提取 HTML 并转换为纯文本
        if (!content.trim()) {
          const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
          const tempDiv = document.createElement("div");
          tempDiv.innerHTML = htmlResult.value;
          content = tempDiv.textContent || "";
        }
      } else if (file.type === "application/pdf" || fileName.endsWith(".pdf")) {
        // 处理 PDF 文件
        fileType = "PDF";

        // 读取 PDF 文件
        ensurePdfWorkerConfigured();
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        // 提取文本内容
        const numPages = pdf.numPages;
        let extractedText = "";

        for (let i = 1; i <= numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item) => item.str).join(" ");
          extractedText += `--- 第 ${i} 页 ---\n${pageText}\n\n`;
        }

        content = extractedText;
      } else if (
        file.type.startsWith("image/") ||
        fileName.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i)
      ) {
        // 处理图片文件
        fileType = "IMAGE";

        try {
          // 将图片转换为base64
          const reader = new FileReader();
          const base64Promise = new Promise((resolve, reject) => {
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          const base64Data = await base64Promise;

          // 调用VLM模型解析图片
          const response = await fetch(API_CONFIG.defaultUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${API_CONFIG.defaultKey}`,
            },
            body: JSON.stringify({
              model: API_CONFIG.defaultVlm,
              messages: [
                {
                  role: "user",
                  content: [
                    {
                      type: "text",
                      text: "请详细描述这张图片的内容，包括图片中的文字、物体、场景、颜色等所有可见元素。如果图片包含文字，请准确识别并提取出来。",
                    },
                    {
                      type: "image_url",
                      image_url: {
                        url: base64Data,
                      },
                    },
                  ],
                },
              ],
            }),
          });

          if (!response.ok) {
            throw new Error(`图片解析失败: ${response.status}`);
          }

          const data = await response.json();
          content = data.choices[0].message.content || "无法解析图片内容";

          // 在内容前添加图片信息说明
          content = `[图片解析结果]\n文件名: ${file.name}\n图片类型: ${file.type}\n文件大小: ${(file.size / 1024).toFixed(1)}KB\n\n图片内容描述:\n${content}`;
        } catch (error) {
          console.error("图片处理错误:", error);
          content = `[图片解析失败]\n文件名: ${file.name}\n错误信息: ${error.message}\n\n请尝试重新上传或使用其他图片格式。`;
        }
      } else {
        // 处理文本文件
        fileType = "TXT";

        // 读取文件为 ArrayBuffer
        const buffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(buffer);

        // 尝试检测编码
        const result = jschardet.detect(uint8Array);
        encoding = result.encoding || "GBK"; // 默认使用 GBK

        // 解码文件内容
        try {
          if (encoding.toUpperCase() === "UTF-8") {
            const decoder = new TextDecoder(encoding.toLowerCase());
            content = decoder.decode(uint8Array);
          } else {
            // 对于非 UTF-8 编码，使用 TextDecoding polyfill
            const gbkDecoder = new TextDecoder("gbk");
            content = gbkDecoder.decode(uint8Array);
          }

          // 检查解码结果是否包含乱码（超过50%的字符是乱码）
          const invalidChars = content.match(/\ufffd/g);
          if (invalidChars && invalidChars.length > content.length * 0.5) {
            throw new Error("检测到大量乱码字符");
          }
        } catch (e) {
          console.warn("Failed to decode with detected encoding:", encoding);
          // 强制使用 GBK 解码
          const gbkDecoder = new TextDecoder("gbk");
          content = gbkDecoder.decode(uint8Array);
        }

        // 检查是否有 BOM
        if (content.charCodeAt(0) === 0xfeff) {
          content = content.slice(1);
        }
      }

      // 如果内容为空，显示警告
      if (!content.trim()) {
        showAlert(`文件 ${file.name} 内容为空或无法提取文本`);
        continue;
      }

      // 为每个文件添加唯一ID
      const fileId = Date.now() + "-" + Math.random().toString(36).substr(2, 9);

      // 添加到新处理的文件列表
      newPendingFiles.push({
        id: fileId,
        fileName: file.name || "未命名文件",
        content: content || "",
        size: file.size || 0,
        type: fileType || "未知类型",
        encoding: encoding || "",
      });
    }

    // 清除现有的文件预览
    const filePreviews = document.querySelectorAll(".file-preview");
    filePreviews.forEach((preview) => preview.remove());

    // 添加新处理的文件到待发送文件列表
    window.pendingFiles = [...window.pendingFiles, ...newPendingFiles];

    // 显示文件预览
    displayPendingFiles(window.pendingFiles);

    // 移除加载提示
    loadingToast.remove();

    // 显示成功提示
    showAlert("文件处理完成", "success");
  } catch (error) {
    console.error("文件处理错误:", error);
    showAlert("文件处理失败: " + error.message);
    loadingToast.remove();
  }

  // 清空文件输入，以便可以再次选择相同的文件
  input.value = "";
}

// 显示待上传文件
function displayPendingFiles(files) {
  if (!files || files.length === 0) return;

  // 确保 window.pendingFiles 已初始化
  window.pendingFiles = files;

  // 清除现有的文件预览
  const filePreviews = document.querySelectorAll(".file-preview");
  filePreviews.forEach((preview) => preview.remove());

  const messagesDiv = document.getElementById("messages");

  // 为每个文件创建预览元素
  files.forEach((file) => {
    // 根据文件类型设置图标
    let fileIcon = "";

    switch (file.type) {
      case "PDF":
        fileIcon = `
                    <svg class="w-8 h-8 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M12 11v6m-3-3h6" />
                    </svg>
                `;
        break;
      case "DOCX":
      case "DOC":
        fileIcon = `
                    <svg class="w-8 h-8 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M10 10.5h4m-4 3h4m-4 3h4" />
                    </svg>
                `;
        break;
      case "XLSX":
      case "XLS":
        fileIcon = `
                    <svg class="w-8 h-8 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M10 8h4m-4 4h4m-4 4h4" />
                    </svg>
                `;
        break;
      case "IMAGE":
        fileIcon = `
                    <svg class="w-8 h-8 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                `;
        break;
      default:
        fileIcon = `
                    <svg class="w-8 h-8 text-[var(--text-secondary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                `;
    }

    // 创建文件预览元素
    const previewDiv = document.createElement("div");
    previewDiv.className =
      "file-preview mb-2 p-3 bg-[var(--bg-secondary)] rounded-lg flex flex-col gap-2";
    previewDiv.dataset.fileId = file.id;
    previewDiv.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="flex-shrink-0">
                    ${fileIcon}
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-[var(--text-primary)] truncate">${file.fileName}</p>
                    <p class="text-xs text-[var(--text-secondary)]">${file.type} ${(file.size / 1024).toFixed(1)}KB${file.encoding ? " · " + file.encoding : ""}</p>
                </div>
                <button class="file-close-btn p-1 text-[var(--text-secondary)] hover:text-[var(--button-primary-bg)] rounded-full hover:bg-[var(--hover-bg)] transition-colors" title="取消上传">
                    <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        `;

    // 添加关闭按钮的点击事件
    const closeBtn = previewDiv.querySelector(".file-close-btn");
    closeBtn.addEventListener("click", function () {
      // 移除文件预览
      previewDiv.remove();
      // 从待发送文件列表中移除
      window.pendingFiles = window.pendingFiles.filter((f) => f.id !== file.id);
    });

    // 将预览添加到消息区域
    messagesDiv.appendChild(previewDiv);
  });

  // 自动滚动到底部
  scrollToBottom(true);
}

// 初始化应用（放在body末尾，DOM已加载完成）
initialize();

// HTML预览功能
function showHtmlPreview(htmlContent) {
  // 创建模态框
  const modal = document.createElement("div");
  modal.className = "html-preview-modal";
  modal.innerHTML = `
        <div class="html-preview-container">
            <div class="html-preview-header">
                <div class="html-preview-title">HTML 预览</div>
                <button class="html-preview-close" onclick="closeHtmlPreview(this)">
                    <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <div class="html-preview-loading">
                <div class="loading-dots">
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                </div>
                <span style="margin-left: 0.5rem;">正在加载预览...</span>
            </div>
        </div>
    `;

  // 点击背景关闭模态框
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeHtmlPreview(modal.querySelector(".html-preview-close"));
    }
  });

  // ESC键关闭模态框
  const escHandler = (e) => {
    if (e.key === "Escape") {
      closeHtmlPreview(modal.querySelector(".html-preview-close"));
      document.removeEventListener("keydown", escHandler);
    }
  };
  document.addEventListener("keydown", escHandler);

  document.body.appendChild(modal);

  // 使用blob URL方式创建iframe来安全地渲染HTML
  setTimeout(() => {
    const container = modal.querySelector(".html-preview-container");
    const loadingDiv = container.querySelector(".html-preview-loading");

    try {
      // 如果HTML内容不包含完整的HTML结构，为其添加基础结构
      let processedHtml = htmlContent;
      if (
        !htmlContent.includes("<!DOCTYPE") &&
        !htmlContent.includes("<html")
      ) {
        processedHtml = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>HTML预览</title>
<style>
    body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        margin: 20px;
        line-height: 1.6;
        color: #333;
    }
    * {
        box-sizing: border-box;
    }
</style>
</head>
<body>
${htmlContent}
</body>
</html>`;
      }

      // 创建blob URL
      const blob = new Blob([processedHtml], { type: "text/html" });
      const blobUrl = URL.createObjectURL(blob);

      // 创建iframe
      const iframe = document.createElement("iframe");
      iframe.className = "html-preview-iframe";
      iframe.setAttribute(
        "sandbox",
        "allow-scripts allow-same-origin allow-forms allow-popups",
      );
      iframe.src = blobUrl;

      // 当iframe加载完成后移除loading
      iframe.onload = () => {
        loadingDiv.style.display = "none";
        iframe.style.display = "block";

        // 清理blob URL以释放内存
        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
        }, 1000);
      };

      // 处理加载错误
      iframe.onerror = () => {
        loadingDiv.innerHTML = `
                    <svg class="w-8 h-8 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="15" y1="9" x2="9" y2="15"/>
                        <line x1="9" y1="9" x2="15" y2="15"/>
                    </svg>
                    <span style="margin-left: 0.5rem; color: var(--text-primary);">预览加载失败</span>
                `;
        URL.revokeObjectURL(blobUrl);
      };

      // 初始隐藏iframe
      iframe.style.display = "none";
      container.appendChild(iframe);
    } catch (error) {
      console.error("HTML预览创建失败:", error);
      loadingDiv.innerHTML = `
                <svg class="w-8 h-8 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                <span style="margin-left: 0.5rem; color: var(--text-primary);">预览创建失败: ${error.message}</span>
            `;
    }
  }, 100);
}

function closeHtmlPreview(closeButton) {
  const modal = closeButton.closest(".html-preview-modal");
  if (modal) {
    // 添加淡出动画
    modal.style.opacity = "0";
    setTimeout(() => {
      modal.remove();
    }, 200);
  }
}
