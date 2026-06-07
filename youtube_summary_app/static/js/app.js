const api = {
  models: "/api/models",
  modelLoad: "/api/models/load",
  modelUnload: "/api/models/unload",
  prompt: "/api/prompt",
  promptReset: "/api/prompt/reset",
  jobs: "/api/jobs",
  history: "/api/history"
};

const layout = document.getElementById("layout");
const resizer = document.getElementById("resizer");
const summaryPanel = document.getElementById("summaryPanel");
const summary = document.getElementById("summary");
const status = document.getElementById("status");
const summarizeBtn = document.getElementById("summarizeBtn");
const copyBtn = document.getElementById("copyBtn");
const guideBtn = document.getElementById("guideBtn");
const speakBtn = document.getElementById("speakBtn");
const toast = document.getElementById("toast");
const modelSelect = document.getElementById("model");
const modelStatus = document.getElementById("modelStatus");
const loadModelBtn = document.getElementById("loadModelBtn");
const unloadModelBtn = document.getElementById("unloadModelBtn");
const advancedHint = document.getElementById("advancedHint");
const promptEditor = document.getElementById("promptEditor");
const promptStatus = document.getElementById("promptStatus");
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
  modelInventory: null
};

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

function parseUrls(value = urlInput.value) {
  const matches = value.match(/https?:\/\/[^\s,]+/g) || [];
  return [...new Set(matches.map((url) => url.trim()))];
}

function titleFromUrl(url) {
  try {
    const parsed = new URL(url);
    const id = parsed.searchParams.get("v") || parsed.pathname.split("/").filter(Boolean).pop();
    return id ? `Video ${id}` : "New Summary";
  } catch {
    return "New Summary";
  }
}

function setProgress(percent, visible) {
  progressTrack.hidden = !visible;
  progressFill.style.width = `${Math.max(0, Math.min(100, Number(percent) || 0))}%`;
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
  urlInput.value = tab.url || "";
  setProgress(tab.progress || 0, ["queued", "running"].includes(tab.jobStatus));
  if (tab.type === "guide") {
    summary.innerHTML = guideHtml();
  } else if (tab.error) {
    summary.innerHTML = `<div class="error-card"><strong>Something needs attention.</strong><br>${escapeHtml(tab.error)}</div>`;
  } else if (tab.markdown) {
    summary.innerHTML = markdownToHtml(tab.markdown);
  } else if (tab.statusText) {
    summary.innerHTML = emptyHtml(tab.statusText);
  } else {
    summary.innerHTML = emptyHtml("Paste a YouTube URL in this tab, or press Ctrl+N for another tab.");
  }
  renderTabs();
  renderQueue();
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
  if (tab.type === "draft" && tab.url) tab.title = titleFromUrl(tab.url);
}

