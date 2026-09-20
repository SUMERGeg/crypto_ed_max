import { getProfile } from "./data.js";
import { getSecurityProgress, listThreats } from "./security-data.js";
import { listCompletedSimulations } from "./simulation.js";
import type { AppUser } from "./max-auth.js";

type Achievement = {
  id: string;
  code: string;
  title: string;
  description: string;
  icon: "BOOK" | "STAR" | "SHIELD" | "CHART" | "LAYERS" | "TARGET" | "CHECK";
  unlocked: boolean;
  progress: number;
  target: number;
};

function capped(value: number, target: number) {
  return Math.min(target, Math.max(0, value));
}

export async function getFullProfile(currentUser: AppUser) {
  const [learning, security, completedSimulations] = await Promise.all([
    getProfile(currentUser),
    getSecurityProgress(currentUser.id),
    listCompletedSimulations(currentUser.id),
  ]);
  const totalTrades = completedSimulations.reduce((sum, item) => sum + item.tradeCount, 0);
  const blockchain = learning.courses.find((course) => course.id === "blockchain")!;

  const achievement = (item: Omit<Achievement, "unlocked">): Achievement => ({ ...item, unlocked: item.progress >= item.target });
  const achievements = [
    achievement({ id: "first-lesson", code: "FIRST_LESSON", title: "Первый урок", description: "Завершить первый учебный урок", icon: "BOOK", progress: capped(learning.overallProgress.completedLessons, 1), target: 1 }),
    achievement({ id: "five-lessons", code: "FIVE_LESSONS", title: "Пять шагов", description: "Завершить 5 уроков", icon: "LAYERS", progress: capped(learning.overallProgress.completedLessons, 5), target: 5 }),
    achievement({ id: "test-master", code: "TEST_MASTER", title: "Тест-мастер", description: "Получить 100% в итоговом тесте", icon: "STAR", progress: capped(learning.quizStats.bestScore, 100), target: 100 }),
    achievement({ id: "security-user", code: "SECURITY_USER", title: "Безопасный пользователь", description: "Разобрать 3 ситуации с угрозами", icon: "SHIELD", progress: capped(security.completedCases, 3), target: 3 }),
    achievement({ id: "security-expert", code: "SECURITY_EXPERT", title: "Внимательный защитник", description: "Пройти все учебные кейсы безопасности", icon: "CHECK", progress: capped(security.completedCases, security.totalCases), target: security.totalCases }),
    achievement({ id: "first-replay", code: "FIRST_REPLAY", title: "Первый Market Replay", description: "Завершить исторический сценарий", icon: "CHART", progress: capped(completedSimulations.length, 1), target: 1 }),
    achievement({ id: "first-trade", code: "FIRST_TRADE", title: "Первое решение", description: "Совершить виртуальную операцию в завершённом сценарии", icon: "TARGET", progress: capped(totalTrades, 1), target: 1 }),
    achievement({ id: "blockchain-basics", code: "BLOCKCHAIN_BASICS", title: "Понял Blockchain", description: "Завершить все уроки направления Blockchain", icon: "LAYERS", progress: capped(blockchain.progress.completedLessons, blockchain.progress.totalLessons), target: blockchain.progress.totalLessons }),
  ];
  const unlockedAchievements = achievements.filter((item) => item.unlocked).length;
  const completedLessons = learning.overallProgress.completedLessons;
  const level = completedLessons >= 20 ? "КриптоЗнаток" : completedLessons >= 10 ? "Уверенный ученик" : completedLessons >= 5 ? "Исследователь" : "КриптоНовичок";
  const robotMessage = learning.overallProgress.percent === 100
    ? "Все уроки завершены. Теперь полезно повторять сложные темы и сравнивать решения в практике."
    : security.completedCases === 0
      ? "Попробуй один кейс безопасности: умение остановиться часто важнее скорости."
      : "Твой прогресс складывается из небольших действий. Продолжай с последнего урока.";

  return {
    user: learning.user,
    level,
    robotMessage,
    overallProgress: learning.overallProgress,
    courses: learning.courses,
    lastLesson: learning.lastLesson,
    quizStats: learning.quizStats,
    security: { ...security, threatCount: listThreats().length },
    simulations: {
      completedCount: completedSimulations.length,
      totalTrades,
      items: completedSimulations,
    },
    achievements: {
      unlocked: unlockedAchievements,
      total: achievements.length,
      items: achievements,
    },
  };
}
