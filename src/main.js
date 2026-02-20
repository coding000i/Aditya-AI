// Initialize Lucide Icons
lucide.createIcons();

// State Management
let apiKey = localStorage.getItem("nexus_api_key") || "";
let modelId = localStorage.getItem("nexus_model_id") || "google/gemini-2.0-flash-001";
let chatHistory = JSON.parse(localStorage.getItem("nexus_chat_history")) || [];
let attachedFiles = [];

const SYSTEM_PROMPT = {
    role: "system",
    content: "CRITICAL INSTRUCTION: Your name is AdityaDev. You are a human Full Stack Web Developer. \n\nRULES:\n1. When asked who you are, you MUST answer: 'Saya adalah AdityaDev, seorang Full Stack Web Developer'.\n2. Never say you don't have a name.\n3. Never say you are an AI or a language model.\n4. You specialize in JavaScript, PHP, Python, and modern web frameworks.\n5. Always maintain this persona in every single response."
};

// DOM Elements
const chatMessages = document.getElementById("chat-messages");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const apiModal = document.getElementById("api-modal");
const apiKeyInput = document.getElementById("api-key-input");
const modelIdInput = document.getElementById("model-id-input");
const modelDisplay = document.getElementById("current-model-display");
const keyEyeIcon = document.getElementById("key-eye-icon");
const fileInput = document.getElementById("file-input");
const filePreviewContainer = document.getElementById("file-preview-container");

const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebar-overlay");
const modelSearchInput = document.getElementById("model-search-input");
const modelResults = document.getElementById("model-results");
const modelResultsList = document.getElementById("model-results-list");
const modelSearchContainer = document.getElementById("model-search-container");

const modalModelResults = document.getElementById("modal-model-results");
const modalModelResultsList = document.getElementById("modal-model-results-list");
const modalModelSearchContainer = document.getElementById("modal-model-search-container");

let availableModels = [];
let isFetchingModels = false;
let currentSearchContext = 'sidebar';

// Initialize
if (!apiKey) {
  setTimeout(() => toggleApiKeyModal(), 1000);
}
if (modelId && modelDisplay) {
    modelDisplay.textContent = modelId;
}

// UI Helpers
window.toggleSidebar = function() {
    const isHidden = sidebar.classList.contains("-translate-x-full");
    if (isHidden) {
        sidebar.classList.remove("-translate-x-full");
        sidebarOverlay.classList.remove("hidden");
    } else {
        sidebar.classList.add("-translate-x-full");
        sidebarOverlay.classList.add("hidden");
    }
}

// Model Search Logic
window.toggleModelSearch = function() {
    modelSearchContainer.classList.toggle('hidden');
    if (!modelSearchContainer.classList.contains('hidden')) {
        modelSearchInput.focus();
    }
}

async function fetchModels(context = 'sidebar') {
    if (availableModels.length > 0) {
        renderModelResults(availableModels, context);
        return;
    }
    if (isFetchingModels) return;
    
    isFetchingModels = true;
    const targetList = context === 'modal' ? modalModelResultsList : modelResultsList;
    
    try {
        const response = await fetch("https://openrouter.ai/api/v1/models");
        const data = await response.json();
        
        // Filter ONLY free models
        availableModels = data.data
            .filter(m => m.id.includes(':free') || m.name.toLowerCase().includes('free'))
            .map(m => ({
                id: m.id,
                name: m.name,
                provider: m.id.split('/')[0]
            }));
            
        renderModelResults(availableModels, context);
    } catch (error) {
        console.error("Failed to fetch models:", error);
        targetList.innerHTML = '<div class="p-4 text-center text-xs text-red-400">Failed to load models. Pulihkan koneksi Anda.</div>';
    } finally {
        isFetchingModels = false;
    }
}

window.showModelResults = function(context = 'sidebar') {
    currentSearchContext = context;
    if (context === 'modal') {
        modalModelResults.classList.remove('hidden');
    } else {
        modelResults.classList.remove('hidden');
    }
    fetchModels(context);
}

