const fs = require('fs');
const path = require('path');

const targetFiles = [
  path.join(__dirname, '..', 'node_modules', 'expo', 'node_modules', '@expo', 'cli', 'build', 'src', 'utils', 'errors.js'),
  path.join(__dirname, '..', 'node_modules', '@expo', 'cli', 'build', 'src', 'utils', 'errors.js'),
];

for (const targetPath of targetFiles) {
  if (!fs.existsSync(targetPath)) continue;

  let content = fs.readFileSync(targetPath, 'utf8');
  if (content.includes('PATCHED: ignore transient socket errors')) {
    console.log(`[patch-expo-cli] Already patched: ${targetPath}`);
    continue;
  }

  const needle = 'function handleTooManyOpenFileErrors(error) {';
  const replacement = `function handleTooManyOpenFileErrors(error) {
    // PATCHED: ignore transient socket errors (Node 22 TLSWrap ECONNRESET bug)
    if (error && (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'EPIPE' || (error.message && error.message.includes('ECONNRESET')))) {
        return;
    }`;

  if (content.includes(needle)) {
    content = content.replace(needle, replacement);
    fs.writeFileSync(targetPath, content, 'utf8');
    console.log(`[patch-expo-cli] Successfully patched: ${targetPath}`);
  } else {
    console.warn(`[patch-expo-cli] Target pattern not found in: ${targetPath}`);
  }
}
