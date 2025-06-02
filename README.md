# PromptForge

A web playground for crafting, testing, and sharing prompts for LLM APIs.

---

## Features

- Monaco Editor with LLM chat syntax highlighting
- Configurable API endpoint, model, and parameters
- Supports chat and completion endpoints (OpenAI, OpenRouter, etc.)
- Streaming responses in-editor
- Insert system/user/assistant templates
- Share prompt & settings via URL (no API key included)
- Local persistence of settings and prompt
- Keyboard shortcuts for quick actions

---

## Quick Start (with Bun)

```bash
bun install
bun run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Usage

1. Enter API base URL, model, and your API key.
2. Write prompts in the editor using `<|system|>`, `<|user|>`, `<|assistant|>` tags.
3. Adjust parameters as needed.
4. Click **Generate** or press <kbd>Ctrl+Enter</kbd> to run.
5. Click **Share URL** to copy a link with your prompt/settings.

---

## Keyboard Shortcuts

- <kbd>Ctrl+Enter</kbd>: Generate
- <kbd>Ctrl+Shift+S</kbd>: Share URL
- <kbd>Ctrl+Shift+U</kbd>: Insert User
- <kbd>Ctrl+Shift+A</kbd>: Insert Assistant
- <kbd>Ctrl+Shift+S</kbd>: Insert System

---

## Build & Deploy

```bash
bun run build
```
Deploy the `dist/` folder to your static host.

---

## License

AGPL-3.0

---

**Happy prompting!**
