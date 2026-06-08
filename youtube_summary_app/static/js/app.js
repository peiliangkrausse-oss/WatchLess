const api = {
  models: "/api/models",
  modelLoad: "/api/models/load",
  modelUnload: "/api/models/unload",
  prompt: "/api/prompt",
  promptReset: "/api/prompt/reset",
  promptPresets: "/api/prompt/presets",
  videoMetadata: "/api/videos/metadata",
  chat: "/api/chat",
  chatStream: "/api/chat/stream",
  jobs: "/api/jobs",
  history: "/api/history"
};

const layout = document.getElementById("layout");
const content = document.querySelector(".content");
const resizer = document.getElementById("resizer");
const summaryPanel = document.getElementById("summaryPanel");
const summary = document.getElementById("summary");
const status = document.getElementById("status");
const summarizeBtn = document.getElementById("summarizeBtn");
const copyBtn = document.getElementById("copyBtn");
const guideBtn = document.getElementById("guideBtn");
const speakBtn = document.getElementById("speakBtn");
const chatBtn = document.getElementById("chatBtn");
const chatPanel = document.getElementById("chatPanel");
const chatCloseBtn = document.getElementById("chatCloseBtn");
const chatMessages = document.getElementById("chatMessages");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatSendBtn = document.getElementById("chatSendBtn");
const chatSubtitle = document.getElementById("chatSubtitle");
const chatFileBtn = document.getElementById("chatFileBtn");
const chatImageBtn = document.getElementById("chatImageBtn");
const chatFileInput = document.getElementById("chatFileInput");
const chatImageInput = document.getElementById("chatImageInput");
const feedbackText = document.getElementById("feedbackText");
const sendFeedbackBtn = document.getElementById("sendFeedbackBtn");
const donationBtn = document.getElementById("donationBtn");
const zoomInBtn = document.getElementById("zoomInBtn");
const zoomOutBtn = document.getElementById("zoomOutBtn");
const toast = document.getElementById("toast");
const modelSelect = document.getElementById("model");
const modelStatus = document.getElementById("modelStatus");
const loadModelBtn = document.getElementById("loadModelBtn");
const unloadModelBtn = document.getElementById("unloadModelBtn");
const advancedHint = document.getElementById("advancedHint");
const promptEditor = document.getElementById("promptEditor");
const promptStatus = document.getElementById("promptStatus");
const viewPresetsBtn = document.getElementById("viewPresetsBtn");
const presetDrawer = document.getElementById("presetDrawer");
const presetNameInput = document.getElementById("presetNameInput");
const savePresetBtn = document.getElementById("savePresetBtn");
const presetList = document.getElementById("presetList");
const chromeTabs = document.getElementById("chromeTabs");
const newTabBtn = document.getElementById("newTabBtn");
const queueList = document.getElementById("queueList");
const progressTrack = document.getElementById("progressTrack");
const progressFill = document.getElementById("progressFill");
const summaryTitleText = document.getElementById("summaryTitleText");
const urlInput = document.getElementById("url");

const state = {
  tabs: [],
  activeTabId: "",
  jobs: new Map(),
  pollTimer: null,
  progressTimer: null,
  modelInventory: null,
  promptPresets: [],
  chatHistory: new Map()
};

const attachedFiles = [];

let dragging = false;
let speechActive = false;
let userZoom = Number(localStorage.getItem("ytUserZoom")) || 1;

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function activeTab() {
  return state.tabs.find((tab) => tab.id === state.activeTabId) || state.tabs[0];
}

function applyZoom() {
  document.documentElement.style.setProperty("--user-zoom", userZoom.toFixed(2));
  localStorage.setItem("ytUserZoom", userZoom.toFixed(2));
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 1500);
}

function setButtonLabel(btn, label) {
  const span = btn.querySelector("span");
  if (span) span.textContent = label;
}

function playFinishAnimation() {
  summaryPanel.classList.remove("finish-flash");
  void summaryPanel.offsetWidth;
  summaryPanel.classList.add("finish-flash");
  clearTimeout(playFinishAnimation.timer);
  playFinishAnimation.timer = setTimeout(() => summaryPanel.classList.remove("finish-flash"), 1200);
}

function addRipple(event) {
  const btn = event.currentTarget;
  const rect = btn.getBoundingClientRect();
  const ripple = document.createElement("span");
  const size = Math.max(rect.width, rect.height);
  ripple.className = "ripple";
  ripple.style.width = ripple.style.height = `${size}px`;
  ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
  ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
  btn.appendChild(ripple);
  setTimeout(() => ripple.remove(), 650);
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || `Request failed: ${response.status}`);
  }
  return data;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function markdownToHtml(markdown) {
  if (window.marked) return marked.parse(markdown || "");
  return `<pre>${escapeHtml(markdown)}</pre>`;
}

function cleanSummaryText(markdown = "") {
  return String(markdown || "")
    .replace(/^Source:\s+\S+\s*/gim, "")
    .replace(/^Model:\s+.+\s*/gim, "")
    .trim();
}

function chatKeyForTab(tab = activeTab()) {
  return tab?.historyId || "";
}

