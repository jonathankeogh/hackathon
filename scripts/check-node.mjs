// Fail fast with a clear message instead of an obscure build or startup error.
const [major, minor] = process.versions.node.split(".").map(Number);
const ok = (major === 20 && minor >= 19) || (major === 22 && minor >= 12) || major > 22;
if (!ok) {
  console.error(
    `\nDeadlock needs Node 20.19+ or 22.12+ (you have ${process.version}).\n` +
      `Install Node 22 from https://nodejs.org, or with nvm: nvm install 22 && nvm use 22\n`,
  );
  process.exit(1);
}
if (major < 22 || (major === 22 && minor < 5)) {
  console.warn(`Note: Node ${process.version} runs the seeded demo; the live WhatsApp chat needs Node 22.5+.`);
}
