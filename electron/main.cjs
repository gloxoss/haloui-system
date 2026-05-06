const { app, BrowserWindow, dialog, shell } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const net = require("node:net");

const APP_ROOT = path.resolve(__dirname, "..");
const APP_DISPLAY_NAME = "Haloui System";
const DESKTOP_DEV_FLAG = process.env.HALOUI_DESKTOP_DEV === "1";
const MIGRATION_STATE_FILE = "migration-state.json";
const DEFAULT_HOST = "127.0.0.1";
const UPLOAD_FOLDERS = ["logos", "employees"];

if (!app.isPackaged) {
  app.setPath("userData", path.join(app.getPath("appData"), "Haloui System Dev"));
}

let mainWindow = null;
let serverProcess = null;
let baseUrl = "";

function getDesktopPaths() {
  const userDataDir = app.getPath("userData");

  return {
    userDataDir,
    dataDir: path.join(userDataDir, "data"),
    uploadsDir: path.join(userDataDir, "uploads"),
    schemaPath: path.join(APP_ROOT, "db", "schema.sql"),
    migrationStatePath: path.join(userDataDir, MIGRATION_STATE_FILE),
  };
}

async function ensureRuntimeDirectories(paths) {
  await Promise.all([
    fsp.mkdir(paths.dataDir, { recursive: true }),
    fsp.mkdir(path.join(paths.dataDir, "backups"), { recursive: true }),
    fsp.mkdir(paths.uploadsDir, { recursive: true }),
  ]);

  await Promise.all(
    UPLOAD_FOLDERS.map((folder) =>
      fsp.mkdir(path.join(paths.uploadsDir, folder), { recursive: true }),
    ),
  );
}