function selectedModelSupportsUploads() {
  const selected = modelSelect.value;
  const models = state.modelInventory?.models || [];
  const model = models.find((item) => item.key === selected) || {};
  const label = `${selected} ${model.display_name || ""}`.toLowerCase();
  return /\b(vl|vision|visual|llava|bakllava|moondream|pixtral|qwen2-vl|qwen-vl|gemma-3|gemma 3|oss|gpt-oss)\b/.test(label);
}

function updateChatUploadControls() {
  const enabled = selectedModelSupportsUploads();
  for (const button of [chatFileBtn, chatImageBtn]) {
    button.disabled = !enabled;
  }
  const label = enabled ? "Upload available for this model" : "Upload unavailable for this model";
  chatFileBtn.title = label;
  chatImageBtn.title = label;
}

function setZoom(nextZoom) {
  userZoom = Math.max(.72, Math.min(1.65, nextZoom));
  applyZoom();
  showToast(`Zoom ${Math.round(userZoom * 100)}%`);
}

function parseUrls(value = urlInput.value) {
  const matches = value.match(/https?:\/\/[^\s,]+/g) || [];
  return [...new Set(matches.map((url) => url.trim()))];
}

function titleFromUrl(url) {
  try {
    const parsed = new URL(url);
    const id = parsed.searchParams.get("v") || parsed.pathname.split("/").filter(Boolean).pop();
    return id ? `Resolving title for ${id}` : "New Summary";
  } catch {
    return "New Summary";
  }
}

async function fetchVideoMetadata(urls) {
  try {
    const data = await requestJson(api.videoMetadata, {
      method: "POST",
      body: JSON.stringify({ urls })
    });
    const titleMap = {};
    for (const item of data.items || []) {
      if (item.url && item.title) titleMap[item.url] = item.title;
    }
    return titleMap;
  } catch {
    return {};
  }
}

function setProgress(percent, visible) {
  progressTrack.hidden = !visible;
  progressFill.style.width = `${Math.max(0, Math.min(100, Number(percent) || 0))}%`;
}

function visibleProgress(tab) {
  if (!tab) return 0;
  const raw = Number(tab.progress) || 0;
  const statusName = tab.jobStatus || tab.status;
  if (statusName === "running") {
    const age = Math.max(0, Date.now() - (tab.startedAt || Date.now()));
    const eased = 88 * (1 - Math.exp(-age / 9500));
    return Math.max(raw, Math.min(88, eased));
  }
  if (statusName === "queued") return Math.max(raw, 6);
  return raw;
}

function progressMeta(tab) {
  if (!tab) return "";
  const statusName = tab.jobStatus || tab.status;
  const pieces = [];
  if (statusName === "queued") pieces.push("Queued");
  if (statusName === "running") pieces.push(tab.statusText || tab.message || "Generating summary");
  if (statusName === "succeeded") pieces.push("Done");
  if (statusName === "failed") pieces.push("Failed");
  if (tab.tokensPerSecond || tab.tokens_per_second) pieces.push(`${tab.tokensPerSecond || tab.tokens_per_second} tok/s`);
  return pieces.join(" · ");
}

function updateProgressViews() {
  const tab = activeTab();
  const show = tab && ["queued", "running"].includes(tab.jobStatus);
  if (show) {
    const percent = visibleProgress(tab);
    setProgress(percent, true);
    const loadingBar = summary.querySelector(".summary-loading__bar span");
    const loadingPercent = summary.querySelector(".summary-loading__top span");
    const loadingMeta = summary.querySelector(".summary-loading__meta");
    if (loadingBar) loadingBar.style.width = `${Math.max(5, Math.min(100, percent))}%`;
    if (loadingPercent) loadingPercent.textContent = `${Math.round(percent)}%`;
    if (loadingMeta) loadingMeta.textContent = progressMeta(tab) || "Queued";
  } else {
    setProgress(0, false);
  }
  chromeTabs.querySelectorAll("[data-tab-id]").forEach((button) => {
    const item = state.tabs.find((candidate) => candidate.id === button.dataset.tabId);
    const bar = button.querySelector(".tab-progress span");
    if (item && bar) bar.style.width = `${Math.max(4, Math.min(100, visibleProgress(item)))}%`;
  });
}

function startProgressTicker() {
  if (state.progressTimer) return;
  const tick = () => {
    updateProgressViews();
    const hasActiveProgress = state.tabs.some((tab) => ["queued", "running"].includes(tab.jobStatus));
    state.progressTimer = hasActiveProgress ? requestAnimationFrame(tick) : null;
  };
  state.progressTimer = requestAnimationFrame(tick);
}

function guideHtml() {
  return `
    <div class="setup-guide">
      <div class="hero">
        <h2>Make local AI work without guessing.</h2>
        <p>This app summarizes with the model running on your computer. Set up LM Studio once, then daily use is just paste links and summarize.</p>
      </div>
      <div class="guide-grid">
        <div class="guide-card">
          <h3>1. Download LM Studio</h3>
          <ol>
            <li>Open your browser and go to lmstudio.ai.</li>
            <li>Download LM Studio for macOS.</li>
            <li>Install it like any other Mac app.</li>
          </ol>
        </div>
        <div class="guide-card">
          <h3>2. Choose a model for your RAM</h3>
          <ul>
            <li>Minimum: 8 GB RAM. Pick a small 2B-4B instruct model.</li>
            <li>Recommended: 16 GB RAM. Pick a 4B-8B quantized model.</li>
            <li>Best: 32 GB+ RAM. Larger 12B-20B quantized models may work.</li>
          </ul>
        </div>
        <div class="guide-card">
          <h3>3. Start the server</h3>
          <ol>
            <li>Open LM Studio.</li>
            <li>Load exactly one chat or instruct model.</li>
            <li>Open the Developer or Local Server area.</li>
            <li>Start the OpenAI-compatible server on port 1234.</li>
          </ol>
        </div>
        <div class="guide-card">
          <h3>4. Summarize safely</h3>
          <ul>
            <li>Use the model dropdown to preview downloaded models.</li>
            <li>Unload the current model before loading a different one.</li>
            <li>Paste one or many YouTube links; the app queues them one at a time.</li>
          </ul>
        </div>
      </div>
    </div>`;
}

