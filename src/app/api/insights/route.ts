import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcCalories } from "@/lib/utils";

export const dynamic = "force-dynamic";

const WINDOW_DAYS = 42;
const TARGET_LOSS_KG = 5;
const MICRO_WINDOW_DAYS = 14;

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const since = new Date();
  since.setDate(since.getDate() - WINDOW_DAYS);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaAny = prisma as any;

  let user: { weightKg: number | null; name: string | null; dumbbellWeightKg?: number | null; barbellWeightKg?: number | null } | null = null;
  let runs: Array<{ duration: number; calories: number | null; distance: number; date: Date }> = [];
  let strengthLogs: Array<{
    durationMinutes: number | null;
    sets: number;
    calories: number | null;
    reps: number;
    volumeKg: number;
    equipment: "dumbbell" | "barbell";
    exercise: string;
    weightKg: number;
    date: Date;
  }> = [];

  try {
    user = await prismaAny.user.findUnique({
      where: { id: session.user.id },
      select: { weightKg: true, name: true, dumbbellWeightKg: true, barbellWeightKg: true },
    });
  } catch {
    user = { weightKg: null, name: null, dumbbellWeightKg: null, barbellWeightKg: null };
  }

  try {
    runs = await prisma.run.findMany({
      where: { userId: session.user.id, date: { gte: since } },
      orderBy: { date: "desc" },
      select: { duration: true, calories: true, distance: true, date: true },
    });
  } catch {
    runs = [];
  }

  try {
    strengthLogs = await prismaAny.strengthLog.findMany({
      where: { userId: session.user.id, date: { gte: since } },
      orderBy: { date: "desc" },
      select: {
        durationMinutes: true,
        sets: true,
        calories: true,
        reps: true,
        volumeKg: true,
        equipment: true,
        exercise: true,
        weightKg: true,
        date: true,
      },
    });
  } catch {
    strengthLogs = [];
  }

  const microSince = new Date();
  microSince.setDate(microSince.getDate() - MICRO_WINDOW_DAYS);
  const recentRuns = runs.filter((r) => new Date(r.date) >= microSince);
  const recentStrength = strengthLogs.filter((s) => new Date(s.date) >= microSince);

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

  const recentRunAvgMinutes = recentRuns.length > 0
    ? recentRuns.reduce((sum, r) => sum + r.duration, 0) / 60 / recentRuns.length
    : 24;
  const recentRunAvgDistance = recentRuns.length > 0
    ? recentRuns.reduce((sum, r) => sum + r.distance, 0) / recentRuns.length
    : 2.5;

  const cardioMinutesTomorrow = Math.max(20, Math.min(45,
    Math.round(
      weeklyRunMinutes < 150
        ? recentRunAvgMinutes + 6
        : recentRunAvgMinutes
    )
  ));
  const cardioDistanceTomorrow = Number((recentRunAvgDistance * (cardioMinutesTomorrow / Math.max(recentRunAvgMinutes, 1))).toFixed(1));

  const latestStrength = recentStrength[0] ?? strengthLogs[0] ?? null;
  const strengthEquipment: "dumbbell" | "barbell" = (latestStrength?.equipment as "dumbbell" | "barbell" | undefined)
    ?? ((user?.dumbbellWeightKg ?? 0) > 0 ? "dumbbell" : "barbell");
  const strengthWeight = latestStrength?.weightKg
    ?? (strengthEquipment === "dumbbell" ? user?.dumbbellWeightKg : user?.barbellWeightKg)
    ?? 0;
  const strengthSets = latestStrength?.sets ?? 3;
  const strengthReps = latestStrength?.reps ?? 10;
  const strengthExercise = latestStrength?.exercise
    ?? (strengthEquipment === "dumbbell" ? "Dumbbell Bench Press" : "Barbell Squat");
  const strengthMinutesTomorrow = latestStrength?.durationMinutes
    ?? Math.max(20, Math.round(strengthSets * 2.5 + 12));

  const todayDay = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDay = tomorrow.toLocaleDateString("en-US", { weekday: "long" });

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
    microPlan: {
      today: todayDay,
      tomorrow: tomorrowDay,
      cardio: {
        minutes: cardioMinutesTomorrow,
        distanceKm: cardioDistanceTomorrow,
        guidance: weeklyRunMinutes < 150
          ? "Easy run or brisk incline walk"
          : "Steady aerobic run",
      },
      strength: {
        equipment: strengthEquipment,
        exercise: strengthExercise,
        sets: strengthSets,
        reps: strengthReps,
        weightKg: strengthWeight,
        durationMinutes: strengthMinutesTomorrow,
      },
      recovery: {
        hydrationLiters: Number(((currentWeightKg ?? 70) * 0.035).toFixed(1)),
        sleepHours: "7.5-9",
      },
    },
    summary,
    recommendations,
  });
}