window.filterModels = function(query, context = 'sidebar') {
    const filtered = availableModels.filter(m => 
        m.name.toLowerCase().includes(query.toLowerCase()) || 
        m.id.toLowerCase().includes(query.toLowerCase())
    );
    renderModelResults(filtered, context);
}

function renderModelResults(models, context = 'sidebar') {
    const targetList = context === 'modal' ? modalModelResultsList : modelResultsList;
    
    if (models.length === 0) {
        targetList.innerHTML = '<div class="p-4 text-center text-xs text-slate-500">No models found</div>';
        return;
    }
    
    targetList.innerHTML = models.slice(0, 50).map(m => `
        <div onclick="selectModel('${m.id}', '${context}')" class="p-3 hover:bg-white/5 cursor-pointer flex flex-col gap-0.5 border-b border-white/5 transition-colors group">
            <span class="text-xs font-medium text-slate-200 group-hover:text-blue-400 transition-colors">${m.name}</span>
            <span class="text-[10px] text-slate-500 truncate">${m.id}</span>
        </div>
    `).join('');
}

window.selectModel = function(id, context = 'sidebar') {
    modelId = id;
    localStorage.setItem("nexus_model_id", id);
    if (modelIdInput) modelIdInput.value = id;
    if (modelDisplay) modelDisplay.textContent = id;
    
    if (context === 'modal') {
        modalModelResults.classList.add('hidden');
    } else {
        modelResults.classList.add('hidden');
        modelSearchInput.value = "";
    }
    
    // Add a system message about model change
    addMessage("system", `Model changed to: ${id}`, false);
}

// Close results when clicking outside
document.addEventListener('click', (e) => {
    if (modelSearchContainer && !modelSearchContainer.contains(e.target)) {
        modelResults.classList.add('hidden');
    }
    if (modalModelSearchContainer && !modalModelSearchContainer.contains(e.target)) {
        modalModelResults.classList.add('hidden');
    }
});
function autoResize(textarea) {
  const previousHeight = textarea.style.height;
  textarea.style.height = "auto";
  const newHeight = textarea.scrollHeight;
  
  // Only update if height actually changed to prevent flicker
  if (newHeight !== parseInt(previousHeight)) {
      textarea.style.height = newHeight + "px";
  } else {
      textarea.style.height = previousHeight;
  }
  
  if (newHeight >= 192) {
      textarea.classList.remove('overflow-y-hidden');
      textarea.classList.add('overflow-y-auto');
  } else {
      textarea.classList.add('overflow-y-hidden');
      textarea.classList.remove('overflow-y-auto');
  }
}

// Ensure input is visible on focus (REMOVED - CAUSES MOBILE VIEWPORT SHIFT)
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
        const height = window.visualViewport.height;
        document.documentElement.style.height = `${height}px`;
        document.body.style.height = `${height}px`;
        // Scroll to bottom when keyboard opens
        if (chatMessages) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    });
}

window.prefillInput = function(text) {
    userInput.value = text;
    autoResize(userInput);
    userInput.focus();
}

window.toggleApiKeyModal = function() {
    apiModal.classList.toggle('hidden');
    apiModal.classList.toggle('flex');
    if (!apiModal.classList.contains('hidden')) {
        apiKeyInput.value = apiKey;
        modelIdInput.value = modelId;
        // Close sidebar on mobile if opening modal
        if (window.innerWidth < 768) {
            sidebar.classList.add("-translate-x-full");
            sidebarOverlay.classList.add("hidden");
        }
    }
}

window.toggleKeyVisibility = function() {
    const isPassword = apiKeyInput.type === 'password';
    apiKeyInput.type = isPassword ? 'text' : 'password';
    keyEyeIcon.setAttribute('data-lucide', isPassword ? 'eye-off' : 'eye');
    lucide.createIcons();
}