function emptyHtml(message) {
  return `<div class="empty"><svg viewBox="0 0 24 24" fill="none"><path d="M8 5.5v13l10-6.5-10-6.5Z" fill="currentColor"/><path d="M4 5h1M4 12h1M4 19h1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><div>${escapeHtml(message)}</div></div>`;
}

function loadingHtml(tab) {
  const percent = visibleProgress(tab);
  return `
    <div class="summary-loading">
      <div class="summary-loading__top">
        <strong>${escapeHtml(tab.title || "Preparing summary")}</strong>
        <span>${Math.round(percent)}%</span>
      </div>
      <div class="summary-loading__bar"><span style="width:${Math.max(5, Math.min(100, percent))}%"></span></div>
      <div class="summary-loading__meta">${escapeHtml(progressMeta(tab) || "Queued")}</div>
    </div>`;
}

function createTab({ title = "New Summary", type = "draft", url = "", markdown = "", statusText = "", jobId = "", historyId = "", activate = true } = {}) {
  const tab = {
    id: uid("tab"),
    title,
    type,
    url,
    markdown,
    statusText,
    jobId,
    historyId,
    progress: 0,
    jobStatus: "",
    startedAt: 0,
    tokensPerSecond: null,
    completionTokens: null,
    elapsedSeconds: null,
    error: ""
  };
  state.tabs.push(tab);
  if (activate) activateTab(tab.id);
  renderTabs();
  return tab;
}

function createGuideTab() {
  const existing = state.tabs.find((tab) => tab.type === "guide");
  if (existing) {
    activateTab(existing.id);
    return existing;
  }
  return createTab({ title: "LM Studio Setup", type: "guide" });
}

function activateTab(tabId) {
  saveActiveDraft();
  state.activeTabId = tabId;
  const tab = activeTab();
  if (!tab) return;
  summaryTitleText.textContent = tab.title;
  if (["draft", "job"].includes(tab.type)) {
    urlInput.value = tab.url || "";
  }
  setProgress(visibleProgress(tab), ["queued", "running"].includes(tab.jobStatus));
  if (tab.type === "guide") {
    summary.innerHTML = guideHtml();
  } else if (tab.error) {
    summary.innerHTML = `<div class="error-card"><strong>Something needs attention.</strong><br>${escapeHtml(tab.error)}</div>`;
  } else if (tab.markdown) {
    summary.innerHTML = markdownToHtml(cleanSummaryText(tab.markdown));
  } else if (["queued", "running"].includes(tab.jobStatus)) {
    summary.innerHTML = loadingHtml(tab);
  } else if (tab.statusText) {
    summary.innerHTML = emptyHtml(tab.statusText);
  } else {
    summary.innerHTML = emptyHtml("Paste a YouTube URL in this tab, or press Ctrl+N for another tab.");
  }
  renderTabs();
  renderQueue();
  updateProgressViews();
  if (!chatPanel.hidden) {
    loadChatMemory(tab).finally(renderChatMessages);
  }
}

function closeTab(tabId, event) {
  if (event) event.stopPropagation();
  if (state.tabs.length === 1) {
    const only = state.tabs[0];
    only.title = "New Summary";
    only.type = "draft";
    only.url = "";
    only.markdown = "";
    only.error = "";
    only.statusText = "";
    activateTab(only.id);
    return;
  }
  const index = state.tabs.findIndex((tab) => tab.id === tabId);
  if (index === -1) return;
  state.tabs.splice(index, 1);
  if (state.activeTabId === tabId) {
    const next = state.tabs[Math.max(0, index - 1)];
    state.activeTabId = next.id;
  }
  activateTab(state.activeTabId);
}

function saveActiveDraft() {
  const tab = activeTab();
  if (!tab || !["draft", "job"].includes(tab.type)) return;
  tab.url = urlInput.value.trim();
  if (tab.type === "draft" && tab.url && tab.title === "New Summary") tab.title = titleFromUrl(tab.url);
}

function renderTabs() {
  chromeTabs.innerHTML = "";
  for (const tab of state.tabs) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.tabId = tab.id;
    btn.className = `chrome-tab ${tab.id === state.activeTabId ? "is-active" : ""} ${tab.jobStatus === "running" || tab.jobStatus === "queued" ? "is-running" : ""} ${tab.jobStatus === "failed" || tab.error ? "is-failed" : ""} ${tab.type === "history" ? "is-saved" : ""}`;
    btn.title = tab.title;
    btn.innerHTML = `
      <span class="tab-label">${escapeHtml(tab.title)}</span>
      ${["queued", "running"].includes(tab.jobStatus) ? `<span class="tab-progress"><span style="width:${Math.max(4, Math.min(100, visibleProgress(tab)))}%"></span></span>` : ""}
      <span class="tab-close" title="Close tab">x</span>`;
    btn.addEventListener("click", () => activateTab(tab.id));
    btn.querySelector(".tab-close").addEventListener("click", (event) => closeTab(tab.id, event));
    chromeTabs.appendChild(btn);
  }
}

