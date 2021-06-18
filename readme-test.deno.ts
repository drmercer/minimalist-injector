// @deno-types='https://unpkg.com/@types/markdown-it@12.0.1/index.d.ts'
import 'https://unpkg.com/markdown-it@12.0.6/dist/markdown-it.js';

const md = window.markdownit();

const readme = await Deno.readTextFile("./README.md");

const tokens: any[] = md.parse(readme);

const blocksToSkip = new Set([
  2,
  3,
  4,
  5,
  6,
  7,
  8,
]);

const globalImport = `import {injectable, makeInjector, override, InjectKey} from '../injector.ts';`

const code = globalImport + '\n' + tokens
  .filter(t => t.type === 'fence' && t.info === 'ts')
  .map(t => t.content.trim())
  .map(commentOutImports)
  .reduceRight((acc, b, i) => {
    return wrapCodeBlock(commentOutIf(blocksToSkip.has(i), b) + '\n\n' + acc, i)
  }, '')

function commentOutImports(code: string) {
  return code.replaceAll(/^import .*$/mg, '// $&');
}

function wrapCodeBlock(block: string, index: number): string {
  return `
(function codeBlock${index}() {

${block.trim()}
}()); // end codeBlock${index}`
}

function commentOutIf(condition: boolean, block: string) {
  return condition ? `/*\n${block.replaceAll('*/', '*\\/')}\n*/` : block;
}

console.log(`======== CODE ============
${withLineNumbers(code)}
==========================`);

function withLineNumbers(code: string) {
  return code
    .split('\n')
    .map((line, i) => `${String(i + 1).padEnd(4, ' ')} ${line}`)
    .join('\n')
}

const dir = "./readme-test-files"
const file = dir + "/code.deno.ts";
await Deno.mkdir(dir);
await Deno.writeTextFile(file, code);

let success = true;

console.log("Running tests. Output:");

const p = Deno.run({
  cmd: [
    Deno.execPath(),
    "run",
    "--quiet",
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
