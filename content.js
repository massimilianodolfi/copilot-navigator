(() => {
  // Constant identifier for the navigator panel element
  const PANEL_ID = "copilot-conversation-navigator";
  // Variable to track the last signature of prompts for optimization
  let lastSignature = "";

  /**
   * Normalizes text by replacing multiple whitespace characters with single spaces and trimming
   * @param {string} text - The text to normalize
   * @returns {string} - The normalized text
   */
  function normalize(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }

  /**
   * Finds potential prompt candidates in the document by searching for various CSS selectors
   * This function looks for elements that likely contain user prompts/messages in chat interfaces
   * @returns {Array} - Array of DOM elements that match the prompt candidate selectors
   */
  function findPromptCandidates() {
    // Array of CSS selectors to find user prompts in different chat interfaces
    const selectors = [
      '[data-testid*="user-message" i]',           // Look for elements with user-message in data-testid
      '[data-testid*="user-query" i]',              // Look for elements with user-query in data-testid  
      '[data-testid*="prompt" i]',                  // Look for elements with prompt in data-testid
      '[data-testid="chatOutput"]',                 // Specific chat output element
      '[aria-label*="user message" i]',             // Look for elements with user message in aria-label
      '[aria-label*="you said" i]',                // Look for elements with you said in aria-label
      '[data-author="user"]',                       // Look for elements with data-author=user
      '[data-message-author-role="user"]'           // Look for elements with specific message author role
    ];

    // Find all elements matching any of the selectors and convert to array
    const found = [...document.querySelectorAll(selectors.join(","))];
    // Set to track seen elements to avoid duplicates
    const seen = new Set();

    // Filter elements based on criteria:
    // - Has text content
    // - Text length is between 2 and 5000 characters
    // - Not already seen (avoid duplicates)
    return found.filter(el => {
      const text = normalize(el.innerText || el.textContent);
      if (!text || text.length < 2 || text.length > 5000) return false;
      if (seen.has(el)) return false;
      seen.add(el);
      return true;
    });
  }

  /**
   * Creates a shortened title from text for display purposes
   * @param {string} text - The full text to shorten
   * @returns {string} - The shortened text (max 72 characters)
   */
  function shortTitle(text) {
    const cleaned = normalize(text);
    return cleaned.length > 72 ? cleaned.slice(0, 69) + "..." : cleaned;
  }

  /**
   * Ensures the navigator panel exists in the document
   * Creates it if it doesn't exist, or returns the existing one
   * @returns {HTMLElement} - The panel element
   */
  function ensurePanel() {
    // Try to find existing panel by ID
    let panel = document.getElementById(PANEL_ID);
    if (panel) return panel;

    // Create new panel element if it doesn't exist
    panel = document.createElement("aside");
    panel.id = PANEL_ID;
    // HTML structure for the navigator panel
    panel.innerHTML = `
      <div class="ccn-header">
        <strong>Conversation</strong>
        <button id="ccn-toggle" title="Collapse navigator">−</button>
      </div>
      <div id="ccn-status"></div>
      <div id="ccn-list"></div>
    `;
    // Add the panel to the document body
    document.body.appendChild(panel);

    // Add event listener to toggle button for collapsing/expanding the panel
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
