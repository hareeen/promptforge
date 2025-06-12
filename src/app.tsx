import * as monaco from "monaco-editor";
import type React from "react";
import { useCallback, useEffect, useRef } from "react";
import ActionButtons from "./components/ActionButtons";
import { ConfigPanel } from "./components/ConfigPanel";
import { FooterInfo } from "./components/FooterInfo";
import { ParameterControls } from "./components/ParameterControls";
import { PromptEditor } from "./components/PromptEditor";
import type { ClientState, Message, RequestParams } from "./types";
import { base64ToBase64Url } from "./utils/base64url";
import { messagesToPrompt, parseMessages } from "./utils/promptUtils";
import { useClientState } from "./utils/useClientState";

// Utility: check if tokenizer is set
function hasTokenizer(state: ClientState): boolean {
	return state.tokenizerUrl.trim() !== "";
}

// Utility: generate request body for completions endpoint
function generateCompletionRequest(state: ClientState, prompt: string) {
	const cleanPrompt = prompt.replace(/<\|im_end\|>$/, "").trim();
	return {
		model: state.model,
		prompt: cleanPrompt,
		max_tokens: state.params.maxTokens ?? undefined,
		temperature: state.params.temperature ?? undefined,
		top_k: state.params.topK ?? undefined,
		top_p: state.params.topP ?? undefined,
		frequency_penalty: state.params.frequencyPenalty ?? undefined,
		presence_penalty: state.params.presencePenalty ?? undefined,
		stream: true,
	};
}

// Utility: generate request body for chat endpoint
function generateChatRequest(state: ClientState, messages: Message[]) {
	return {
		model: state.model,
		messages,
		max_tokens: state.params.maxTokens ?? undefined,
		temperature: state.params.temperature ?? undefined,
		top_k: state.params.topK ?? undefined,
		top_p: state.params.topP ?? undefined,
		frequency_penalty: state.params.frequencyPenalty ?? undefined,
		presence_penalty: state.params.presencePenalty ?? undefined,
		stream: true,
	};
}

