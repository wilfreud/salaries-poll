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

// Seuils pour la détection des valeurs aberrantes
const OUTLIER_DETECTION = {
  // Limites absolues
  ABSOLUTE_MIN: 50_000, // 50k minimum
  ABSOLUTE_MAX: 2_000_000, // 2M maximum

  // Multiplicateurs pour les seuils relatifs
  MEDIAN_MULTIPLIER: 2.5, // 250% de la médiane max
  MEDIAN_DIVIDER: 3, // 33% de la médiane min (médiane/3)

  // Seuils spécifiques par type de contrat
  CONTRACT_LIMITS: {
    Stage: { max: 500_000 }, // 500k max pour stages
    Alternance: { max: 600_000 }, // 600k max pour alternance
    CDD: { max: 1_500_000 }, // 1.5M max pour CDD
    CDI: { max: 2_000_000 }, // 2M max pour CDI
    "Prestation de service": { max: 2_000_000 }, // Range large pour freelance
  },

  // Minimum d'entrées pour calculer une médiane de groupe fiable
  MIN_GROUP_SIZE: 3,
} as const;

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

  // Transformation des données
  let entries = (data ?? []).map((row) => ({
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

  // Détection des valeurs aberrantes
  entries = detectOutliers(entries);

  return entries;
}

// Fonction utilitaire pour filtrer les entrées pour les calculs (sans affecter l'affichage)
function filterEntriesForCalculations(
  entries: SalaryEntry[],
  filters: SalaryFilters
): SalaryEntry[] {
  let filteredEntries = [...entries];

  // Filtrage des outliers si demandé
  if (filters.excludeOutliers) {
    filteredEntries = filteredEntries.filter(
      (entry) => !entry.is_flagged_outlier
    );
  }

  // Filtrage des entrées spécifiquement exclues
  if (
    filters.excludeSpecificEntries &&
    filters.excludeSpecificEntries.length > 0
  ) {
    filteredEntries = filteredEntries.filter(
      (entry) => !filters.excludeSpecificEntries!.includes(entry.id)
    );
  }

  return filteredEntries;
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

// Fonctions de détection des valeurs aberrantes
function isAbsoluteOutlier(
  salary: number,
  contractType: ContractType
): { isOutlier: boolean; reason?: string } {
  if (salary < OUTLIER_DETECTION.ABSOLUTE_MIN) {
    return {
      isOutlier: true,
      reason: `Valeur trop faible (< ${OUTLIER_DETECTION.ABSOLUTE_MIN.toLocaleString()} F)`,
    };
  }

  if (salary > OUTLIER_DETECTION.ABSOLUTE_MAX) {
    return {
      isOutlier: true,
      reason: `Valeur trop élevée (> ${OUTLIER_DETECTION.ABSOLUTE_MAX.toLocaleString()} F)`,
    };
  }

  const contractLimit = OUTLIER_DETECTION.CONTRACT_LIMITS[contractType];
  if (contractLimit && salary > contractLimit.max) {
    return {
      isOutlier: true,
      reason: `Valeur improbable pour un ${contractType} (> ${contractLimit.max.toLocaleString()} F)`,
    };
  }

  return { isOutlier: false };
}

function isRelativeOutlier(
  salary: number,
  groupMedian: number
): { isOutlier: boolean; reason?: string } {
  const minThreshold = groupMedian / OUTLIER_DETECTION.MEDIAN_DIVIDER;
  const maxThreshold = groupMedian * OUTLIER_DETECTION.MEDIAN_MULTIPLIER;

  if (salary < minThreshold) {
    return {
      isOutlier: true,
      reason: `Très en-dessous de la médiane du groupe (${groupMedian.toLocaleString()} F)`,
    };
  }

  if (salary > maxThreshold) {
    return {
      isOutlier: true,
      reason: `Très au-dessus de la médiane du groupe (${groupMedian.toLocaleString()} F)`,
    };
  }

  return { isOutlier: false };
}

function calculateGroupMedian(
  entries: SalaryEntry[],
  formation: string,
  speciality: string,
  contractType: string
): number | null {
  const groupEntries = entries.filter(
    (entry) =>
      entry.formation === formation &&
      entry.speciality === speciality &&
      entry.contract_type === contractType
  );

  if (groupEntries.length < OUTLIER_DETECTION.MIN_GROUP_SIZE) {
    return null; // Pas assez de données pour une médiane fiable
  }

  return computeMedian(groupEntries);
}

export function detectOutliers(entries: SalaryEntry[]): SalaryEntry[] {
  return entries.map((entry) => {
    // Vérification absolue
    const absoluteCheck = isAbsoluteOutlier(
      entry.salary,
      entry.contract_type as ContractType
    );
    if (absoluteCheck.isOutlier) {
      return {
        ...entry,
        is_flagged_outlier: true,
        outlier_reason: absoluteCheck.reason,
      };
    }

    // Vérification relative par groupe
    const groupMedian = calculateGroupMedian(
      entries,
      entry.formation,
      entry.speciality,
      entry.contract_type
    );
    if (groupMedian !== null) {
      const relativeCheck = isRelativeOutlier(entry.salary, groupMedian);
      if (relativeCheck.isOutlier) {
        return {
          ...entry,
          is_flagged_outlier: true,
          outlier_reason: relativeCheck.reason,
        };
      }
    }

    // Pas d'anomalie détectée
    return {
      ...entry,
      is_flagged_outlier: false,
      outlier_reason: undefined,
    };
  });
}

export function computeSalaryMetrics(
  entries: SalaryEntry[],
  filters: SalaryFilters = {}
): SalaryMetrics {
  // Filtrer les entrées pour les calculs (mais pas pour latestEntries)
  const entriesForCalculations = filterEntriesForCalculations(entries, filters);
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

  entriesForCalculations.forEach((entry) => {
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
      is_flagged_outlier: entry.is_flagged_outlier,
      outlier_reason: entry.outlier_reason,
    }));

  return {
    totalParticipants: entriesForCalculations.length,
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
