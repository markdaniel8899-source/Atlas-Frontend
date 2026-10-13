import * as monaco from "monaco-editor";
import { loader } from "@monaco-editor/react";

// Use the locally installed monaco-editor so all language services
// (HTML auto-closing tags, CSS, JS suggestions) load fully instead of
// relying on the CDN which may miss contributions.
loader.config({ monaco });

export { monaco };
