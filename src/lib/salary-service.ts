import { supabase } from "./supabase";
import {
  type ContractType,
  type SalaryEntry,
  type SalaryFilters,
  type SalaryInsert,
  type SalaryMetrics,
  formations,
  specialties,
} from "@/types/salary";

const SALARY_BUCKETS = [
  { label: "< 100k", min: 0, max: 99_999 },
  { label: "100k – 199k", min: 100_000, max: 199_999 },
  { label: "200k – 299k", min: 200_000, max: 299_999 },
  { label: "300k – 399k", min: 300_000, max: 399_999 },
  { label: "400k – 499k", min: 400_000, max: 499_999 },
  { label: "500k – 599k", min: 500_000, max: 599_999 },
  { label: "600k – 699k", min: 600_000, max: 699_999 },
  { label: "700k – 799k", min: 700_000, max: 799_999 },
  { label: "≥ 800k", min: 800_000, max: Number.POSITIVE_INFINITY },
];

export async function createSalaryEntry(payload: SalaryInsert) {
  if (!supabase) throw new Error("Supabase client not configured.");

  const { error } = await supabase.from("salaries").insert(payload);
  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchSalaryEntries(
  filters: SalaryFilters = {}
): Promise<SalaryEntry[]> {
  if (!supabase) throw new Error("Supabase client not configured.");

  let query = supabase
    .from("salaries")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters.formation) {
    query = query.eq("formation", filters.formation);
  }
  if (filters.contractType) {
    query = query.eq("contract_type", filters.contractType);
  }
  if (filters.speciality) {
    query = query.eq("speciality", filters.speciality);
  }
  if (filters.participantType) {
    query = query.eq("participant_type", filters.participantType);
  }
  if (
    filters.selectedYearsSinceGraduation &&
    filters.selectedYearsSinceGraduation.length > 0
  ) {
    query = query.in(
      "years_since_graduation",
      filters.selectedYearsSinceGraduation
    );
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    ...row,
    job_title: row.job_title ?? null,
    job_description: row.job_description ?? null,
    years_since_graduation: (() => {
      if (typeof row.years_since_graduation === "number") {
        return row.years_since_graduation;
      }
      if (
        row.years_since_graduation === null ||
        row.years_since_graduation === undefined
      ) {
        return null;
      }
      const parsed = Number(row.years_since_graduation);
      return Number.isNaN(parsed) ? null : parsed;
    })(),
    salary: typeof row.salary === "string" ? Number(row.salary) : row.salary,
  }));
}

export function computeMedian(entries: SalaryEntry[]): number {
  if (!entries.length) return 0;
  const sorted = [...entries]
    .sort((a, b) => a.salary - b.salary)
    .map((entry) => entry.salary);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[middle - 1] + sorted[middle]) / 2);
  }
  return Math.round(sorted[middle]);
}

export function getAvailableYearsSinceGraduation(
  entries: SalaryEntry[]
): number[] {
  const uniqueYears = new Set<number>();
  entries.forEach((entry) => {
    if (typeof entry.years_since_graduation === "number") {
      uniqueYears.add(entry.years_since_graduation);
    }
  });
  return Array.from(uniqueYears).sort((a, b) => a - b);
}

