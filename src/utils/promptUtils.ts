// Utility functions for prompt/message handling

export interface Message {
	role: "system" | "user" | "assistant";
	content: string;
}

/**
 * Parses a prompt string into an array of Message objects.
 */
export function parseMessages(prompt: string): Message[] {
	const messages: Message[] = [];
	const sections = prompt.split(/<\|(system|user|assistant)\|>/);

	for (let i = 1; i < sections.length; i += 2) {
		const role = sections[i] as "system" | "user" | "assistant";
		const content = sections[i + 1]?.replace(/<\|im_end\|>/g, "").trim() || "";
		if (content) {
			messages.push({ role, content });
		}
	}

	return messages;
}

/**
 * Converts an array of Message objects back into a prompt string.
 */
export function messagesToPrompt(messages: Message[]): string {
	return messages
		.map((msg) => {
			const roleTag = `<|${msg.role}|>`;
			const content = msg.content.replace(/<\|im_end\|>/g, "").trim();
			return `${roleTag}\n${content}\n<|im_end|>`;
		})
		.join("\n\n");
}
