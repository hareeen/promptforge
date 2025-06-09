import type * as monaco from "monaco-editor";
import { useEffect, useState } from "react";
import type { ClientState } from "../types";
import { base64UrlToBase64 } from "./base64url";

// Default state values
const DEFAULT_STATE: ClientState = {
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
	meta: {
		isLoading: false,
		initialization: "pending",
		apiKey: undefined, // Use undefined to indicate no API key is set
	},
	tokenizerUrl: "",
};

export function useClientState(
	editorRef: React.RefObject<monaco.editor.IStandaloneCodeEditor>,
) {
	const [state, setState] = useState<ClientState>(() => {
		const saved = localStorage.getItem("llm_client_state");
		const apiKey = localStorage.getItem("api_key");
		if (saved) {
			try {
				return {
					...JSON.parse(saved),
					meta: {
						initialization: "pending",
						isLoading: false,
						apiKey: apiKey || undefined, // Use saved API key if available
					},
				};
			} catch {
				// fallback to default if corrupted
			}
		}
		return { ...DEFAULT_STATE };
	});

	// Load state from URL on mount
	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const encoded = params.get("state");

		if (state.meta.initialization === "pending") {
			if (encoded) {
				try {
					const decoded = JSON.parse(atob(base64UrlToBase64(encoded)));
					setState((prev) => ({
						...prev,
						...decoded,
						meta: {
							...prev.meta,
							initialization: "pulled",
						},
					}));
				} catch (e) {
					console.error("Failed to decode state from URL:", e);
				}
			} else {
				// If there are no URL parameters, just set to pulled state
				setState((prev) => ({
					...prev,
					meta: { ...prev.meta, initialization: "pulled" },
				}));
			}
		}
	}, [state.meta.initialization]);

	// Monaco editor initialization
	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		if (editorRef.current && state.meta.initialization === "pulled") {
			editorRef.current.setValue(state.prompt);
			setState((prev) => ({ ...prev, initialization: "completed" }));
		}

		if (!editorRef.current && state.meta.initialization === "completed") {
			// If editor is not initialized, reset to pulled
			setState((prev) => ({ ...prev, initialization: "pulled" }));
		}
	}, [editorRef.current, state.meta.initialization]);

	// Persist state to localStorage (except meta)
	useEffect(() => {
		const { meta, ...persistedState } = state;
		localStorage.setItem("llm_client_state", JSON.stringify(persistedState));
		localStorage.setItem("api_key", meta.apiKey || "");
	}, [state]);

	return [state, setState] as const;
}
