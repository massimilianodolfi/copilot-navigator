(() => {
  const PANEL_ID = "copilot-conversation-navigator";
  let lastSignature = "";

  function normalize(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }

  // V1 intentionally uses several accessibility/data attributes instead of
  // depending on one fragile generated CSS class.
  function findPromptCandidates() {
    const selectors = [
      '[data-testid*="user-message" i]',
      '[data-testid*="user-query" i]',
      '[data-testid*="prompt" i]',
      '[data-testid="chatOutput"]',
      '[aria-label*="user message" i]',
      '[aria-label*="you said" i]',
      '[data-author="user"]',
      '[data-message-author-role="user"]'
    ];

    const found = [...document.querySelectorAll(selectors.join(","))];
    const seen = new Set();

    return found.filter(el => {
      const text = normalize(el.innerText || el.textContent);
      if (!text || text.length < 2 || text.length > 5000) return false;
      if (seen.has(el)) return false;
      seen.add(el);
      return true;
    });
  }

  function shortTitle(text) {
    const cleaned = normalize(text);
    return cleaned.length > 72 ? cleaned.slice(0, 69) + "..." : cleaned;
  }

  function ensurePanel() {
    let panel = document.getElementById(PANEL_ID);
    if (panel) return panel;

    panel = document.createElement("aside");
    panel.id = PANEL_ID;
    panel.innerHTML = `
      <div class="ccn-header">
        <strong>Conversation</strong>
        <button id="ccn-toggle" title="Collapse navigator">−</button>
      </div>
      <div id="ccn-status"></div>
      <div id="ccn-list"></div>
    `;
    document.body.appendChild(panel);

    panel.querySelector("#ccn-toggle").addEventListener("click", () => {
      panel.classList.toggle("ccn-collapsed");
      panel.querySelector("#ccn-toggle").textContent =
        panel.classList.contains("ccn-collapsed") ? "+" : "−";
    });

    return panel;
  }

  function rebuild() {
    const panel = ensurePanel();
    const list = panel.querySelector("#ccn-list");
    const status = panel.querySelector("#ccn-status");
    const prompts = findPromptCandidates();
    const signature = prompts.map(p => normalize(p.innerText || p.textContent)).join("|");
    if (signature === lastSignature) return;
    lastSignature = signature;

    list.replaceChildren();
    status.textContent = prompts.length
      ? `${prompts.length} prompt${prompts.length === 1 ? "" : "s"}`
      : "No prompts detected";

    prompts.forEach((prompt, index) => {
      const text = normalize(prompt.innerText || prompt.textContent);
      const button = document.createElement("button");
      button.className = "ccn-item";
      button.textContent = `${index + 1}. ${shortTitle(text)}`;
      button.title = text;
      button.addEventListener("click", () => {
        prompt.scrollIntoView({ behavior: "smooth", block: "center" });
        prompt.classList.add("ccn-highlight");
        setTimeout(() => prompt.classList.remove("ccn-highlight"), 1400);
      });
      list.appendChild(button);
    });
  }

  let timer;
  const observer = new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(rebuild, 300);
  });

  ensurePanel();
  rebuild();
  observer.observe(document.body, { childList: true, subtree: true });
})();
