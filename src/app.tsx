import * as monaco from "monaco-editor";
import { useEffect, useRef, useState } from "preact/hooks";

interface RequestParams {
	maxTokens: number | null;
	temperature: number | null;
	topK: number | null;
	topP: number | null;
	frequencyPenalty: number | null;
	presencePenalty: number | null;
}

interface ClientState {
	apiBaseUrl: string;
	model: string;
	params: RequestParams;
	prompt: string;
	isLoading: boolean;
	tokenizerUrl: string;
}

interface Message {
	role: "system" | "user" | "assistant";
	content: string;
}

export const App = () => {
	const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	const [state, setState] = useState<ClientState>(() => {
		const saved = localStorage.getItem("llm_client_state");
		if (saved) {
			try {
				return {
					...JSON.parse(saved),
					isLoading: false, // Always start not loading
				};
			} catch {
				// fallback to default if corrupted
			}
		}
		return {
			apiBaseUrl: "https://openrouter.ai/api/v1",
			model: "google/gemini-2.5-flash-preview-05-20",
			params: {
				maxTokens: null,
				temperature: null,
				topK: null,
				topP: null,
				frequencyPenalty: null,
				presencePenalty: null,
			},
			prompt: "",
			isLoading: false,
			tokenizerUrl: "",
		};
	});

	// Initialize Monaco Editor
	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		if (containerRef.current && !editorRef.current) {
			// Define custom theme
			monaco.editor.defineTheme("llm-theme", {
				base: "vs-dark",
				inherit: true,
				rules: [
					{ token: "system-token", foreground: "#fbbf24", fontStyle: "bold" },
					{ token: "user-token", foreground: "#a78bfa", fontStyle: "bold" },
					{
						token: "assistant-token",
						foreground: "#f472b6",
						fontStyle: "bold",
					},
					{ token: "end-token", foreground: "#a8a29e", fontStyle: "italic" },
				],
				colors: {
					"editor.background": "#09090b",
				},
			});

			// Register language for syntax highlighting
			monaco.languages.register({ id: "llm-prompt" });
			monaco.languages.setMonarchTokensProvider("llm-prompt", {
				tokenizer: {
					root: [
						// --- Custom LLM tokens ---
						[/<\|system\|>/, "system-token"],
						[/<\|user\|>/, "user-token"],
						[/<\|assistant\|>/, "assistant-token"],
						[/<\|im_end\|>/, "end-token"],
						[/<\|im_start\|>/, "end-token"],

						// --- Basic Markdown-style tokens ---
						[/^#{1,6}\s.+$/, "keyword"], // headings
						[/[*_]{1,2}[^*_]+[*_]{1,2}/, "strong"], // bold/italic
						[/`[^`]+`/, "variable"], // inline code
						[/```/, { token: "string", next: "@codeblock" }],
						[/>\s.*/, "comment"], // blockquote
						[/[-+*]\s.*/, "list"], // lists
					],

					codeblock: [
						[/```/, { token: "string", next: "@pop" }],
						[/.*$/, "string"],
					],
				},
			});

			editorRef.current = monaco.editor.create(containerRef.current, {
				value: state.prompt,
				language: "llm-prompt",
				theme: "llm-theme",
				fontSize: 12,
				wordWrap: "on",
				minimap: { enabled: false },
				scrollBeyondLastLine: false,
				automaticLayout: true,
				lineNumbers: "on",
				folding: true,
				renderWhitespace: "boundary",
			});

			editorRef.current.onDidChangeModelContent(() => {
				const value = editorRef.current?.getValue() || "";
				setState((prev) => ({ ...prev, prompt: value }));
			});
		}

		return () => {
			if (editorRef.current) {
				editorRef.current.dispose();
			}
		};
	}, []);

	// Keyboard shortcuts
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			const ctrlKeyPressed = event.ctrlKey || event.metaKey;
			if (ctrlKeyPressed && event.key === "Enter") {
				event.preventDefault();
				sendRequest();
			}

			if (ctrlKeyPressed && event.key === "s") {
				event.preventDefault();
			}

			if (ctrlKeyPressed && event.shiftKey) {
				if (event.key === "s") {
					event.preventDefault();
					shareAsUrl();
				} else if (event.key === "u") {
					event.preventDefault();
					insertUserTemplate();
				} else if (event.key === "a") {
					event.preventDefault();
					insertAssistantTemplate();
				} else if (event.key === "s") {
					event.preventDefault();
					insertSystemTemplate();
				}
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, []);

	// Load state from URL
	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const encoded = params.get("state");
		if (encoded) {
			try {
				const decoded = JSON.parse(atob(encoded));
				setState((prev) => ({ ...prev, ...decoded }));
				if (editorRef.current) {
					editorRef.current.setValue(decoded.prompt || state.prompt);
				}
			} catch (e) {
				console.error("Failed to decode state from URL:", e);
			}
		}
	}, []);

	// Persist state to localStorage
	useEffect(() => {
		// Don't persist isLoading
		const { isLoading, ...persistedState } = state;
		localStorage.setItem("llm_client_state", JSON.stringify(persistedState));
	}, [state]);

	const parseMessages = (prompt: string): Message[] => {
		const messages: Message[] = [];
		const sections = prompt.split(/<\|(system|user|assistant)\|>/);

		for (let i = 1; i < sections.length; i += 2) {
			const role = sections[i] as "system" | "user" | "assistant";
			const content =
				sections[i + 1]?.replace(/<\|im_end\|>/g, "").trim() || "";
			if (content) {
				messages.push({ role, content });
			}
		}

		return messages;
	};

	const messagesToPrompt = (messages: Message[]): string => {
		return messages
			.map((msg) => {
				const roleTag = `<|${msg.role}|>`;
				const content = msg.content.replace(/<\|im_end\|>/g, "").trim();
				return `${roleTag}\n${content}\n<|im_end|>`;
			})
			.join("\n\n");
	};

	const hasTokenizer = (): boolean => {
		return state.tokenizerUrl.trim() !== "";
	};

	const generateCompletionRequest = (prompt: string) => {
		// For completion endpoint, remove the last <|im_end|> if present
		const cleanPrompt = prompt.replace(/<\|im_end\|>$/, "").trim();
		return {
			model: state.model,
			prompt: cleanPrompt,
			max_tokens: state.params.maxTokens || undefined,
			temperature: state.params.temperature || undefined,
			top_k: state.params.topK || undefined,
			top_p: state.params.topP || undefined,
			frequency_penalty: state.params.frequencyPenalty || undefined,
			presence_penalty: state.params.presencePenalty || undefined,
			stream: true,
		};
	};

	const generateChatRequest = (messages: Message[]) => {
		return {
			model: state.model,
			messages,
			max_tokens: state.params.maxTokens || undefined,
			temperature: state.params.temperature || undefined,
			top_k: state.params.topK || undefined,
			top_p: state.params.topP || undefined,
			frequency_penalty: state.params.frequencyPenalty || undefined,
			presence_penalty: state.params.presencePenalty || undefined,
			stream: true,
		};
	};

	const sendRequest = async () => {
		if (state.isLoading) return;

		setState((prev) => ({ ...prev, isLoading: true }));

		try {
			const currentPrompt = editorRef.current?.getValue() || state.prompt;
			let endpoint: string;
			let requestBody: any;

			if (hasTokenizer()) {
				// Use completion endpoint
				endpoint = `${state.apiBaseUrl}/completions`;
				requestBody = generateCompletionRequest(currentPrompt);
			} else {
				// Use chat completion endpoint
				endpoint = `${state.apiBaseUrl}/chat/completions`;
				const messages = parseMessages(currentPrompt);
				requestBody = generateChatRequest(messages);

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
					Authorization: `Bearer ${localStorage.getItem("api_key") || ""}`,
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

							if (hasTokenizer()) {
								// Completion endpoint response
								content = parsed.choices?.[0]?.text || "";
							} else {
								// Chat completion endpoint response
								content = parsed.choices?.[0]?.delta?.content || "";
							}

							if (content) {
								assistantResponse += content;
								// Update editor in real-time
								const currentValue = editorRef.current?.getValue() || "";

								const newValue = `${currentValue}${content}`;

								editorRef.current?.setValue(newValue);
								// Scroll to bottom
								const lineCount =
									editorRef.current?.getModel()?.getLineCount() || 0;
								editorRef.current?.revealLine(lineCount);
							}
						} catch (e) {
							console.error("Failed to parse SSE data:", e);
						}
					}
				}
			}

			// Add final formatting
			if (assistantResponse && !hasTokenizer()) {
				const currentValue = editorRef.current?.getValue() || "";
				const newValue = `${currentValue}\n<|im_end|>\n`;
				editorRef.current?.setValue(newValue);
			}
		} catch (error) {
			console.error("Request failed:", error);
			alert(
				`Request failed: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		} finally {
			setState((prev) => ({ ...prev, isLoading: false }));
		}
	};

	const shareAsUrl = () => {
		const currentPrompt = editorRef.current?.getValue() || state.prompt;
		const stateToShare = {
			...state,
			prompt: currentPrompt,
		};
		const encoded = btoa(JSON.stringify(stateToShare));
		const url = `${window.location.origin}${window.location.pathname}?state=${encoded}`;
		navigator.clipboard.writeText(url).then(() => {
			alert("URL copied to clipboard!");
		});
	};

	const clearPrompt = () => {
		const newPrompt = "";
		editorRef.current?.setValue(newPrompt);
		setState((prev) => ({ ...prev, prompt: newPrompt }));
	};

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
		}
	};

	const insertUserTemplate = () => insertTemplate("<|user|>\n\n<|im_end|>\n");
	const insertAssistantTemplate = () =>
		insertTemplate("<|assistant|>\n\n<|im_end|>\n");
	const insertSystemTemplate = () =>
		insertTemplate("<|system|>\n\n<|im_end|>\n");

	return (
		<div className="h-screen flex flex-col bg-zinc-950 text-white space-y-2">
			{/* Header */}
			<div className="p-4">
				{/* Configuration Panel */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
					<div>
						<label className="block text-xs font-medium">
							API Base URL
							<input
								type="text"
								value={state.apiBaseUrl}
								onChange={(e) =>
									setState((prev) => ({
										...prev,
										apiBaseUrl: e.currentTarget.value,
									}))
								}
								className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-md text-xs mt-1"
								placeholder="https://api.openai.com/v1"
							/>
						</label>
					</div>

					<div>
						<label className="block text-xs font-medium mb-1">
							Model
							<input
								type="text"
								value={state.model}
								onChange={(e) =>
									setState((prev) => ({
										...prev,
										model: e.currentTarget.value,
									}))
								}
								className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-md text-xs mt-1"
								placeholder="gpt-4o"
							/>
						</label>
					</div>

					<div>
						<label className="block text-xs font-medium mb-1">
							Tokenizer URL (optional)
							<input
								type="text"
								value={state.tokenizerUrl}
								onChange={(e) =>
									setState((prev) => ({
										...prev,
										tokenizerUrl: e.currentTarget.value,
									}))
								}
								className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-md text-xs mt-1"
								placeholder="https://huggingface.co/..."
							/>
						</label>
					</div>

					<div>
						<label className="block text-xs font-medium mb-1">
							API Key
							<input
								type="password"
								onChange={(e) =>
									localStorage.setItem("api_key", e.currentTarget.value)
								}
								className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-md text-xs mt-1"
								placeholder="sk-..."
							/>
						</label>
					</div>
				</div>

				{/* Parameters */}
				<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-4">
					<div>
						<label className="block text-xs font-medium">
							Max Tokens
							<input
								type="number"
								value={state.params.maxTokens ?? ""}
								onChange={(e) =>
									setState((prev) => ({
										...prev,
										params: {
											...prev.params,
											maxTokens: Number.parseInt(e.currentTarget.value) || null,
										},
									}))
								}
								className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-md text-xs mt-1"
							/>
						</label>
					</div>

					<div>
						<label className="block text-xs font-medium mb-1">
							Temperature
							<input
								type="number"
								step="0.1"
								min="0"
								max="2"
								value={state.params.temperature ?? ""}
								onChange={(e) =>
									setState((prev) => ({
										...prev,
										params: {
											...prev.params,
											temperature:
												Number.parseFloat(e.currentTarget.value) || null,
										},
									}))
								}
								className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-md text-xs mt-1"
							/>
						</label>
					</div>

					<div>
						<label className="block text-xs font-medium mb-1">
							Top K
							<input
								type="number"
								value={state.params.topK ?? ""}
								onChange={(e) =>
									setState((prev) => ({
										...prev,
										params: {
											...prev.params,
											topK: Number.parseInt(e.currentTarget.value) || null,
										},
									}))
								}
								className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-md text-xs mt-1"
							/>
						</label>
					</div>

					<div>
						<label className="block text-xs font-medium mb-1">
							Top P
							<input
								type="number"
								step="0.1"
								min="0"
								max="1"
								value={state.params.topP ?? ""}
								onChange={(e) =>
									setState((prev) => ({
										...prev,
										params: {
											...prev.params,
											topP: Number.parseFloat(e.currentTarget.value) || null,
										},
									}))
								}
								className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-md text-xs mt-1"
							/>
						</label>
					</div>

					<div>
						<label className="block text-xs font-medium mb-1">
							Freq Penalty
							<input
								type="number"
								step="0.1"
								min="-2"
								max="2"
								value={state.params.frequencyPenalty ?? ""}
								onChange={(e) =>
									setState((prev) => ({
										...prev,
										params: {
											...prev.params,
											frequencyPenalty:
												Number.parseFloat(e.currentTarget.value) || null,
										},
									}))
								}
								className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-md text-xs mt-1"
							/>
						</label>
					</div>

					<div>
						<label className="block text-xs font-medium mb-1">
							Presence Penalty
							<input
								type="number"
								step="0.1"
								min="-2"
								max="2"
								value={state.params.presencePenalty ?? ""}
								onChange={(e) =>
									setState((prev) => ({
										...prev,
										params: {
											...prev.params,
											presencePenalty:
												Number.parseFloat(e.currentTarget.value) || null,
										},
									}))
								}
								className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-md text-xs mt-1"
							/>
						</label>
					</div>
				</div>

				{/* Action Buttons */}
				<div className="flex flex-wrap gap-2">
					<button
						type="button"
						onClick={sendRequest}
						disabled={state.isLoading}
						className="px-4 py-2 bg-violet-500 hover:bg-violet-600 disabled:bg-zinc-500 rounded-md text-xs font-medium transition-colors cursor-pointer"
					>
						{state.isLoading ? "Generating..." : "Generate"}
					</button>

					<button
						type="button"
						onClick={shareAsUrl}
						className="px-4 py-2 bg-zinc-50 hover:bg-zinc-100 text-zinc-950 rounded-md text-xs font-medium transition-colors cursor-pointer"
					>
						Share URL
					</button>

					<button
						type="button"
						onClick={clearPrompt}
						className="px-4 py-2 bg-pink-500 hover:bg-pink-600 rounded-md text-xs font-medium transition-colors cursor-pointer"
					>
						Clear
					</button>

					<div className="flex gap-1">
						<button
							type="button"
							onClick={insertSystemTemplate}
							className="px-3 py-2 hover:underline cursor-pointer rounded-md text-xs transition-colors"
						>
							+System
						</button>
						<button
							type="button"
							onClick={insertUserTemplate}
							className="px-3 py-2 hover:underline cursor-pointer rounded-md text-xs transition-colors"
						>
							+User
						</button>
						<button
							type="button"
							onClick={insertAssistantTemplate}
							className="px-3 py-2 hover:underline cursor-pointer rounded-md text-xs transition-colors"
						>
							+Assistant
						</button>
					</div>
				</div>
			</div>

			{/* Editor */}
			<div className="flex-1 relative">
				<div ref={containerRef} className="h-full" />
				{state.isLoading && (
					<div className="absolute top-4 right-4 bg-violet-500 text-white px-3 py-1 rounded-md text-xs z-10">
						streaming response...
					</div>
				)}
			</div>

			{/* Footer Info */}
			<div className="bg-zinc-950 px-4 py-2 text-xs text-zinc-500 border-t border-zinc-700">
				<div className="flex justify-between items-center">
					<span>
						Endpoint: {state.apiBaseUrl}
						{hasTokenizer() ? "/completions" : "/chat/completions"} | Messages:{" "}
						{parseMessages(state.prompt).length}
					</span>
					{/* <span>Tokens: ~{Math.ceil(state.prompt.length / 4)}</span> */}
				</div>
			</div>
		</div>
	);
};