export function computeSalaryMetrics(entries: SalaryEntry[]): SalaryMetrics {
  // Ne pas initialiser à 0 - seulement les moyennes avec des données réelles
  const initialAverageFormation: Record<string, number> = {};
  const initialAverageSpecialty: Record<string, number> = {};
  const initialAverageContract: Record<string, number> = {};

  const sumByFormation: Record<string, { total: number; count: number }> = {};
  const sumBySpecialty: Record<string, { total: number; count: number }> = {};
  const sumByContract: Record<string, { total: number; count: number }> = {};
  const countByFormation: Record<string, number> = {};
  const countBySpecialty: Record<string, number> = {};
  const countByParticipantType: Record<string, number> = {};
  const rangeCounts = SALARY_BUCKETS.map((bucket) => ({ ...bucket, count: 0 }));
  const comboBuckets: Record<string, { total: number; count: number }> = {};

  entries.forEach((entry) => {
    const safeSalary = Number(entry.salary) || 0;
    const formationKey = entry.formation;
    const specialtyKey = entry.speciality;
    const contractKey = entry.contract_type as ContractType;

    sumByFormation[formationKey] = sumByFormation[formationKey] || {
      total: 0,
      count: 0,
    };
    sumByFormation[formationKey].total += safeSalary;
    sumByFormation[formationKey].count += 1;

    sumBySpecialty[specialtyKey] = sumBySpecialty[specialtyKey] || {
      total: 0,
      count: 0,
    };
    sumBySpecialty[specialtyKey].total += safeSalary;
    sumBySpecialty[specialtyKey].count += 1;

    sumByContract[contractKey] = sumByContract[contractKey] || {
      total: 0,
      count: 0,
    };
    sumByContract[contractKey].total += safeSalary;
    sumByContract[contractKey].count += 1;

    countByFormation[formationKey] = (countByFormation[formationKey] ?? 0) + 1;
    countBySpecialty[specialtyKey] = (countBySpecialty[specialtyKey] ?? 0) + 1;
    countByParticipantType[entry.participant_type] =
      (countByParticipantType[entry.participant_type] ?? 0) + 1;

    const bucket = rangeCounts.find(
      (range) => safeSalary >= range.min && safeSalary <= range.max
    );
    if (bucket) bucket.count += 1;

    const comboKey = `${entry.speciality}-${entry.formation}`;
    comboBuckets[comboKey] = comboBuckets[comboKey] || { total: 0, count: 0 };
    comboBuckets[comboKey].total += safeSalary;
    comboBuckets[comboKey].count += 1;
  });

  const averageByFormation = Object.entries(sumByFormation).reduce<
    Record<string, number>
  >(
    (acc, [key, value]) => {
      acc[key] = value.count ? Math.round(value.total / value.count) : 0;
      return acc;
    },
    { ...initialAverageFormation }
  );

  const averageBySpecialty = Object.entries(sumBySpecialty).reduce<
    Record<string, number>
  >(
    (acc, [key, value]) => {
      acc[key] = value.count ? Math.round(value.total / value.count) : 0;
      return acc;
    },
    { ...initialAverageSpecialty }
  );

  const averageByContract = Object.entries(sumByContract).reduce<
    Record<string, number>
  >(
    (acc, [key, value]) => {
      acc[key] = value.count ? Math.round(value.total / value.count) : 0;
      return acc;
    },
    { ...initialAverageContract }
  );

  const averageBySpecialtyAndFormation = Object.entries(comboBuckets).map(
    ([key, value]) => {
      const [speciality, formation] = key.split("-") as [string, string];
      return {
        speciality: speciality as (typeof specialties)[number],
        formation: formation as (typeof formations)[number],
        averageSalary: value.count ? Math.round(value.total / value.count) : 0,
      };
    }
  );

  const latestEntries = [...entries]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .map((entry) => ({
      id: entry.id,
      formation: entry.formation,
      speciality: entry.speciality,
      contract_type: entry.contract_type,
      salary: entry.salary,
      participant_type: entry.participant_type,
      created_at: entry.created_at,
      job_title: entry.job_title,
      job_description: entry.job_description,
      years_since_graduation: entry.years_since_graduation,
    }));

  return {
    totalParticipants: entries.length,
    averageByFormation:
      averageByFormation as SalaryMetrics["averageByFormation"],
    averageBySpecialty:
      averageBySpecialty as SalaryMetrics["averageBySpecialty"],
    averageByContract: averageByContract as SalaryMetrics["averageByContract"],
    countByParticipantType:
      countByParticipantType as SalaryMetrics["countByParticipantType"],
    salariesByRange: rangeCounts.map((range) => ({
      label: range.label,
      count: range.count,
    })),
    countByFormation: countByFormation as SalaryMetrics["countByFormation"],
    countBySpecialty: countBySpecialty as SalaryMetrics["countBySpecialty"],
    averageBySpecialtyAndFormation,
    latestEntries,
  };
}
