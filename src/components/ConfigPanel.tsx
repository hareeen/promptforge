import type React from "react";

interface ConfigPanelProps {
	apiBaseUrl: string;
	model: string;
	tokenizerUrl: string;
	onApiBaseUrlChange: (value: string) => void;
	onModelChange: (value: string) => void;
	onTokenizerUrlChange: (value: string) => void;
	onApiKeyChange: (value: string) => void;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({
	apiBaseUrl,
	model,
	tokenizerUrl,
	onApiBaseUrlChange,
	onModelChange,
	onTokenizerUrlChange,
	onApiKeyChange,
}) => (
	<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
		<div>
			<label className="block text-xs font-medium">
				API Base URL
				<input
					type="text"
					value={apiBaseUrl}
					onChange={(e) => onApiBaseUrlChange(e.currentTarget.value)}
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
					value={model}
					onChange={(e) => onModelChange(e.currentTarget.value)}
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
					value={tokenizerUrl}
					onChange={(e) => onTokenizerUrlChange(e.currentTarget.value)}
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
					onChange={(e) => onApiKeyChange(e.currentTarget.value)}
					className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-md text-xs mt-1"
					placeholder="sk-..."
				/>
			</label>
		</div>
	</div>
);
