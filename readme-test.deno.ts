// @deno-types='https://unpkg.com/@types/markdown-it@12.0.1/index.d.ts'
import 'https://unpkg.com/markdown-it@12.0.6/dist/markdown-it.js';

const md = window.markdownit();

const readme = await Deno.readTextFile("./README.md");

const tokens: any[] = md.parse(readme);

const code = tokens
  .filter(t => t.type === 'fence')
  .map((t, i) => `// Code block #${i + 1}\n${t.content.trim()}`)
  .join('\n\n');

console.log(`======== CODE ============
${code}
==========================`);

const dir = "./readme-test-files"
const file = dir + "/code.deno.ts";
await Deno.mkdir(dir);
await Deno.writeTextFile(file, code);

const { diagnostics } = await Deno.emit(file, {
  importMap: {
    imports: {
      "@drmercer/injector": "./injector.ts"
    },
  },
  // This is only used for resolving relative paths in the import map
  importMapPath: Deno.cwd() + "/nonexistent-import-map.json",
});

await Deno.remove(dir, { recursive: true });

if (diagnostics.length) {
  console.error(Deno.formatDiagnostics(diagnostics));
  Deno.exit(1);
} else {
  console.log("No type errors. Running tests");
}
