export function guideHtml() {
  return `
      <div class="setup-guide">
        <div class="hero">
        <h2>Run your youtube summaries locally on device.</h2>
        <p>This app summarizes with AI running on your computer. No cloud. Never run out of tokens. Infinite usage.</p>
        <p>This requires you to download LM Studio, which will act like a local server on your computer and host your local AI. It's completely free. Set up LM Studio once, connect it to youtube summary app and voilà!</p>
      </div>

      <div class="guide-flow">
        <section class="guide-step">
          <div class="step-kicker">Step 1</div>
          <h3>Download LM Studio</h3>
          <p>Install LM Studio from <a href="https://lmstudio.ai/download" target="_blank" rel="noopener">lmstudio.ai/download</a>.</p>
        </section>

        <section class="guide-step guide-step-with-media guide-step-compact-media">
          <div>
            <div class="step-kicker">Step 2</div>
            <h3>Open model search</h3>
            <p>Open LM Studio, navigate to the left side bar, then click the button called <strong>Model Search</strong>.</p>
          </div>
          <figure class="guide-figure-compact">
            <img src="/static/images/guide/lm-studio-model-search.png" alt="LM Studio sidebar with the Model Search button highlighted">
          </figure>
        </section>

        <section class="guide-step guide-step-with-media">
          <div>
            <div class="step-kicker">Step 3</div>
            <h3>Download a model that fits your RAM</h3>
            <p>Choose a model that suits your PC RAM size. Smaller models are faster and safer for laptops; larger models need more memory.</p>
            <div class="ram-list">
              <h4>Recommended models by RAM</h4>
              <ul>
                <li><strong>16 GB RAM and below:</strong> Gemma E4B or Gemma 4 12B.</li>
                <li><strong>24 GB+ RAM:</strong> ChatGPT OSS 20B or Gemma 4 12B.</li>
                <li><strong>32 GB+ RAM:</strong> Gemma 4, Qwen 3.6, or 26B-27B class models.</li>
              </ul>
            </div>
          </div>
          <figure class="guide-figure-wide">
            <img src="/static/images/guide/lm-studio-gpt-oss-model.png" alt="LM Studio model detail screen showing GPT-OSS 20B download options">
          </figure>
        </section>

        <section class="guide-step guide-step-with-media">
          <div>
            <div class="step-kicker">Step 4</div>
            <h3>Start the local server</h3>
            <p>Navigate to the left side bar again and find <strong>Developer</strong>. Activate your local server by toggling <strong>Status: Running</strong>.</p>
            <p>You can paste the last 4 digits of your server address in the app to test the connection between YT summarizer app and LM Studio.</p>
          </div>
          <figure>
            <img src="/static/images/guide/lm-studio-local-server.png" alt="LM Studio Developer screen showing the Local Server running on port 1234">
          </figure>
        </section>

        <section class="guide-step">
          <div class="step-kicker">Step 5</div>
          <h3>Load the model in YT Summarizer</h3>
          <p>Once connected, YT summarizer app will show your available models. Load the model by clicking <strong>Load model</strong>.</p>
        </section>
      </div>
    </div>`;
}
