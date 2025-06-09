import type React from "react";

interface ActionButtonsProps {
	isLoading: boolean;
	onGenerate: () => void;
	onShare: () => void;
	onClear: () => void;
	onInsertSystem: () => void;
	onInsertUser: () => void;
	onInsertAssistant: () => void;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
	isLoading,
	onGenerate,
	onShare,
	onClear,
	onInsertSystem,
	onInsertUser,
	onInsertAssistant,
}) => (
	<div className="flex flex-wrap gap-2">
		<button
			type="button"
			onClick={onGenerate}
			disabled={isLoading}
			className="px-4 py-2 bg-violet-500 hover:bg-violet-600 disabled:bg-zinc-500 rounded-md text-xs font-medium transition-colors cursor-pointer"
		>
			{isLoading ? "Generating..." : "Generate"}
		</button>
		<button
			type="button"
			onClick={onShare}
			className="px-4 py-2 bg-zinc-50 hover:bg-zinc-100 text-zinc-950 rounded-md text-xs font-medium transition-colors cursor-pointer"
		>
			Share URL
		</button>
		<button
			type="button"
			onClick={onClear}
			className="px-4 py-2 bg-pink-500 hover:bg-pink-600 rounded-md text-xs font-medium transition-colors cursor-pointer"
		>
			Clear
		</button>
		<div className="flex gap-1">
			<button
				type="button"
				onClick={onInsertSystem}
				className="px-3 py-2 hover:underline cursor-pointer rounded-md text-xs transition-colors"
			>
				+System
			</button>
			<button
				type="button"
				onClick={onInsertUser}
				className="px-3 py-2 hover:underline cursor-pointer rounded-md text-xs transition-colors"
			>
				+User
			</button>
			<button
				type="button"
				onClick={onInsertAssistant}
				className="px-3 py-2 hover:underline cursor-pointer rounded-md text-xs transition-colors"
			>
				+Assistant
			</button>
		</div>
	</div>
);

export default ActionButtons;
