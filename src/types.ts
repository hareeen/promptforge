export interface RequestParams {
	maxTokens: number | null;
	temperature: number | null;
	topK: number | null;
	topP: number | null;
	frequencyPenalty: number | null;
	presencePenalty: number | null;
}

export interface ClientStateMeta {
	initialization: "pending" | "pulled" | "completed";
	isLoading: boolean;
	apiKey?: string;
}

export interface ClientState {
	apiBaseUrl: string;
	model: string;
	params: RequestParams;
	prompt: string;
	tokenizerUrl: string;
	meta: ClientStateMeta;
}

export interface Message {
	role: "system" | "user" | "assistant";
	content: string;
}
