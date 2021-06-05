// @deno-types='https://unpkg.com/@types/markdown-it@12.0.1/index.d.ts'
import 'https://unpkg.com/markdown-it@12.0.6/dist/markdown-it.js';

const md = window.markdownit();

const readme = await Deno.readTextFile("./README.md");

const tokens: any[] = md.parse(readme);

const code = tokens
  .filter(t => t.type === 'fence' && t.info === 'ts')
  .map((t, i) => `// Code block #${i + 1}\n${t.content.trim()}`)
  .join('\n\n');

console.log(`======== CODE ============
${code}
==========================`);

const dir = "./readme-test-files"
const file = dir + "/code.deno.ts";
const mapFile = dir + "/importmap.json";
await Deno.mkdir(dir);
await Deno.writeTextFile(file, code);
await Deno.writeTextFile(mapFile, JSON.stringify({
  imports: {
    "@drmercer/injector": "../injector.ts"
  },
}));

let success = true;

console.log("Running tests. Output:");

const p = Deno.run({
  cmd: [
    Deno.execPath(),
    "run",
    "--quiet",
    "--import-map",
    mapFile,
    file,
  ],
  stderr: "piped",
});

const rawError = await p.stderrOutput();

const errorString = new TextDecoder().decode(rawError).trim();
if (errorString) {
  console.error("ERROR: Test file logged errors:");
  console.error(errorString);
  success = false;
}

const status = await p.status();
if (status.code !== 0) {
  console.error("ERROR: Test file exited with status code " + status.code);
  success = false;
}

await Deno.remove(dir, { recursive: true });

if (!success) {
  Deno.exit(1);
} else {
  console.log("Success!");
}
