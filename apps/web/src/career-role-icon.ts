import {
  BadgeCheck,
  BriefcaseBusiness,
  ChartCandlestick,
  ChartNoAxesCombined,
  Code2,
  GraduationCap,
  Handshake,
  PanelsTopLeft,
  Search,
  ServerCog,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

const roleIconNames: Record<string, string> = {
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

const icons: Record<string, LucideIcon> = {
  Code2,
  ShieldCheck,
  ChartNoAxesCombined,
  PanelsTopLeft,
  BadgeCheck,
  Search,
  ChartCandlestick,
  GraduationCap,
  Handshake,
  ServerCog,
};

export function careerRoleIconName(roleId: string): string {
  return roleIconNames[roleId] ?? "BriefcaseBusiness";
}

export function careerRoleIconFor(roleId: string): LucideIcon {
  return icons[careerRoleIconName(roleId)] ?? BriefcaseBusiness;
}
