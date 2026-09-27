import assert from "node:assert/strict";
import { test } from "node:test";
import { maxLaunchDestination } from "./max-client.js";

test("bot payload routes only to allowed app screens", () => {
  assert.equal(maxLaunchDestination("start_param=route"), "/route");
  assert.equal(maxLaunchDestination("start_param=profile"), "/profile");
  assert.equal(maxLaunchDestination("start_param=lesson%3Acrypto-intro"), "/lessons/crypto-intro?from=route");
  assert.equal(maxLaunchDestination("start_param=case%3Afake-support-seed"), "/security/cases/fake-support-seed?from=route");
  assert.equal(maxLaunchDestination("start_param=replay%3Aglobal-shock-2020"), "/practice/global-shock-2020?from=route");
  assert.equal(maxLaunchDestination("start_param=https%3A%2F%2Fevil.example"), null);
});

test("MAX launch data is read from bridge or encoded URL fragment", async () => {
  const client = await import("./max-client.js").catch(() => null);
  assert.equal(client?.extractMaxLaunchData("signed-data", ""), "signed-data");
  assert.equal(client?.extractMaxLaunchData("", "#WebAppData=user%3D123%26hash%3Dabc&WebAppPlatform=web"), "user=123&hash=abc");
  assert.equal(client?.extractMaxLaunchData("", "#other=1"), "");
});
