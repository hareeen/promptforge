import * as monaco from "monaco-editor";
import type React from "react";
import { useEffect, useRef } from "react";

interface PromptEditorProps {
	onChange: (value: string) => void;
	isLoading: boolean;
	editorRef: React.RefObject<monaco.editor.IStandaloneCodeEditor>;
}

const MONACO_THEME = "llm-theme";
const MONACO_LANGUAGE = "llm-prompt";

export const PromptEditor: React.FC<PromptEditorProps> = ({
	onChange,
	isLoading,
	editorRef,
}) => {
	const containerRef = useRef<HTMLDivElement>(null);

	// Initialize Monaco Editor
	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		if (containerRef.current && !editorRef.current) {
			// Define custom theme
			monaco.editor.defineTheme(MONACO_THEME, {
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
			monaco.languages.register({ id: MONACO_LANGUAGE });
			monaco.languages.setMonarchTokensProvider(MONACO_LANGUAGE, {
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
						[/>.*/, "comment"], // blockquote
						[/[-+*]\s.*/, "list"], // lists
					],

					codeblock: [
						[/```/, { token: "string", next: "@pop" }],
						[/.*$/, "string"],
					],
				},
			});

			editorRef.current = monaco.editor.create(containerRef.current, {
				language: MONACO_LANGUAGE,
				theme: MONACO_THEME,
				fontSize: 12,
				wordWrap: "on",
				minimap: { enabled: false },
				scrollBeyondLastLine: true,
				automaticLayout: true,
				lineNumbers: "on",
				folding: true,
				renderWhitespace: "boundary",
			});

			editorRef.current.onDidChangeModelContent(() => {
				const editorValue = editorRef.current?.getValue() || "";
				onChange(editorValue);
			});

			editorRef.current.addCommand(
				monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
				() => {
					if (typeof window !== "undefined") {
						const event = new CustomEvent("promptEditorSubmit");
						window.dispatchEvent(event);
					}
				},
			);
		}

		return () => {
			if (editorRef.current) {
				editorRef.current.dispose();
				editorRef.current = null;
			}
		};
	}, []);

	return (
		<div className="flex-1 relative">
			<div ref={containerRef} className="h-full" />
			{isLoading && (
				<div className="absolute top-4 right-4 bg-violet-500 text-white px-3 py-1 rounded-md text-xs z-10">
					streaming response...
				</div>
			)}
		</div>
	);
};
