const MAX_LINES = 800;
const roots = ["packages", "tests", "scripts"] as const;
const paths = new Set<string>();

for (const root of roots) {
  for (const path of new Bun.Glob("**/*.{ts,tsx}").scanSync(root)) {
    if (!path.includes("/dist/")) paths.add(`${root}/${path}`);
  }
}

const oversized: Array<{ readonly path: string; readonly lines: number }> = [];
for (const path of [...paths].sort()) {
  const source = await Bun.file(path).text();
  const lines =
    source.length === 0 ? 0 : source.replace(/\r?\n$/, "").split(/\r?\n/).length;
  if (lines > MAX_LINES) oversized.push({ path, lines });
}

if (oversized.length > 0) {
  for (const file of oversized) {
    console.error(`${file.path}: ${file.lines} lines (maximum ${MAX_LINES})`);
  }
  process.exit(1);
}

console.log(`Authored TypeScript files are at most ${MAX_LINES} lines.`);
