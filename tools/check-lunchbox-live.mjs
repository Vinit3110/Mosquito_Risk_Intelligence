// Explicit read-only live UI check. Reads the operator token through SSH, never prints it.
/* global console, document, fetch, innerWidth, process, setTimeout */
import { spawn, execFileSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const frontendDirectory = fileURLToPath(new URL('../frontend/', import.meta.url));
const frontendRequire = createRequire(new URL('../frontend/package.json', import.meta.url));
const { chromium } = frontendRequire('@playwright/test');
const resultsDirectory = new URL('../frontend/test-results/', import.meta.url);

let token = '';
let browser;
let tunnel;
let vite;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
try {
  token = execFileSync('ssh', ['-o', 'BatchMode=yes', 'kbt-server', "sed -n 's/^OPERATOR_TOKEN=//p' ~/mosquito-surveillance/deploy/ubuntu/.env"], { encoding: 'utf8', windowsHide: true }).trim();
  if (token.length < 32) throw new Error('Operator credential unavailable');
  tunnel = spawn('ssh', ['-o', 'BatchMode=yes', '-o', 'ExitOnForwardFailure=yes', '-N', '-L', '8091:127.0.0.1:8091', 'kbt-server'], { windowsHide: true, stdio: 'ignore' });
  let tunnelFailed = false;
  tunnel.on('exit', code => { if (code !== null && code !== 0) tunnelFailed = true; });
  vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5190', '--strictPort'], { cwd: frontendDirectory, windowsHide: true, stdio: 'ignore' });
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    if (tunnelFailed) throw new Error('SSH tunnel could not bind port 8091; close a conflicting tunnel before running this check');
    try {
      const response = await fetch('http://127.0.0.1:5190/api/health');
      if (response.ok) { ready = true; break; }
    } catch { /* Wait for the owned tunnel and dev server. */ }
    await pause(500);
  }
  if (!ready) throw new Error('Live backend proxy unavailable');
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  await page.goto('http://127.0.0.1:5190/lunchbox');
  await page.getByLabel('Operator token', { exact: true }).fill(token);
  await page.getByRole('button', { name: 'Connect to server' }).click();
  await page.getByRole('heading', { name: 'No field observations received' }).waitFor();
  if (await page.getByText('248 original images', { exact: true }).count() !== 1) throw new Error('Real survey inventory missing');
  await mkdir(resultsDirectory, { recursive: true });
  await page.screenshot({ path: fileURLToPath(new URL('kbtcoe-live-desktop.png', resultsDirectory)), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  if (!await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)) throw new Error('Mobile layout overflows');
  await page.screenshot({ path: fileURLToPath(new URL('kbtcoe-live-mobile.png', resultsDirectory)), fullPage: true });
  await page.getByLabel('Show simulated test records').check();
  await page.getByText('3 mosquitoes', { exact: true }).first().waitFor();
  await page.getByRole('button', { name: 'Disconnect' }).click();
  await page.getByRole('heading', { name: 'Connect to view stored records' }).waitFor();
  console.log('PASS: actual Ubuntu API through SSH/Vite, real KBTCOE inventory, empty field data, labelled simulations, desktop/mobile and disconnect');
} catch (failure) {
  console.error(String(failure.message).split(token || '\0').join('[redacted]'));
  process.exitCode = 1;
} finally {
  await browser?.close();
  vite?.kill();
  tunnel?.kill();
}
