const { spawn } = require("node:child_process");
const path = require("node:path");

const electronBinary = require("electron");
const mainEntry = path.join(__dirname, "main.cjs");

const child = spawn(electronBinary, [mainEntry], {
  cwd: path.resolve(__dirname, ".."),
  env: {
    ...process.env,
    HALOUI_DESKTOP_DEV: "1",
  },
  stdio: "inherit",
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
