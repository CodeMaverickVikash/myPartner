import { useRef, useState } from "react";
import Editor from "@monaco-editor/react";

export default function CodeEditor() {
    const editorRef = useRef(null);
    const monacoRef = useRef(null);

    const [code, setCode] = useState("");

    /** BEFORE MOUNT */
    function handleBeforeMount(monaco) {
        monaco.editor.defineTheme("app-dark", {
            base: "vs-dark",
            inherit: true,
            rules: [
                { token: "comment", foreground: "6A9955" },
                { token: "keyword", foreground: "C586C0" },
                { token: "string", foreground: "CE9178" },
            ],
            colors: {
                "editor.background": "#0f172a",
            },
        });

        monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
            jsx: monaco.languages.typescript.JsxEmit.React,
            allowNonTsExtensions: true,
            target: monaco.languages.typescript.ScriptTarget.ESNext,
        });
    }

    /** ON MOUNT */
    function handleMount(editor, monaco) {
        editorRef.current = editor;
        monacoRef.current = monaco;

        // Ctrl + S → format
        editor.addCommand(
            monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
            () => {
                editor.getAction("editor.action.formatDocument").run();
            }
        );

        // Autocomplete
        monaco.languages.registerCompletionItemProvider("javascript", {
            provideCompletionItems: () => ({
                suggestions: [
                    {
                        label: "useState",
                        kind: monaco.languages.CompletionItemKind.Function,
                        insertText: "useState()",
                    },
                    {
                        label: "useEffect",
                        kind: monaco.languages.CompletionItemKind.Function,
                        insertText: "useEffect(() => {}, [])",
                    },
                ],
            }),
        });
    }

    return (
        <div className="code-editor border border-radius-8 p-10">
            <Editor
                height="500px"
                language="javascript"
                theme="app-dark"
                value={code}
                beforeMount={handleBeforeMount}
                onMount={handleMount}
                onChange={(value) => setCode(value || "")}
                options={{
                    fontSize: 14,
                    minimap: { enabled: false },
                    wordWrap: "on",
                    automaticLayout: true,
                    formatOnPaste: true,
                    formatOnType: true,
                }}
            />
        </div>
    );
}
