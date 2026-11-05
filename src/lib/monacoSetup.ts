import * as monaco from "monaco-editor";
import { loader } from "@monaco-editor/react";
import {
  assemblyCompletionProvider,
  assemblyLanguageConfiguration,
  assemblyLanguageDefinition,
} from "./monacoAssembly";

// Use the locally installed monaco-editor so all language services
// (HTML auto-closing tags, CSS, JS suggestions) load fully instead of
// relying on the CDN which may miss contributions.
loader.config({ monaco });

if (!monaco.languages.getLanguages().some((language) => language.id === "assembly")) {
  monaco.languages.register({
    id: "assembly",
    extensions: [".s", ".asm"],
    aliases: ["Assembly", "asm"],
  });
  monaco.languages.setMonarchTokensProvider(
    "assembly",
    assemblyLanguageDefinition,
  );
  monaco.languages.setLanguageConfiguration(
    "assembly",
    assemblyLanguageConfiguration,
  );
  monaco.languages.registerCompletionItemProvider(
    "assembly",
    assemblyCompletionProvider,
  );
}

export { monaco };
