const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const standaloneRoot = path.join(projectRoot, ".next", "standalone");
const staticRoot = path.join(projectRoot, ".next", "static");
const publicRoot = path.join(projectRoot, "public");
const electronRoot = path.join(projectRoot, "electron");
const schemaPath = path.join(projectRoot, "db", "schema.sql");
const outputRoot = path.join(projectRoot, "desktop-dist", "app");
const nodeBinaryPath = process.execPath;

async function ensureExists(targetPath, label) {
  try {
    await fsp.access(targetPath);
  } catch {
    throw new Error(`${label} is missing at ${targetPath}. Run the Next build first.`);
  }
}

async function copyIntoOutput() {
  await ensureExists(standaloneRoot, "Standalone server output");
  await ensureExists(staticRoot, "Next static assets");
  await ensureExists(publicRoot, "Public assets");
  await ensureExists(schemaPath, "Database schema");

  await fsp.rm(outputRoot, { force: true, recursive: true });
  await fsp.mkdir(outputRoot, { recursive: true });

  await fsp.cp(standaloneRoot, outputRoot, {
    recursive: true,
  });

  await fsp.mkdir(path.join(outputRoot, ".next"), { recursive: true });
  await fsp.cp(staticRoot, path.join(outputRoot, ".next", "static"), {
    recursive: true,
  });
  await fsp.cp(publicRoot, path.join(outputRoot, "public"), {
    recursive: true,
  });
  await fsp.mkdir(path.join(outputRoot, "db"), { recursive: true });
  await fsp.copyFile(schemaPath, path.join(outputRoot, "db", "schema.sql"));
  await fsp.cp(electronRoot, path.join(outputRoot, "electron"), {
    recursive: true,
  });
  await fsp.mkdir(path.join(outputRoot, "node-runtime"), { recursive: true });
  await fsp.copyFile(
    nodeBinaryPath,
    path.join(outputRoot, "node-runtime", path.basename(nodeBinaryPath)),
  );
}

async function writeDesktopPackageJson() {
  const packageJsonPath = path.join(projectRoot, "package.json");
  const rootPackage = JSON.parse(await fsp.readFile(packageJsonPath, "utf8"));
  const desktopPackage = {
    name: rootPackage.name,
    productName: "Haloui System",
    version: rootPackage.version,
    private: true,
    description: rootPackage.description ?? "Local desktop build for Haloui System.",
    author: rootPackage.author ?? "Haloui System",
    main: "electron/main.cjs",
  };

  await fsp.writeFile(
    path.join(outputRoot, "package.json"),
    `${JSON.stringify(desktopPackage, null, 2)}\n`,
    "utf8",
  );
}

async function main() {
  await copyIntoOutput();
  await writeDesktopPackageJson();
  fs.writeFileSync(path.join(outputRoot, ".desktop-build-ready"), "ok\n");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