function renderQueue() {
  const jobs = [...state.jobs.values()].filter((job) => ["queued", "running", "failed"].includes(job.status));
  if (!jobs.length) {
    queueList.innerHTML = '<div class="queue-empty">No active jobs.</div>';
    return;
  }
  queueList.innerHTML = jobs.map((job) => `
    <button class="queue-item" type="button" data-job-id="${job.id}">
      <strong>${escapeHtml(job.title || titleFromUrl(job.url))}</strong>
      ${escapeHtml(job.status)} · ${Math.round(visibleProgress(job))}% · ${escapeHtml(job.message || job.error || "")}${job.tokens_per_second ? ` · ${escapeHtml(job.tokens_per_second)} tok/s` : ""}
    </button>
  `).join("");
  queueList.querySelectorAll("[data-job-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = state.tabs.find((item) => item.jobId === btn.dataset.jobId);
      if (tab) activateTab(tab.id);
    });
  });
}

function showError(message, type) {
  const title = type === "model_memory" ? "LM Studio model/memory issue." : "Something needs attention.";
  status.innerHTML = `<div class="error-card"><strong>${escapeHtml(title)}</strong><br>${escapeHtml(message)}</div>`;
}

function updateTabFromJob(job) {
  const tab = state.tabs.find((item) => item.jobId === job.id);
  if (!tab) return;
  tab.title = job.title || titleFromUrl(job.url);
  tab.url = job.url;
  tab.jobStatus = job.status;
  tab.progress = job.progress;
  if (job.status === "running" && !tab.startedAt) tab.startedAt = Date.now();
  tab.statusText = job.message || "";
  tab.tokensPerSecond = job.tokens_per_second || tab.tokensPerSecond;
  tab.completionTokens = job.completion_tokens || tab.completionTokens;
  tab.elapsedSeconds = job.elapsed_seconds || tab.elapsedSeconds;
  tab.error = job.error || "";
  if (job.summary) {
    tab.markdown = cleanSummaryText(job.summary);
    tab.type = "history";
    tab.historyId = job.history_id || tab.historyId;
  }
  if (tab.id === state.activeTabId) activateTab(tab.id);
}

async function refreshModels() {
  modelStatus.className = "model-status";
  modelStatus.textContent = "Checking LM Studio model...";
  modelSelect.innerHTML = '<option value="">Loading models...</option>';
  loadModelBtn.disabled = true;
  unloadModelBtn.disabled = true;
  try {
    const response = await fetch(api.models);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || `Request failed: ${response.status}`);
    }
    state.modelInventory = data;
    modelSelect.innerHTML = "";
    const available = data.models || [];
    if (!available.length) {
      modelSelect.innerHTML = '<option value="">No local chat models found</option>';
    }
    for (const model of available) {
      const option = document.createElement("option");
      option.value = model.key;
      const details = [model.params_string, model.quantization && model.quantization.name].filter(Boolean).join(" ");
      option.textContent = `${model.loaded ? "Loaded: " : ""}${model.display_name || model.key}${details ? ` (${details})` : ""}`;
      modelSelect.appendChild(option);
    }
    if (data.current_model) modelSelect.value = data.current_model;
    if (data.current_model) {
      modelStatus.textContent = `🟢 Model loaded: ${data.current_model}`;
      advancedHint.textContent = "Model loaded";
    } else if (data.status === "no_model") {
      modelStatus.textContent = "🟡 LM Studio is connected. Choose a model and click Use This Model.";
      advancedHint.textContent = "Load a model";
      modelStatus.classList.add("warning");
    } else if (data.status === "multiple_models") {
      modelStatus.textContent = "🔴 Multiple models are loaded. Unload extras before summarizing.";
      advancedHint.textContent = "Too many models";
      modelStatus.classList.add("error");
    } else {
      modelStatus.textContent = `🔴 ${data.message || "LM Studio needs attention."}`;
      advancedHint.textContent = "Needs LM Studio";
      modelStatus.classList.add("error");
    }
    updateModelButtons();
  } catch (error) {
    state.modelInventory = null;
    modelSelect.innerHTML = '<option value="">LM Studio unavailable</option>';
    modelStatus.textContent = "🔴 LM Studio is not connected. Start the local server at http://127.0.0.1:1234.";
    modelStatus.classList.add("error");
    advancedHint.textContent = "Needs LM Studio";
    summarizeBtn.disabled = true;
  }
}

function updateModelButtons() {
  const inventory = state.modelInventory;
  const selected = modelSelect.value;
  const loaded = inventory ? inventory.loaded_models || [] : [];
  const selectedLoaded = loaded.includes(selected);
  summarizeBtn.disabled = !(inventory && inventory.ok);
  loadModelBtn.disabled = !selected || selectedLoaded || loaded.length > 0 || !inventory || inventory.source !== "native_v1";
  unloadModelBtn.disabled = !inventory || !loaded.length || inventory.source !== "native_v1";
  updateChatUploadControls();
}

