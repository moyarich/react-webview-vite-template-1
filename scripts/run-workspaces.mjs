#!/usr/bin/env node

import { spawn } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import process from "node:process";
import { Command } from "commander";
import { Fzf } from "fzf";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const rootPackage = JSON.parse(
  await readFile(path.join(root, "package.json"), "utf8"),
);

const program = new Command()
  .name("run-workspaces")
  .description(
    "Run an npm script across workspace packages with exact or fuzzy selection.",
  )
  .version(rootPackage.version)
  .argument("<script>", "npm script to run")
  .argument("[args...]", "arguments forwarded to the workspace script")
  .option(
    "-w, --workspace <workspace>",
    "select an exact workspace directory or package name; repeatable",
    collect,
    [],
  )
  .option(
    "-f, --filter <query>",
    "fuzzy-select workspaces with the fzf matching algorithm",
  )
  .option(
    "-l, --limit <count>",
    "limit the number of fuzzy matches",
    parsePositiveInteger,
  )
  .option("--list", "list the selected workspaces without running anything")
  .option("--dry-run", "print commands without executing them")
  .addHelpText(
    "after",
    `
Examples:
  $ run-workspaces build
  $ run-workspaces lint --workspace multi-webview
  $ run-workspaces test --workspace react-webview-vite-scaffold
  $ run-workspaces build --filter multi
  $ run-workspaces build --filter webview --limit 2
  $ run-workspaces build --list
  $ run-workspaces test -- --runInBand
`,
  );

program.parse();

const [script, scriptArgs = []] = program.processedArgs;
const options = program.opts();
const workspaces = await discoverWorkspaces(root);
const selected = selectWorkspaces(workspaces, options);

if (selected.length === 0) {
  console.error("No workspaces matched the selection.");
  process.exit(1);
}

if (options.list) {
  printWorkspaceList(selected, script);
  process.exit(0);
}

let ran = 0;
let skipped = 0;

for (const workspace of selected) {
  if (!workspace.scripts[script]) {
    skipped += 1;
    console.log(
      `SKIP ${workspace.directory} — script "${script}" is not defined`,
    );
    continue;
  }

  const args = [
    "run",
    script,
    "--workspace",
    workspace.name,
    ...(scriptArgs.length ? ["--", ...scriptArgs] : []),
  ];

  console.log(
    `\nRUN  ${workspace.directory} — npm ${args.join(" ")}`,
  );
  ran += 1;

  if (options.dryRun) {
    continue;
  }

  const exitCode = await run("npm", args, root);

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

/**
 * Discover package workspaces from packages/*.
 *
 * @param {string} repositoryRoot
 * @returns {Promise<Array<{directory: string, name: string, scripts: Record<string, string>}>>}
 */
async function discoverWorkspaces(repositoryRoot) {
  const packagesDir = path.join(repositoryRoot, "packages");
  const entries = await readdir(packagesDir, { withFileTypes: true });
  const discovered = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const packageJsonPath = path.join(
      packagesDir,
      entry.name,
      "package.json",
    );

    try {
      const workspacePackage = JSON.parse(
        await readFile(packageJsonPath, "utf8"),
      );

      discovered.push({
        directory: entry.name,
        name: workspacePackage.name,
        scripts: workspacePackage.scripts ?? {},
      });
    } catch {
      console.warn(
        `SKIP packages/${entry.name} — no readable package.json`,
      );
    }
  }

  return discovered.sort((a, b) =>
    a.directory.localeCompare(b.directory),
  );
}

/**
 * Apply exact workspace selection and optional fuzzy matching.
 *
 * @param {Array<{directory: string, name: string, scripts: Record<string, string>}>} workspaces
 * @param {{workspace: string[], filter?: string, limit?: number}} options
 */
function selectWorkspaces(workspaces, options) {
  let selected = workspaces;

  if (options.workspace.length > 0) {
    const requested = new Set(options.workspace);

    selected = selected.filter(
      (workspace) =>
        requested.has(workspace.directory) ||
        requested.has(workspace.name),
    );

    for (const request of requested) {
      const found = selected.some(
        (workspace) =>
          workspace.directory === request ||
          workspace.name === request,
      );

      if (!found) {
        console.warn(`WARN workspace "${request}" was not found`);
      }
    }
  }

  if (options.filter) {
    const fzf = new Fzf(selected, {
      selector: (workspace) =>
        `${workspace.directory} ${workspace.name}`,
    });

    selected = fzf
      .find(options.filter)
      .map((entry) => entry.item);

    if (options.limit) {
      selected = selected.slice(0, options.limit);
    }
  }

  return selected;
}

/**
 * Print selected workspaces and whether they define the requested script.
 */
function printWorkspaceList(workspaces, scriptName) {
  for (const workspace of workspaces) {
    const status = workspace.scripts[scriptName] ? "RUN " : "SKIP";
    console.log(
      `${status} ${workspace.directory} (${workspace.name})`,
    );
  }
}

function collect(value, previous) {
  return [...previous, value];
}

function parsePositiveInteger(value) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error("--limit must be a positive integer");
  }

  return parsed;
}

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      shell: process.platform === "win32",
    });

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
