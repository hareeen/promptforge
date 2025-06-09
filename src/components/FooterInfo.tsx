import type React from "react";
import type { ClientState } from "../types";
import { parseMessages } from "../utils/promptUtils";

interface FooterInfoProps {
	state: ClientState;
}

export const FooterInfo: React.FC<FooterInfoProps> = ({ state }) => {
	const endpoint =
		state.apiBaseUrl +
		(state.tokenizerUrl.trim() !== "" ? "/completions" : "/chat/completions");
	const messageCount = parseMessages(state.prompt).length;

	return (
		<div className="bg-zinc-950 px-4 py-2 text-xs text-zinc-500 border-t border-zinc-700">
			<div className="flex justify-between items-center">
				<span>
					Endpoint: {endpoint} | Messages: {messageCount}
				</span>
				{/* <span>Tokens: ~{Math.ceil(state.prompt.length / 4)}</span> */}
			</div>
		</div>
	);
};