async function loadSelectedModel() {
  const selected = modelSelect.value;
  try {
    modelStatus.textContent = "Loading model into LM Studio...";
    loadModelBtn.disabled = true;
    await requestJson(api.modelLoad, { method: "POST", body: JSON.stringify({ model: selected }) });
    showToast("Model ready");
    await refreshModels();
  } catch (error) {
    showError(error.message, "model_load_error");
    await refreshModels();
  }
}

async function unloadLoadedModel() {
  const inventory = state.modelInventory;
  const loaded = inventory ? inventory.loaded_models || [] : [];
  const selected = loaded.includes(modelSelect.value) ? modelSelect.value : loaded[0];
  try {
    modelStatus.textContent = "Stopping current model...";
    unloadModelBtn.disabled = true;
    await requestJson(api.modelUnload, { method: "POST", body: JSON.stringify({ instance_id: selected }) });
    showToast("Model stopped");
    await refreshModels();
  } catch (error) {
    showError(error.message, "model_unload_error");
    await refreshModels();
  }
}

async function loadPromptPreset() {
  try {
    const data = await requestJson(api.prompt);
    promptEditor.value = data.prompt || "";
    promptStatus.textContent = data.is_default ? "Using built-in default prompt." : "Using your saved custom prompt.";
  } catch {
    promptStatus.textContent = "Could not connect to prompt preset storage.";
  }
}

async function savePromptPreset() {
  const prompt = promptEditor.value.trim();
  if (!prompt) {
    promptStatus.textContent = "Prompt cannot be empty. Reset to default instead.";
    return;
  }
  try {
    const data = await requestJson(api.prompt, { method: "POST", body: JSON.stringify({ prompt }) });
    promptEditor.value = data.prompt;
    promptStatus.textContent = "Saved. This is now your default prompt.";
    showToast("Prompt saved");
  } catch (error) {
    promptStatus.textContent = error.message;
  }
}

async function resetPromptPreset() {
  try {
    const data = await requestJson(api.promptReset, { method: "POST" });
    promptEditor.value = data.prompt;
    promptStatus.textContent = "Reset to built-in default prompt.";
    showToast("Prompt reset");
  } catch (error) {
    promptStatus.textContent = error.message;
  }
}

async function loadPromptPresets() {
  try {
    const data = await requestJson(api.promptPresets);
    state.promptPresets = data.presets || [];
    renderPromptPresets();
  } catch (error) {
    presetList.innerHTML = `<div class="queue-empty">${escapeHtml(error.message)}</div>`;
  }
}

function renderPromptPresets() {
  if (!state.promptPresets.length) {
    presetList.innerHTML = '<div class="queue-empty">No saved presets yet.</div>';
    return;
  }
  presetList.innerHTML = state.promptPresets.map((preset) => `
    <div class="preset-item" data-preset-id="${escapeHtml(preset.id)}">
      <button class="preset-use" type="button" data-preset-action="use">
        <strong>${escapeHtml(preset.name || "Prompt preset")}</strong>
        <span>${preset.is_builtin ? "built in" : "saved locally"}</span>
      </button>
      ${preset.is_builtin ? "" : `
        <button class="preset-icon-action" type="button" data-preset-action="rename" title="Rename preset">Rename</button>
        <button class="preset-icon-action danger" type="button" data-preset-action="delete" title="Delete preset">Delete</button>
      `}
    </div>
  `).join("");
  presetList.querySelectorAll("[data-preset-action]").forEach((button) => {
    button.addEventListener("click", (event) => {
      const item = event.currentTarget.closest("[data-preset-id]");
      const presetId = item?.dataset.presetId;
      if (!presetId) return;
      const action = event.currentTarget.dataset.presetAction;
      if (action === "use") usePromptPreset(presetId);
      if (action === "rename") renamePromptPreset(presetId);
      if (action === "delete") deletePromptPreset(presetId);
    });
  });
}

async function usePromptPreset(presetId) {
  try {
    const data = await requestJson(`${api.promptPresets}/${encodeURIComponent(presetId)}`);
    promptEditor.value = data.preset.prompt || "";
    promptStatus.textContent = `Loaded preset: ${data.preset.name || "Prompt preset"}. Click Save as Default to make it your default.`;
    showToast("Preset loaded");
  } catch (error) {
    promptStatus.textContent = error.message;
  }
}

async function saveCurrentAsPreset() {
  const prompt = promptEditor.value.trim();
  const name = presetNameInput.value.trim();
  if (!prompt) {
    promptStatus.textContent = "Prompt cannot be empty.";
    return;
  }
  try {
    const data = await requestJson(api.promptPresets, {
      method: "POST",
      body: JSON.stringify({ name, prompt })
    });
    presetNameInput.value = "";
    promptStatus.textContent = `Saved preset: ${data.preset.name}.`;
    showToast("Preset saved");
    await loadPromptPresets();
  } catch (error) {
    promptStatus.textContent = error.message;
  }
}

