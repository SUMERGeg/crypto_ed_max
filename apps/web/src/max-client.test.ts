import assert from "node:assert/strict";
import { test } from "node:test";

test("MAX launch data is read from bridge or encoded URL fragment", async () => {
  const client = await import("./max-client.js").catch(() => null);
  assert.equal(client?.extractMaxLaunchData("signed-data", ""), "signed-data");
  assert.equal(client?.extractMaxLaunchData("", "#WebAppData=user%3D123%26hash%3Dabc&WebAppPlatform=web"), "user=123&hash=abc");
  assert.equal(client?.extractMaxLaunchData("", "#other=1"), "");
});