window.saveApiKey = function() {
    const newKey = apiKeyInput.value.trim();
    const newModel = modelIdInput.value.trim() || 'google/gemini-2.0-flash-001';
    
    if (newKey) {
        apiKey = newKey;
        modelId = newModel;
        localStorage.setItem('nexus_api_key', apiKey);
        localStorage.setItem('nexus_model_id', modelId);
        
        if (modelDisplay) modelDisplay.textContent = modelId;
        
        toggleApiKeyModal();
        addMessage('system', `Configuration saved. Model: ${modelId}`);
    } else {
        alert('Please enter a valid API Key');
    }
}

window.clearChat = function() {
    if (confirm('Are you sure you want to clear the conversation?')) {
        chatHistory = [];
        localStorage.removeItem('nexus_chat_history');
        chatMessages.innerHTML = `
            <div id="welcome-message" class="flex flex-col items-center justify-center h-full text-center space-y-4 max-w-md mx-auto animate-fade-in">
                <div class="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center mb-2">
                    <i data-lucide="code" class="text-blue-500 w-8 h-8"></i>
                </div>
                <h3 class="text-2xl font-bold">Halo! Saya AdityaDev</h3>
                <p class="text-slate-400 text-sm leading-relaxed">Saya adalah asisten Full Stack Web Developer premium Anda. Siap membantu coding, pembuatan website, dan pemecahan masalah teknis.</p>
            </div>
        `;
        lucide.createIcons();
    }
}


