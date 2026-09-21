export const robotAssets = {
  waving: "/assets/crypto-buddy.webp",
  reading: "/assets/crypto-buddy-reading.webp",
  teaching: "/assets/crypto-buddy-teaching.webp",
  thinking: "/assets/crypto-buddy-thinking.webp",
  celebrating: "/assets/crypto-buddy-celebrating.webp",
} as const;

export type RobotPose = keyof typeof robotAssets;