function renderTabs() {
  chromeTabs.innerHTML = "";
  for (const tab of state.tabs) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `chrome-tab ${tab.id === state.activeTabId ? "is-active" : ""} ${tab.jobStatus === "running" || tab.jobStatus === "queued" ? "is-running" : ""} ${tab.jobStatus === "failed" || tab.error ? "is-failed" : ""} ${tab.type === "history" ? "is-saved" : ""}`;
    btn.title = tab.title;
    btn.innerHTML = `<span>${escapeHtml(tab.title)}</span><span class="tab-close" title="Close tab">x</span>`;
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
      ${escapeHtml(job.status)} · ${escapeHtml(job.message || job.error || "")}
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
  tab.statusText = job.message || "";
  tab.error = job.error || "";
  if (job.summary) {
    tab.markdown = job.summary;
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
    const data = await requestJson(api.models);
    state.modelInventory = data;
    modelSelect.innerHTML = "";
    const available = data.models || [];
    if (!available.length) {
      modelSelect.innerHTML = '<option value="">No local models found</option>';
    }
    for (const model of available) {
      const option = document.createElement("option");
      option.value = model.key;
      const details = [model.params_string, model.quantization && model.quantization.name].filter(Boolean).join(" ");
      option.textContent = `${model.loaded ? "Loaded: " : ""}${model.display_name || model.key}${details ? ` (${details})` : ""}`;
      modelSelect.appendChild(option);
    }
    if (data.current_model) modelSelect.value = data.current_model;
    modelStatus.textContent = data.message || "Connected to LM Studio.";
    advancedHint.textContent = data.current_model ? "Model loaded" : "Choose model";
    if (!data.ok) modelStatus.classList.add(data.status === "multiple_models" ? "warning" : "error");
    updateModelButtons();
  } catch (error) {
    state.modelInventory = null;
    modelSelect.innerHTML = '<option value="">LM Studio unavailable</option>';
    modelStatus.textContent = "Could not detect LM Studio. Start the local server on port 1234.";
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
}

async function loadSelectedModel() {
  const selected = modelSelect.value;
  try {
    modelStatus.textContent = "Loading selected model...";
    loadModelBtn.disabled = true;
    await requestJson(api.modelLoad, { method: "POST", body: JSON.stringify({ model: selected }) });
    showToast("Model loaded");
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
    modelStatus.textContent = "Unloading model...";
    unloadModelBtn.disabled = true;
    await requestJson(api.modelUnload, { method: "POST", body: JSON.stringify({ instance_id: selected }) });
    showToast("Model unloaded");
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
    tab.markdown = item.summary || item.markdown || "";
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
    const data = await requestJson(api.jobs, {
      method: "POST",
      body: JSON.stringify({ urls, model: modelSelect.value })
    });
    for (const job of data.jobs || []) {
      state.jobs.set(job.id, job);
      const existingDraft = activeTab();
      const canReuseActive = urls.length === 1 && existingDraft && existingDraft.type === "draft" && !existingDraft.markdown && !existingDraft.jobId;
      const tab = canReuseActive ? existingDraft : createTab({ activate: false });
      tab.type = "job";
      tab.title = titleFromUrl(job.url);
      tab.url = job.url;
      tab.jobId = job.id;
      tab.jobStatus = job.status;
      tab.statusText = job.message;
      tab.progress = job.progress;
    }
    if (data.jobs && data.jobs[0]) {
      const first = state.tabs.find((tab) => tab.jobId === data.jobs[0].id);
      if (first) activateTab(first.id);
    }
    status.innerHTML = `Queued ${data.jobs.length} video${data.jobs.length === 1 ? "" : "s"}<span class="loading-dot"></span>`;
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
    status.textContent = "";
    return;
  }
  await Promise.all(activeJobs.map(async (job) => {
    try {
      const data = await requestJson(`${api.jobs}/${job.id}`);
      const oldStatus = state.jobs.get(job.id)?.status;
      state.jobs.set(job.id, data.job);
      updateTabFromJob(data.job);
      if (data.job.status === "succeeded" && oldStatus !== "succeeded") {
        status.textContent = "Done";
        playFinishAnimation();
        showToast("Summary ready");
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
}

function startPolling() {
  if (!state.pollTimer) state.pollTimer = setInterval(pollJobs, 1400);
  pollJobs();
}

async function copyResult() {
  const tab = activeTab();
  const text = tab?.markdown || summary.innerText;
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
    userZoom = Math.min(1.65, userZoom + .08);
    applyZoom();
    showToast(`Zoom ${Math.round(userZoom * 100)}%`);
  } else if (key === "-" || key === "_" || event.code === "Minus" || event.code === "NumpadSubtract") {
    event.preventDefault();
    userZoom = Math.max(.72, userZoom - .08);
    applyZoom();
    showToast(`Zoom ${Math.round(userZoom * 100)}%`);
  } else if (key === "0" || event.code === "Digit0" || event.code === "Numpad0") {
    event.preventDefault();
    userZoom = 1;
    applyZoom();
    showToast("Zoom reset");
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
newTabBtn.addEventListener("click", () => createTab());
loadModelBtn.addEventListener("click", loadSelectedModel);
unloadModelBtn.addEventListener("click", unloadLoadedModel);
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
loadHistoryTabs();