async function renamePromptPreset(presetId) {
  const preset = state.promptPresets.find((item) => item.id === presetId);
  const name = window.prompt("Rename preset", preset?.name || "");
  if (name === null) return;
  try {
    const data = await requestJson(`${api.promptPresets}/${encodeURIComponent(presetId)}/rename`, {
      method: "POST",
      body: JSON.stringify({ name })
    });
    promptStatus.textContent = `Renamed preset: ${data.preset.name}.`;
    showToast("Preset renamed");
    await loadPromptPresets();
  } catch (error) {
    promptStatus.textContent = error.message;
  }
}

async function deletePromptPreset(presetId) {
  const preset = state.promptPresets.find((item) => item.id === presetId);
  if (!window.confirm(`Delete "${preset?.name || "this preset"}"?`)) return;
  try {
    await requestJson(`${api.promptPresets}/${encodeURIComponent(presetId)}/delete`, { method: "POST" });
    promptStatus.textContent = "Preset deleted.";
    showToast("Preset deleted");
    await loadPromptPresets();
  } catch (error) {
    promptStatus.textContent = error.message;
  }
}

async function loadHistoryTabs() {
  try {
    const data = await requestJson(api.history);
    for (const item of (data.items || []).slice(0, 4)) {
      state.tabs.push({
        id: uid("tab"),
        title: item.title || "Saved summary",
        type: "history",
        url: item.url || "",
        markdown: "",
        statusText: "Click to load saved Markdown history.",
        jobId: "",
        historyId: item.id,
        progress: 0,
        jobStatus: "",
        error: ""
      });
    }
    renderTabs();
  } catch {
    renderTabs();
  }
}

async function loadHistoryItem(tab) {
  if (!tab.historyId || tab.markdown) return;
  try {
    const data = await requestJson(`${api.history}/${encodeURIComponent(tab.historyId)}`);
    const item = data.item;
    tab.title = item.title || tab.title;
    tab.markdown = cleanSummaryText(item.summary || item.markdown || "");
    tab.url = item.url || tab.url;
    tab.statusText = "";
  } catch (error) {
    tab.error = error.message;
  }
}

async function summarize() {
  saveActiveDraft();
  const urls = parseUrls();
  status.innerHTML = "";
  if (!urls.length) {
    showError("Paste at least one YouTube URL first.", "missing_url");
    return;
  }
  summarizeBtn.disabled = true;
  summarizeBtn.style.opacity = ".72";
  try {
    status.innerHTML = `Reading video titles<span class="loading-dot"></span>`;
    const titleMap = await fetchVideoMetadata(urls);
    const tabMap = {};
    for (const url of urls) {
      const existingDraft = activeTab();
      const canReuseActive = urls.length === 1 && existingDraft && existingDraft.type === "draft" && !existingDraft.markdown && !existingDraft.jobId;
      const tab = canReuseActive ? existingDraft : createTab({ activate: false });
      tab.type = "job";
      tab.title = titleMap[url] || titleFromUrl(url);
      tab.url = url;
      tab.jobStatus = "queued";
      tab.statusText = "Waiting in queue...";
      tab.progress = 0;
      tab.startedAt = 0;
      tab.tokensPerSecond = null;
      tab.completionTokens = null;
      tab.elapsedSeconds = null;
      tabMap[url] = tab;
    }
    activateTab(tabMap[urls[0]].id);
    const data = await requestJson(api.jobs, {
      method: "POST",
      body: JSON.stringify({ urls, model: modelSelect.value, titles: titleMap })
    });
    for (const job of data.jobs || []) {
      state.jobs.set(job.id, job);
      const tab = tabMap[job.url] || createTab({ activate: false });
      tab.type = "job";
      tab.title = job.title || tab.title || titleFromUrl(job.url);
      tab.url = job.url;
      tab.jobId = job.id;
      tab.jobStatus = job.status;
      tab.statusText = job.message;
      tab.progress = job.progress;
      tab.startedAt = job.status === "running" ? Date.now() : 0;
    }
    if (data.jobs && data.jobs[0]) {
      const first = state.tabs.find((tab) => tab.jobId === data.jobs[0].id);
      if (first) activateTab(first.id);
    }
    status.innerHTML = queueStatusText();
    startPolling();
    showToast("Queue started");
  } catch (error) {
    showError(error.message, "queue_error");
  } finally {
    summarizeBtn.disabled = !(state.modelInventory && state.modelInventory.ok);
    summarizeBtn.style.opacity = "1";
  }
}

async function pollJobs() {
  const activeJobs = [...state.jobs.values()].filter((job) => ["queued", "running"].includes(job.status));
  if (!activeJobs.length) {
    clearInterval(state.pollTimer);
    state.pollTimer = null;
    status.textContent = queueStatusText(true);
    return;
  }
  await Promise.all(activeJobs.map(async (job) => {
    try {
      const data = await requestJson(`${api.jobs}/${job.id}`);
      const oldStatus = state.jobs.get(job.id)?.status;
      state.jobs.set(job.id, data.job);
      updateTabFromJob(data.job);
      if (data.job.status === "succeeded" && oldStatus !== "succeeded") {
        status.textContent = queueStatusText();
        playFinishAnimation();
        showToast(`Done: ${data.job.title || "Summary ready"}`);
      }
    } catch (error) {
      job.status = "failed";
      job.error = error.message;
      state.jobs.set(job.id, job);
      updateTabFromJob(job);
    }
  }));
  renderTabs();
  renderQueue();
  status.textContent = queueStatusText();
}

