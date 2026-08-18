import { startWebServer } from "./dist/web/server.js";
import { syncRepositoryToGlobalControl } from "./dist/control/repository-sync.js";

const port = 3000;
const host = "0.0.0.0";
const allowRemote = true;

try {
  await syncRepositoryToGlobalControl(process.cwd());
} catch {
  // Ignore sync error
}

const running = await startWebServer({
  port,
  host,
  allowRemote,
  noAuth: true,
});

console.log(`SUPER IA Web server active: http://${running.host}:${running.port}`);
console.log(`Web access token path: ${running.tokenPath}`);
