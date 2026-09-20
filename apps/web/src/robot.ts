export const robotAssets = {
  waving: "/assets/crypto-buddy.png",
  reading: "/assets/crypto-buddy-reading.png",
  teaching: "/assets/crypto-buddy-teaching.png",
  thinking: "/assets/crypto-buddy-thinking.png",
  celebrating: "/assets/crypto-buddy-celebrating.png",
} as const;

export type RobotPose = keyof typeof robotAssets;