function queueStatusText(allowDone = false) {
  const jobs = [...state.jobs.values()];
  const active = jobs.filter((job) => ["queued", "running"].includes(job.status));
  const running = jobs.filter((job) => job.status === "running");
  const done = jobs.filter((job) => job.status === "succeeded");
  if (active.length) {
    const current = running[0] || active[0];
    return `${done.length}/${jobs.length} done · ${current.status}: ${current.title || titleFromUrl(current.url)}`;
  }
  if (allowDone && jobs.length) return `${done.length}/${jobs.length} done`;
  return "";
}

function startPolling() {
  if (!state.pollTimer) state.pollTimer = setInterval(pollJobs, 700);
  startProgressTicker();
  pollJobs();
}

async function copyResult() {
  const tab = activeTab();
  const text = cleanSummaryText(tab?.markdown || summary.innerText);
  if (!text.trim()) return;
  try {
    await navigator.clipboard.writeText(text);
    setButtonLabel(copyBtn, "Copied");
    showToast("Copied");
    setTimeout(() => setButtonLabel(copyBtn, "Copy"), 1200);
  } catch {
    showToast("Copy failed");
  }
}

function renderChatMessages() {
  const tab = activeTab();
  const key = chatKeyForTab(tab) || tab?.id || "";
  const messages = state.chatHistory.get(key) || [];
  chatMessages.innerHTML = messages.length ? messages.map((message) => `
    <div class="chat-message ${message.role === "user" ? "user" : "assistant"} ${message.pending ? "thinking" : ""}">${escapeHtml(message.content)}</div>
  `).join("") : '<div class="chat-message">Ask a question about the current summary.</div>';
  if (chatSubtitle) chatSubtitle.textContent = tab?.title || "Ask about this summary";
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function loadChatMemory(tab = activeTab()) {
  const key = chatKeyForTab(tab);
  if (!key || state.chatHistory.has(key)) return;
  try {
    const data = await requestJson(`/api/chat/history/${encodeURIComponent(key)}`);
    state.chatHistory.set(key, data.messages || []);
  } catch {
    state.chatHistory.set(key, []);
  }
}

async function toggleChatPanel(forceOpen = null) {
  const shouldOpen = forceOpen === null ? chatPanel.hidden : forceOpen;
  chatPanel.hidden = !shouldOpen;
  content.classList.toggle("chat-open", shouldOpen);
  if (shouldOpen) {
    await loadChatMemory();
    renderChatMessages();
    chatInput.focus();
  }
}

async function sendChatMessage(event) {
  event.preventDefault();
  const tab = activeTab();
  const summaryText = cleanSummaryText(tab?.markdown || summary.innerText);
  const question = chatInput.value.trim();
  if (!question) return;
  if (!summaryText || ["queued", "running"].includes(tab?.jobStatus)) {
    showToast("Wait for the summary first");
    return;
  }
  const key = chatKeyForTab(tab) || tab.id;
  const messages = state.chatHistory.get(key) || [];
  messages.push({ role: "user", content: question });
  messages.push({ role: "assistant", content: "Thinking…", pending: true });
  state.chatHistory.set(key, messages);
  chatInput.value = "";
  chatSendBtn.disabled = true;
  renderChatMessages();
  try {
    const attachmentNote = attachedFiles.length ? `\n\nAttached files selected in the app:\n${attachedFiles.map((file) => `- ${file.name}`).join("\n")}` : "";
    const response = await fetch(api.chatStream, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summary: summaryText, question: `${question}${attachmentNote}`, model: modelSelect.value, history_id: chatKeyForTab(tab) })
    });
    if (!response.ok || !response.body) throw new Error("Chat stream failed.");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let answer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() || "";
      for (const eventText of events) {
        const line = eventText.split("\n").find((item) => item.startsWith("data: "));
        if (!line) continue;
        const eventData = JSON.parse(line.slice(6));
        if (eventData.error) throw new Error(eventData.error);
        if (eventData.delta) {
          answer += eventData.delta;
          const nextMessages = messages.filter((message) => !message.pending);
          nextMessages.push({ role: "assistant", content: answer || "Thinking…", pending: !answer });
          state.chatHistory.set(key, nextMessages);
          renderChatMessages();
        }
        if (eventData.done) {
          const nextMessages = eventData.messages?.length ? eventData.messages : [
            ...messages.filter((message) => !message.pending),
            { role: "assistant", content: eventData.answer || answer }
          ];
          state.chatHistory.set(key, nextMessages);
        }
      }
    }
  } catch (error) {
    const nextMessages = messages.filter((message) => !message.pending);
    nextMessages.push({ role: "assistant", content: error.message });
    state.chatHistory.set(key, nextMessages);
  } finally {
    chatSendBtn.disabled = false;
    renderChatMessages();
  }
}

function sendFeedback() {
  const body = feedbackText.value.trim();
  const subject = encodeURIComponent("YouTube Summary App Feedback");
  const encodedBody = encodeURIComponent(body || "I want to share feedback about YouTube Summary App.");
  window.location.href = `mailto:peiliangkrausse@gmail.com?subject=${subject}&body=${encodedBody}`;
}