async function readMigrationState(paths) {
  try {
    const raw = await fsp.readFile(paths.migrationStatePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeMigrationState(paths, state) {
  await fsp.mkdir(path.dirname(paths.migrationStatePath), { recursive: true });
  await fsp.writeFile(paths.migrationStatePath, JSON.stringify(state, null, 2), "utf8");
}

async function pathExists(targetPath) {
  try {
    await fsp.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function directoryHasEntries(targetPath) {
  try {
    const entries = await fsp.readdir(targetPath);
    return entries.length > 0;
  } catch {
    return false;
  }
}

async function validateLegacyRoot(rootPath) {
  if (!rootPath) {
    return null;
  }

  const dataDir = path.join(rootPath, "data");
  const uploadsDir = path.join(rootPath, "public", "uploads");
  const hasDatabase = await pathExists(path.join(dataDir, "haloui.db"));
  const hasUploads = await directoryHasEntries(uploadsDir);

  if (!hasDatabase && !hasUploads) {
    return null;
  }

  return {
    rootPath,
    dataDir,
    uploadsDir,
    hasDatabase,
    hasUploads,
  };
}

function uniquePaths(paths) {
  return [...new Set(paths.filter(Boolean).map((value) => path.resolve(value)))];
}

async function findLegacyInstall() {
  const desktopDir = app.getPath("desktop");
  const documentsDir = app.getPath("documents");
  const exeDir = path.dirname(app.getPath("exe"));

  const candidates = uniquePaths([
    process.cwd(),
    APP_ROOT,
    path.join(desktopDir, "haloui system"),
    path.join(desktopDir, "Haloui System"),
    path.join(documentsDir, "haloui system"),
    path.join(documentsDir, "Haloui System"),
    path.join(exeDir, "haloui system"),
    path.join(exeDir, "Haloui System"),
  ]);

  for (const candidate of candidates) {
    const match = await validateLegacyRoot(candidate);
    if (match) {
      return match;
    }
  }

  return null;
}

async function importLegacyData(paths, source) {
  if (source.hasDatabase) {
    await fsp.cp(source.dataDir, paths.dataDir, {
      force: true,
      recursive: true,
    });
  }

  if (source.hasUploads) {
    await fsp.cp(source.uploadsDir, paths.uploadsDir, {
      force: true,
      recursive: true,
    });
  }

  await writeMigrationState(paths, {
    importedAt: new Date().toISOString(),
    importedFrom: source.rootPath,
  });
}

async function promptForLegacyInstall() {
  const result = await dialog.showOpenDialog({
    buttonLabel: "Choisir le dossier",
    properties: ["openDirectory"],
    title: "Choisir l'ancien dossier Haloui System",
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return validateLegacyRoot(result.filePaths[0]);
}

async function ensureMigratedData(paths) {
  const hasDatabase = await pathExists(path.join(paths.dataDir, "haloui.db"));
  if (hasDatabase) {
    return;
  }

  const currentState = await readMigrationState(paths);
  const autoDetected = await findLegacyInstall();

  if (autoDetected) {
    await importLegacyData(paths, autoDetected);
    return;
  }

  if (currentState?.promptedAt) {
    return;
  }

  const selectedSource = await promptForLegacyInstall();

  if (selectedSource) {
    await importLegacyData(paths, selectedSource);
    return;
  }

  await writeMigrationState(paths, {
    promptedAt: new Date().toISOString(),
    skipped: true,
  });
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once("error", reject);
    server.listen(0, DEFAULT_HOST, () => {
      const address = server.address();
      server.close((closeError) => {
        if (closeError) {
          reject(closeError);
          return;
        }

        if (address && typeof address === "object") {
          resolve(address.port);
          return;
        }

        reject(new Error("Unable to allocate a local port."));
      });
    });
  });
}

async function waitForServer(url) {
  const timeoutAt = Date.now() + 45_000;
  let lastError = null;

  while (Date.now() < timeoutAt) {
    try {
      const response = await fetch(`${url}/api/health`);
      if (response.ok) {
        return;
      }

      lastError = new Error(`Health check failed with ${response.status}.`);
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw lastError ?? new Error("Timed out while waiting for the local server.");
}

function startDevServer(env, port) {
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

  return spawn(
    npmCommand,
    ["run", "dev", "--", "--hostname", DEFAULT_HOST, "--port", String(port)],
    {
      cwd: APP_ROOT,
      env,
      stdio: "inherit",
    },
  );
}

function startPackagedServer(env) {
  const bundledNodePath = path.join(
    APP_ROOT,
    "node-runtime",
    process.platform === "win32" ? "node.exe" : "node",
  );

  if (!fs.existsSync(bundledNodePath)) {
    throw new Error(`Bundled Node runtime is missing at ${bundledNodePath}.`);
  }

  return spawn(bundledNodePath, [path.join(APP_ROOT, "server.js")], {
    cwd: APP_ROOT,
    env,
    stdio: "inherit",
  });
}

function attachWindowGuards(windowToGuard) {
  windowToGuard.webContents.setWindowOpenHandler(({ url }) => {
    const target = new URL(url);
    const currentOrigin = new URL(baseUrl).origin;

    if (target.origin === currentOrigin) {
      createWindow(url, windowToGuard);
      return { action: "deny" };
    }

    shell.openExternal(url);
    return { action: "deny" };
  });

  windowToGuard.webContents.on("will-navigate", (event, url) => {
    const target = new URL(url);
    const currentOrigin = new URL(baseUrl).origin;

    if (target.origin !== currentOrigin) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
}

function createWindow(url, parentWindow = null) {
  const windowInstance = new BrowserWindow({
    width: parentWindow ? 1120 : 1440,
    height: parentWindow ? 820 : 920,
    minWidth: 1024,
    minHeight: 720,
    parent: parentWindow ?? undefined,
    show: false,
    title: APP_DISPLAY_NAME,
    autoHideMenuBar: true,
    backgroundColor: "#f5f1e8",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  attachWindowGuards(windowInstance);
  windowInstance.once("ready-to-show", () => windowInstance.show());
  windowInstance.loadURL(url);

  return windowInstance;
}

async function bootDesktopApp() {
  const runtimePaths = getDesktopPaths();
  await ensureRuntimeDirectories(runtimePaths);
  await ensureMigratedData(runtimePaths);

  const port = await getFreePort();
  const serverEnv = {
    ...process.env,
    HALOUI_DATA_DIR: runtimePaths.dataDir,
    HALOUI_UPLOADS_DIR: runtimePaths.uploadsDir,
    HALOUI_SCHEMA_PATH: runtimePaths.schemaPath,
    HOSTNAME: DEFAULT_HOST,
    NEXTAUTH_URL: `http://${DEFAULT_HOST}:${port}`,
    PORT: String(port),
  };

  serverProcess = DESKTOP_DEV_FLAG
    ? startDevServer(serverEnv, port)
    : startPackagedServer(serverEnv);

  serverProcess.once("exit", (code) => {
    if (!app.isQuitting) {
      dialog.showErrorBox(
        APP_DISPLAY_NAME,
        `Le serveur local s'est arrêté de façon inattendue (code ${code ?? "inconnu"}).`,
      );
      app.quit();
    }
  });

  baseUrl = `http://${DEFAULT_HOST}:${port}`;
  await waitForServer(baseUrl);
  mainWindow = createWindow(baseUrl);
}

app.on("before-quit", () => {
  app.isQuitting = true;

  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill();
  }
});

app.whenReady().then(async () => {
  try {
    await bootDesktopApp();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    dialog.showErrorBox(APP_DISPLAY_NAME, `Le lancement a échoué: ${message}`);
    app.quit();
  }
});

app.on("window-all-closed", () => {
  app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0 && baseUrl) {
    mainWindow = createWindow(baseUrl);
  }
});
