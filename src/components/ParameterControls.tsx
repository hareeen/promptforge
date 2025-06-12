import type React from "react";

interface ParameterControlsProps {
	params: {
		maxTokens: number | null;
		temperature: number | null;
		topK: number | null;
		topP: number | null;
		frequencyPenalty: number | null;
		presencePenalty: number | null;
	};
	onChange: (params: Partial<ParameterControlsProps["params"]>) => void;
}

export const ParameterControls: React.FC<ParameterControlsProps> = ({
	params,
	onChange,
}) => {
	return (
		<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-4">
			<div>
				<label className="block text-xs font-medium">
					Max Tokens
					<input
						type="number"
						value={params.maxTokens ?? ""}
						onChange={(e) =>
							onChange({
								maxTokens:
									e.currentTarget.value === ""
										? null
										: Number.parseInt(e.currentTarget.value),
							})
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
						value={params.temperature ?? ""}
						onChange={(e) =>
							onChange({
								temperature:
									e.currentTarget.value === ""
										? null
										: Number.parseFloat(e.currentTarget.value),
							})
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
						value={params.topK ?? ""}
						onChange={(e) =>
							onChange({
								topK:
									e.currentTarget.value === ""
										? null
										: Number.parseInt(e.currentTarget.value),
							})
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
						value={params.topP ?? ""}
						onChange={(e) =>
							onChange({
								topP:
									e.currentTarget.value === ""
										? null
										: Number.parseFloat(e.currentTarget.value),
							})
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
						value={params.frequencyPenalty ?? ""}
						onChange={(e) =>
							onChange({
								frequencyPenalty:
									e.currentTarget.value === ""
										? null
										: Number.parseFloat(e.currentTarget.value),
							})
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
						value={params.presencePenalty ?? ""}
						onChange={(e) =>
							onChange({
								presencePenalty:
									e.currentTarget.value === ""
										? null
										: Number.parseFloat(e.currentTarget.value),
							})
						}
						className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-md text-xs mt-1"
					/>
				</label>
			</div>
		</div>
	);
};
