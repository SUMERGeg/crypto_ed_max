import assert from "node:assert/strict";
import test from "node:test";
import { careerRoleIconName } from "./career-role-icon.js";

test("each career role receives a purpose-specific icon", () => {
  const expected = {
    "blockchain-developer": "Code2",
    "smart-contract-security": "ShieldCheck",
    "onchain-data-analyst": "ChartNoAxesCombined",
    "crypto-product-manager": "PanelsTopLeft",
    "crypto-compliance-aml": "BadgeCheck",
    "crypto-market-researcher": "Search",
    "crypto-investor": "ChartCandlestick",
    "crypto-community-educator": "GraduationCap",
    "crypto-ecosystem-partnerships": "Handshake",
    "blockchain-infrastructure": "ServerCog",
  };

  Object.entries(expected).forEach(([roleId, icon]) => assert.equal(careerRoleIconName(roleId), icon));
});
