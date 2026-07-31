import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("portfolio metadata identifies PlateRate", async () => {
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /PlateRate/);
  assert.match(layout, /Food Creator Pricing Calculator/);
});

test("YouTube integration keeps its key server-side", async () => {
  const route = await readFile(new URL("../app/api/youtube/route.ts", import.meta.url), "utf8");
  assert.match(route, /process\.env\.YOUTUBE_API_KEY/);
  assert.doesNotMatch(route, /NEXT_PUBLIC_YOUTUBE/);
});