function celebrateDonation() {
  summaryPanel.classList.remove("donation-celebrate");
  void summaryPanel.offsetWidth;
  summaryPanel.classList.add("donation-celebrate");
  showToast("Thank you for supporting the app");
  setTimeout(() => summaryPanel.classList.remove("donation-celebrate"), 1800);
}

function openDonation() {
  celebrateDonation();
  const donationUrl = donationBtn.dataset.url || "";
  if (donationUrl) setTimeout(() => window.open(donationUrl, "_blank", "noopener"), 650);
}

function attachChatFile(file) {
  if (!file) return;
  attachedFiles.push({ name: file.name, type: file.type || "file", size: file.size || 0 });
  showToast(`Attached ${file.name}`);
  const key = chatKeyForTab() || activeTab()?.id || "";
  const messages = state.chatHistory.get(key) || [];
  messages.push({ role: "assistant", content: `Attached: ${file.name}` });
  state.chatHistory.set(key, messages);
  renderChatMessages();
}

function toggleNarration() {
  if (speechActive) {
    speechSynthesis.cancel();
    speechActive = false;
    setButtonLabel(speakBtn, "Narrate");
    return;
  }
  const text = summary.innerText.trim();
  if (!text || text === "Your summary will appear here.") return;
  const utterance = new SpeechSynthesisUtterance(text);
  const voices = speechSynthesis.getVoices();
  const preferred = voices.find((voice) => /daniel|alex|fred|thomas|lee|aaron|oliver/i.test(voice.name)) || voices.find((voice) => voice.lang && voice.lang.startsWith("en"));
  if (preferred) utterance.voice = preferred;
  utterance.rate = 1;
  utterance.pitch = .95;
  utterance.onend = () => {
    speechActive = false;
    setButtonLabel(speakBtn, "Narrate");
  };
  speechSynthesis.speak(utterance);
  speechActive = true;
  setButtonLabel(speakBtn, "Stop");
}

function handleZoom(event) {
  if (!event.metaKey && !event.ctrlKey) return;
  const key = event.key.toLowerCase();
  if (key === "+" || key === "=" || event.code === "Equal" || event.code === "NumpadAdd") {
    event.preventDefault();
    setZoom(userZoom + .08);
  } else if (key === "-" || key === "_" || event.code === "Minus" || event.code === "NumpadSubtract") {
    event.preventDefault();
    setZoom(userZoom - .08);
  } else if (key === "0" || event.code === "Digit0" || event.code === "Numpad0") {
    event.preventDefault();
    setZoom(1);
  } else if (key === "n") {
    event.preventDefault();
    createTab();
  }
}

document.querySelectorAll("button").forEach((btn) => btn.addEventListener("click", addRipple));
resizer.addEventListener("mousedown", () => dragging = true);
document.addEventListener("mouseup", () => dragging = false);
document.addEventListener("mousemove", (event) => {
  if (!dragging) return;
  const width = Math.max(300, Math.min(900, event.clientX));
  layout.style.gridTemplateColumns = `${width}px .35rem minmax(0,1fr)`;
});
window.addEventListener("keydown", handleZoom, true);
document.addEventListener("keydown", handleZoom, true);
urlInput.addEventListener("input", saveActiveDraft);
modelSelect.addEventListener("change", updateModelButtons);
summarizeBtn.addEventListener("click", summarize);
copyBtn.addEventListener("click", copyResult);
guideBtn.addEventListener("click", createGuideTab);
speakBtn.addEventListener("click", toggleNarration);
chatBtn.addEventListener("click", () => toggleChatPanel(true));
chatCloseBtn.addEventListener("click", () => toggleChatPanel(false));
chatForm.addEventListener("submit", sendChatMessage);
sendFeedbackBtn.addEventListener("click", sendFeedback);
donationBtn.addEventListener("click", openDonation);
zoomInBtn.addEventListener("click", () => setZoom(userZoom + .08));
zoomOutBtn.addEventListener("click", () => setZoom(userZoom - .08));
chatFileBtn.addEventListener("click", () => chatFileInput.click());
chatImageBtn.addEventListener("click", () => chatImageInput.click());
chatFileInput.addEventListener("change", () => attachChatFile(chatFileInput.files[0]));
chatImageInput.addEventListener("change", () => attachChatFile(chatImageInput.files[0]));
newTabBtn.addEventListener("click", () => createTab());
loadModelBtn.addEventListener("click", loadSelectedModel);
unloadModelBtn.addEventListener("click", unloadLoadedModel);
viewPresetsBtn.addEventListener("click", async () => {
  presetDrawer.hidden = !presetDrawer.hidden;
  if (!presetDrawer.hidden) await loadPromptPresets();
});
savePresetBtn.addEventListener("click", saveCurrentAsPreset);
document.getElementById("savePromptBtn").addEventListener("click", savePromptPreset);
document.getElementById("resetPromptBtn").addEventListener("click", resetPromptPreset);

const originalActivateTab = activateTab;
activateTab = async function activateTabWithHistory(tabId) {
  const tab = state.tabs.find((item) => item.id === tabId);
  if (tab && tab.type === "history" && tab.historyId && !tab.markdown && !tab.error) {
    await loadHistoryItem(tab);
  }
  originalActivateTab(tabId);
};

applyZoom();
createGuideTab();
refreshModels();
loadPromptPreset();
loadPromptPresets();
loadHistoryTabs();
