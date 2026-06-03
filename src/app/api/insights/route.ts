import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcCalories } from "@/lib/utils";

export const dynamic = "force-dynamic";

const WINDOW_DAYS = 42;
const TARGET_LOSS_KG = 5;

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const since = new Date();
  since.setDate(since.getDate() - WINDOW_DAYS);

  const [user, runs, strengthLogs] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id }, select: { weightKg: true, name: true } }),
    prisma.run.findMany({ where: { userId: session.user.id, date: { gte: since } }, orderBy: { date: "desc" } }),
    prisma.strengthLog.findMany({ where: { userId: session.user.id, date: { gte: since } }, orderBy: { date: "desc" } }),
  ]);

  const currentWeightKg = user?.weightKg ?? null;
  const weeks = WINDOW_DAYS / 7;

  const runMinutesTotal = runs.reduce((s, r) => s + r.duration / 60, 0);
  const runCaloriesTotal = runs.reduce((s, r) => s + (r.calories ?? calcCalories(r.distance, currentWeightKg ?? 70)), 0);

  const strengthMinutesTotal = strengthLogs.reduce((s, l) => {
    if (l.durationMinutes) return s + l.durationMinutes;
    return s + Math.max(10, l.sets * 2.5);
  }, 0);
  const strengthCaloriesTotal = strengthLogs.reduce((s, l) => s + (l.calories ?? Math.round((l.durationMinutes ?? Math.max(10, l.sets * 2.5)) * 6)), 0);
  const strengthVolumeTotal = strengthLogs.reduce((s, l) => s + l.volumeKg, 0);

  const weeklyRunMinutes = runMinutesTotal / weeks;
  const weeklyStrengthMinutes = strengthMinutesTotal / weeks;
  const weeklyCaloriesBurned = (runCaloriesTotal + strengthCaloriesTotal) / weeks;
  const weightLossRateKgPerWeek = weeklyCaloriesBurned / 7700;
  const etaWeeks = weightLossRateKgPerWeek > 0.05 ? TARGET_LOSS_KG / weightLossRateKgPerWeek : null;

  const runSessionsPerWeek = runs.length / weeks;
  const strengthSessionsPerWeek = strengthLogs.length / weeks;

  const targetRunMinutes = 180;
  const targetStrengthSessions = 3;
  const avgRunSessionMinutes = runs.length > 0 ? runMinutesTotal / runs.length : 25;
  const extraRunSessions = Math.max(0, Math.ceil((targetRunMinutes - weeklyRunMinutes) / Math.max(avgRunSessionMinutes, 20)));
  const extraStrengthSessions = Math.max(0, Math.ceil(targetStrengthSessions - strengthSessionsPerWeek));

  const proteinHint = currentWeightKg
    ? `${Math.round(currentWeightKg * 1.6)}–${Math.round(currentWeightKg * 2.2)}g protein/day`
    : "1.6–2.2g protein per kg body weight/day";

  const recommendations: string[] = [];
  if (weeklyRunMinutes < 150) {
    recommendations.push(`Increase cardio to 150-210 min/week. Add ${extraRunSessions} extra run session(s) of ~${Math.round(Math.max(avgRunSessionMinutes, 20))} min.`);
  } else {
    recommendations.push("Cardio volume is solid. Keep 3-5 runs/week and progressively increase pace or incline.");
  }

  if (strengthSessionsPerWeek < 2) {
    recommendations.push(`Increase resistance training to 2-4 sessions/week. Add ${extraStrengthSessions} extra strength session(s).`);
  } else {
    recommendations.push("Strength frequency is strong. Keep progressive overload: +1-2 reps or +2.5 kg every 1-2 weeks when form is clean.");
  }

  recommendations.push(`Nutrition anchor: target ${proteinHint} and prioritize whole foods with a moderate calorie deficit.`);
  recommendations.push("Recovery anchor: sleep 7-9 hours and keep at least 1 full rest day weekly.");

  const summary = etaWeeks
    ? `At your current exercise pace, a ${TARGET_LOSS_KG}kg fat-loss target may take about ${Math.ceil(etaWeeks)} weeks (exercise-only estimate).`
    : `Current activity is too low to estimate reliable fat-loss pace yet. Build consistency for 2-3 weeks and re-check.`;

  return NextResponse.json({
    profile: {
      name: user?.name ?? "Athlete",
      weightKg: currentWeightKg,
    },
    metrics: {
      windowDays: WINDOW_DAYS,
      weeklyRunMinutes: round1(weeklyRunMinutes),
      weeklyStrengthMinutes: round1(weeklyStrengthMinutes),
      weeklyCaloriesBurned: Math.round(weeklyCaloriesBurned),
      runSessionsPerWeek: round1(runSessionsPerWeek),
      strengthSessionsPerWeek: round1(strengthSessionsPerWeek),
      strengthVolumeKgPerWeek: Math.round(strengthVolumeTotal / weeks),
      weightLossRateKgPerWeek: round1(weightLossRateKgPerWeek),
      etaWeeksForTargetLoss: etaWeeks ? Math.ceil(etaWeeks) : null,
    },
    targets: {
      weeklyRunMinutes: targetRunMinutes,
      weeklyStrengthSessions: targetStrengthSessions,
      suggestedExtraRunSessions: extraRunSessions,
      suggestedExtraStrengthSessions: extraStrengthSessions,
    },
    summary,
    recommendations,
  });
}