export const App: React.FC = () => {
	const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
	const [state, setState] = useClientState(editorRef);

	// Prompt change handler
	const handlePromptChange = useCallback(
		(value: string) => {
			setState((prev) => ({ ...prev, prompt: value }));
		},
		[setState],
	);

	// Config panel handlers
	const handleApiBaseUrlChange = (value: string) =>
		setState((prev) => ({ ...prev, apiBaseUrl: value }));
	const handleModelChange = (value: string) =>
		setState((prev) => ({ ...prev, model: value }));
	const handleTokenizerUrlChange = (value: string) =>
		setState((prev) => ({ ...prev, tokenizerUrl: value }));
	const handleApiKeyChange = (value: string) =>
		setState((prev) => ({ ...prev, meta: { ...prev.meta, apiKey: value } }));

	// Parameter controls handler
	const handleParamsChange = (params: Partial<RequestParams>) =>
		setState((prev) => ({
			...prev,
			params: { ...prev.params, ...params },
		}));

	// Insert template helpers
	const insertTemplate = (template: string) => {
		const editor = editorRef.current;
		if (editor) {
			const position = editor.getPosition();
			editor.executeEdits("", [
				{
					range: new monaco.Range(
						position?.lineNumber || 1,
						position?.column || 1,
						position?.lineNumber || 1,
						position?.column || 1,
					),
					text: template,
				},
			]);
			editor.setPosition({
				lineNumber: (position?.lineNumber || 1) + 1,
				column: 1,
			});
			editor.focus();
		}
	};
	const insertUserTemplate = () => insertTemplate("<|user|>\n\n<|im_end|>\n");
	const insertAssistantTemplate = () =>
		insertTemplate("<|assistant|>\n\n<|im_end|>\n");
	const insertSystemTemplate = () =>
		insertTemplate("<|system|>\n\n<|im_end|>\n");

	// Clear prompt
	const clearPrompt = () => {
		if (editorRef.current) {
			editorRef.current.setValue("");
		}
		setState((prev) => ({ ...prev, prompt: "" }));
	};

	// Share as URL
	const shareAsUrl = () => {
		const { meta, ...stateToShare } = state;
		const encoded = base64ToBase64Url(btoa(JSON.stringify(stateToShare)));
		const url = `${window.location.origin}${window.location.pathname}?state=${encoded}`;
		navigator.clipboard.writeText(url).then(() => {
			alert("URL copied to clipboard!");
		});
	};

	// Helper for append value
	const appendContent = (content: string) => {
		const editor = editorRef.current;
		if (editor) {
			const model = editor.getModel();

			const currentValue = editor.getValue() || "";
			const newValue = `${currentValue}${content}`;
			editor.setValue(newValue);

			// Scroll to bottom
			const lineCount = model?.getLineCount() || 0;
			const lastLineLength = model?.getLineLength(lineCount) || 0;
			editor.revealLine(lineCount);
			editor.setPosition({
				lineNumber: lineCount,
				column: lastLineLength + 1,
			});
			editor.focus();
		}
	};

	// Send request to LLM API
	const sendRequest = async () => {
		if (state.meta.isLoading) return;
		setState((prev) => ({ ...prev, meta: { ...prev.meta, isLoading: true } }));

		try {
			const currentPrompt = editorRef.current?.getValue() || state.prompt;
			let endpoint: string;
			let requestBody:
				| ReturnType<typeof generateCompletionRequest>
				| ReturnType<typeof generateChatRequest>;

			if (hasTokenizer(state)) {
				endpoint = `${state.apiBaseUrl}/completions`;
				requestBody = generateCompletionRequest(state, currentPrompt);
			} else {
				endpoint = `${state.apiBaseUrl}/chat/completions`;
				const messages = parseMessages(currentPrompt);
				requestBody = generateChatRequest(state, messages);

				// Prepare editor for assistant response
				editorRef.current?.setValue(
					`${messagesToPrompt(messages)}\n\n<|assistant|>\n`,
				);
				// Scroll to bottom
				const lineCount = editorRef.current?.getModel()?.getLineCount() || 0;
				editorRef.current?.revealLine(lineCount);
			}

			const response = await fetch(endpoint, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${state.meta.apiKey || ""}`,
				},
				body: JSON.stringify(requestBody),
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const reader = response.body?.getReader();
			if (!reader) throw new Error("No response body");

			let assistantResponse = "";
			const decoder = new TextDecoder();

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const chunk = decoder.decode(value);
				const lines = chunk.split("\n");

				for (const line of lines) {
					if (line.startsWith("data: ")) {
						const data = line.slice(6);
						if (data === "[DONE]") continue;

						try {
							const parsed = JSON.parse(data);
							let content = "";

							if (hasTokenizer(state)) {
								// Completion endpoint response
								content = parsed.choices?.[0]?.text || "";
							} else {
								// Chat completion endpoint response
								content = parsed.choices?.[0]?.delta?.content || "";
							}

							if (content) {
								assistantResponse += content;
								// Update editor in real-time
								appendContent(content);
							}
						} catch (e) {
							console.error("Failed to parse SSE data:", e);
						}
					}
				}
			}

			// Add final formatting
			if (assistantResponse && !hasTokenizer(state)) {
				appendContent("\n<|im_end|>\n\n");
			}
		} catch (error) {
			console.error("Request failed:", error);
			alert(
				`Request failed: ${
					error instanceof Error ? error.message : "Unknown error"
				}`,
			);
		} finally {
			setState((prev) => ({
				...prev,
				meta: { ...prev.meta, isLoading: false },
			}));
		}
	};

	// Keyboard shortcuts
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			const ctrlOrCmd = event.ctrlKey || event.metaKey;

			// Cmd/Ctrl+Enter: Send/Generate
			if (ctrlOrCmd && event.key === "Enter") {
				event.preventDefault();
				sendRequest();
			}

			// Cmd/Ctrl+S: Save (prevent default browser save)
			if (ctrlOrCmd && event.key.toLowerCase() === "s" && !event.shiftKey) {
				event.preventDefault();
				// Optionally, you could show a toast "State saved" or similar
			}

			// Cmd/Ctrl+L: Clear prompt
			if (ctrlOrCmd && event.key.toLowerCase() === "l" && !event.shiftKey) {
				event.preventDefault();
				clearPrompt();
			}

			// Cmd/Ctrl+Shift+C: Share as URL
			if (ctrlOrCmd && event.shiftKey && event.key.toLowerCase() === "c") {
				event.preventDefault();
				shareAsUrl();
			}

			// Cmd/Ctrl+Shift+U: Insert User template
			if (ctrlOrCmd && event.shiftKey && event.key.toLowerCase() === "u") {
				event.preventDefault();
				insertUserTemplate();
			}

			// Cmd/Ctrl+Shift+A: Insert Assistant template
			if (ctrlOrCmd && event.shiftKey && event.key.toLowerCase() === "a") {
				event.preventDefault();
				insertAssistantTemplate();
			}

			// Cmd/Ctrl+Shift+S: Insert System template
			if (ctrlOrCmd && event.shiftKey && event.key.toLowerCase() === "s") {
				event.preventDefault();
				insertSystemTemplate();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		window.addEventListener("promptEditorSubmit", sendRequest);

		return () => {
			window.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("promptEditorSubmit", sendRequest);
		};
	});

	return (
		<div className="h-screen flex flex-col bg-zinc-950 text-white space-y-2">
			{/* Header */}
			<div className="p-4">
				{/* Configuration Panel */}
				<ConfigPanel
					apiBaseUrl={state.apiBaseUrl}
					model={state.model}
					tokenizerUrl={state.tokenizerUrl}
					onApiBaseUrlChange={handleApiBaseUrlChange}
					onModelChange={handleModelChange}
					onTokenizerUrlChange={handleTokenizerUrlChange}
					onApiKeyChange={handleApiKeyChange}
				/>

				{/* Parameters */}
				<ParameterControls
					params={state.params}
					onChange={handleParamsChange}
				/>

				{/* Action Buttons */}
				<ActionButtons
					isLoading={state.meta.isLoading}
					onGenerate={sendRequest}
					onShare={shareAsUrl}
					onClear={clearPrompt}
					onInsertSystem={insertSystemTemplate}
					onInsertUser={insertUserTemplate}
					onInsertAssistant={insertAssistantTemplate}
				/>
			</div>

			{/* Editor */}
			<PromptEditor
				editorRef={editorRef}
				onChange={handlePromptChange}
				isLoading={state.meta.isLoading}
			/>

			{/* Footer Info */}
			<FooterInfo state={state} />
		</div>
	);
};

export default App;
