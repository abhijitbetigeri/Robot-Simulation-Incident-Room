import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/browser",
  use: { baseURL: "http://127.0.0.1:8789", headless: true },
  webServer: {
    command:
      "ROOM_PORT=8789 ROOM_DATA_DIR=.data/e2e SIM_SOURCE= SIM_PYTHON= python3 -m backend.server",
    url: "http://127.0.0.1:8789/api/config",
    reuseExistingServer: false,
  },
  timeout: 30000,
});