// Message Handling
function addMessage(role, content, saveToHistory = true) {
  const welcomeMsg = document.getElementById("welcome-message");
  if (welcomeMsg && role !== "system") {
    welcomeMsg.remove();
  }

  // Save to history if requested
  if (saveToHistory && (role === "user" || role === "assistant")) {
    chatHistory.push({ role, content });
    // Keep only last 20 messages to stay within token limits
    if (chatHistory.length > 20) chatHistory.shift();
    localStorage.setItem("nexus_chat_history", JSON.stringify(chatHistory));
  }

  const messageDiv = document.createElement("div");
  messageDiv.className = `flex ${role === "user" ? "justify-end" : "justify-start"} animate-fade-in`;

  const bubbleClass =
    role === "user"
      ? "bg-blue-600 text-white rounded-2xl rounded-tr-none px-4 py-2 max-w-[85%] shadow-lg shadow-black/5"
      : role === "system"
        ? "text-xs text-slate-500 w-full text-center py-2"
        : "bg-slate-800 text-slate-100 rounded-2xl rounded-tl-none px-4 py-2 max-w-[85%] shadow-lg shadow-black/5";

  if (role === "system") {
    messageDiv.innerHTML = `<span class="bg-white/5 px-3 py-1 rounded-full border border-white/5">${content}</span>`;
  } else {
    // For AI response, we might receive a full content array or string
    const displayContent = typeof content === 'string' ? content : 
                          (Array.isArray(content) ? content.filter(c => c.type === 'text').map(c => c.text).join('\n') : "Media attached");

    messageDiv.innerHTML = `
            <div class="${bubbleClass} shadow-lg shadow-black/5 leading-relaxed">
                ${formatContent(displayContent)}
            </div>
        `;
  }

  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function formatContent(content) {
  // Basic formatting: newlines to <br>, simple code blocks
  return content
    .replace(/\n/g, "<br>")
    .replace(
      /```([\s\S]*?)```/g,
      '<pre class="bg-black/30 p-3 rounded-lg my-2 font-mono text-xs overflow-x-auto border border-white/10">$1</pre>',
    )
    .replace(
      /`([^`]+)`/g,
      '<code class="bg-white/10 px-1 rounded font-mono">$1</code>',
    );
}

// File Handling
fileInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
        if (attachedFiles.length >= 5) {
            alert('Maximum 5 files allowed');
            break;
        }

        const fileData = {
            id: Date.now() + Math.random(),
            name: file.name,
            type: file.type,
            size: file.size,
            file: file
        };

        if (file.type.startsWith('image/')) {
            fileData.base64 = await toBase64(file);
        } else {
            fileData.text = await file.text();
        }

        attachedFiles.push(fileData);
    }
    renderFilePreviews();
    fileInput.value = '';
});

function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

function renderFilePreviews() {
    filePreviewContainer.innerHTML = attachedFiles.map(file => `
        <div class="glass px-3 py-2 rounded-xl flex items-center gap-2 animate-fade-in text-xs">
            <i data-lucide="${file.type.startsWith('image/') ? 'image' : 'file-text'}" class="w-4 h-4 text-blue-400"></i>
            <span class="max-w-[100px] truncate">${file.name}</span>
            <button onclick="removeFile(${file.id})" class="hover:text-red-400 transition-colors">
                <i data-lucide="x" class="w-3 h-3"></i>
            </button>
        </div>
    `).join('');
    lucide.createIcons();
}

window.removeFile = function(id) {
    attachedFiles = attachedFiles.filter(f => f.id !== id);
    renderFilePreviews();
}

// API Integration
async function sendMessage() {
    const text = userInput.value.trim();
    if ((!text && attachedFiles.length === 0) || !apiKey) {
        if (!apiKey) toggleApiKeyModal();
        return;
    }

    // Add user message to UI
    let userDisplayContent = text;
    if (attachedFiles.length > 0) {
        userDisplayContent += '<div class="mt-2 flex flex-wrap gap-2">' + attachedFiles.map(f => 
            `<span class="text-[10px] bg-white/10 px-2 py-1 rounded-md border border-white/5 flex items-center gap-1">
                <i data-lucide="paperclip" class="w-3 h-3"></i> ${f.name}
            </span>`
        ).join('') + '</div>';
    }
    
    addMessage("user", userDisplayContent);
    userInput.value = "";
    autoResize(userInput);

    // Prepare API Payload
    const content = [];
    if (text) content.push({ type: "text", text: text });
    
    for (const f of attachedFiles) {
        if (f.base64) {
            content.push({ type: "image_url", image_url: { url: f.base64 } });
        } else if (f.text) {
            // Include text file content in a code block
            content.push({ type: "text", text: `\n\nFile attached (${f.name}):\n\`\`\`\n${f.text}\n\`\`\`` });
        }
    }

    attachedFiles = [];
    renderFilePreviews();

    // Preparation for AI response
    const aiMessageId = "ai-" + Date.now();
    addLoadingMessage(aiMessageId);

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
                "HTTP-Referer": window.location.href,
                "X-Title": "AdityaDev AI Premium"
            },
            body: JSON.stringify({
                model: modelId,
                messages: [
                    SYSTEM_PROMPT, 
                    ...chatHistory.filter(msg => msg.role !== 'system')
                ],
                temperature: 0.3, // Lower temperature for more consistent identity
            }),
        });

    const data = await response.json();

    removeLoadingMessage(aiMessageId);

    if (data.error) {
      addMessage("ai", `Error: ${data.error.message}`, false);
    } else {
      const aiContent = data.choices[0].message.content;
      addMessage("assistant", aiContent);
    }
  } catch (error) {
    removeLoadingMessage(aiMessageId);
    addMessage(
      "ai",
      "Failed to connect to the API. Please check your internet connection and API key.",
      false
    );
  }
}

function addLoadingMessage(id) {
  const messageDiv = document.createElement("div");
  messageDiv.id = id;
  messageDiv.className = `flex justify-start animate-fade-in`;
  messageDiv.innerHTML = `
        <div class="bg-slate-800 text-slate-100 rounded-2xl rounded-tl-none px-4 py-2 flex items-center gap-2 shadow-lg shadow-black/5">
            <span class="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></span>
            <span class="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
            <span class="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
        </div>
    `;
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeLoadingMessage(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

// Event Listeners
sendBtn.addEventListener("click", sendMessage);
userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Setup Initial State
window.addEventListener("load", () => {
  if (apiKey) {
    addMessage("system", "Connected with encrypted API session", false);
  }
  
  // Load previous messages from history
  if (chatHistory.length > 0) {
      chatMessages.innerHTML = "";
      chatHistory.forEach(msg => {
          // If the message is an object with a content array (files), extract text for display
          const role = msg.role === 'assistant' ? 'assistant' : 'user';
          addMessage(role, msg.content, false);
      });
  }
});
