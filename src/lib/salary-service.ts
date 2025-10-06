import { supabase } from "./supabase";
import {
  type ContractType,
  type SalaryEntry,
  type SalaryFilters,
  type SalaryInsert,
  type SalaryMetrics,
  formations,
  specialties,
  contractTypes,
} from "@/types/salary";

const SALARY_BUCKETS = [
  { label: "< 100k", min: 0, max: 99_999 },
  { label: "100k – 199k", min: 100_000, max: 199_999 },
  { label: "200k – 299k", min: 200_000, max: 299_999 },
  { label: "300k – 399k", min: 300_000, max: 399_999 },
  { label: "≥ 400k", min: 400_000, max: Number.POSITIVE_INFINITY },
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

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    ...row,
    job_title: row.job_title ?? null,
    salary: typeof row.salary === "string" ? Number(row.salary) : row.salary,
  }));
}

export function computeSalaryMetrics(entries: SalaryEntry[]): SalaryMetrics {
  const initialAverageFormation = formations.reduce<Record<string, number>>(
    (acc, formation) => {
      acc[formation] = 0;
      return acc;
    },
    {}
  );

  const initialAverageSpecialty = specialties.reduce<Record<string, number>>(
    (acc, speciality) => {
      acc[speciality] = 0;
      return acc;
    },
    {}
  );

  const initialAverageContract = contractTypes.reduce<Record<string, number>>(
    (acc, contract) => {
      acc[contract] = 0;
      return acc;
    },
    {}
  );

  const sumByFormation: Record<string, { total: number; count: number }> = {};
  const sumBySpecialty: Record<string, { total: number; count: number }> = {};
  const sumByContract: Record<string, { total: number; count: number }> = {};
  const countByFormation: Record<string, number> = {};
  const countBySpecialty: Record<string, number> = {};
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
    .slice(0, 6)
    .map((entry) => ({
      formation: entry.formation,
      speciality: entry.speciality,
      contract_type: entry.contract_type,
      salary: entry.salary,
      participant_type: entry.participant_type,
      created_at: entry.created_at,
      job_title: entry.job_title,
    }));

  return {
    totalParticipants: entries.length,
    averageByFormation:
      averageByFormation as SalaryMetrics["averageByFormation"],
    averageBySpecialty:
      averageBySpecialty as SalaryMetrics["averageBySpecialty"],
    averageByContract: averageByContract as SalaryMetrics["averageByContract"],
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
