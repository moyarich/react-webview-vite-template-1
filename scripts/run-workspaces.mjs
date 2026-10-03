import { readdir, readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";

const script = process.argv[2];
const forwardedArgs = process.argv.slice(3);

if (!script) {
  console.error("Usage: node scripts/run-workspaces.mjs <script> [...args]");
  process.exit(1);
}

const root = process.cwd();
const packagesDir = path.join(root, "packages");
const entries = await readdir(packagesDir, { withFileTypes: true });

const workspaces = [];

for (const entry of entries) {
  if (!entry.isDirectory()) {
    continue;
  }

  const packageJsonPath = path.join(packagesDir, entry.name, "package.json");

  try {
    const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
    workspaces.push({
      directory: entry.name,
      name: packageJson.name,
      scripts: packageJson.scripts ?? {},
    });
  } catch {
    console.warn(`SKIP packages/${entry.name} — no readable package.json`);
  }
}

workspaces.sort((a, b) => a.directory.localeCompare(b.directory));

let ran = 0;
let skipped = 0;

for (const workspace of workspaces) {
  if (!workspace.scripts[script]) {
    skipped += 1;
    console.log(
      `SKIP ${workspace.directory} — script "${script}" is not defined`,
    );
    continue;
  }

  ran += 1;
  console.log(`\nRUN  ${workspace.directory} — npm run ${script}`);

  const exitCode = await runWorkspaceScript(
    workspace.name,
    script,
    forwardedArgs,
  );

  if (exitCode !== 0) {
    console.error(
      `FAIL ${workspace.directory} — "${script}" exited with code ${exitCode}`,
    );
    process.exit(exitCode);
  }

  console.log(`PASS ${workspace.directory}`);
}

console.log(
  `\nWorkspace "${script}" complete: ${ran} ran, ${skipped} skipped.`,
);

function runWorkspaceScript(workspace, scriptName, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "npm",
      [
        "run",
        scriptName,
        "--workspace",
        workspace,
        ...(args.length ? ["--", ...args] : []),
      ],
      {
        cwd: root,
        stdio: "inherit",
        shell: process.platform === "win32",
      },
    );

    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) {
        console.error(
          `Workspace process stopped by signal ${signal}`,
        );
        resolve(1);
        return;
      }

      resolve(code ?? 1);
    });
  });
}
