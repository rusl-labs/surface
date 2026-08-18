import { rm } from "node:fs/promises";
import { join } from "node:path";

const packageRoot = process.cwd();
const manifest = await Bun.file(join(packageRoot, "package.json")).json();
if (manifest.private === true || manifest.exports === undefined) {
  throw new Error("Package builds require a publishable package directory.");
}

await rm(join(packageRoot, "dist"), { force: true, recursive: true });
const compiler = Bun.spawn(
  ["bun", "x", "tsc", "-b", "tsconfig.build.json", "--force"],
  { cwd: packageRoot, stderr: "inherit", stdout: "inherit" },
);
process.exit(await compiler.exited);
