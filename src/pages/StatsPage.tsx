import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  AreaChart,
  Area,
} from "recharts";
import { AlertTriangle, Eye } from "lucide-react";

import { computeSalaryMetrics, fetchSalaryEntries } from "@/lib/salary-service";
import {
  formations,
  specialties,
  contractTypes,
  type SalaryFilters,
  type SalaryEntry,
  type SalaryMetrics,
  type Formation,
  type Specialty,
  type ContractType,
} from "@/types/salary";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

const currencyFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "XOF",
  maximumFractionDigits: 0,
});

const filterOptions = {
  formation: [
    { label: "Toutes les formations", value: "all" as const },
    ...formations.map((item) => ({ label: item, value: item })),
  ],
  speciality: [
    { label: "Toutes les spécialités", value: "all" as const },
    ...specialties.map((item) => ({ label: item, value: item })),
  ],
  contract: [
    { label: "Tous les contrats", value: "all" as const },
    ...contractTypes.map((item) => ({ label: item, value: item })),
  ],
  participant: [
    { label: "Tous les profils", value: "all" as const },
    { label: "Alumni", value: "Alumni" },
    { label: "Étudiant", value: "Étudiant" },
  ],
};

const CONTRACT_LABEL_MAP: Record<ContractType, string> = {
  Stage: "Stage",
  Alternance: "Alternance",
  CDD: "CDD",
  CDI: "CDI",
  "Prestation de service": "Prestation",
};

function toAverageArray(record: Record<string, number>) {
  return Object.entries(record).map(([label, value]) => ({ label, value }));
}

function computeMedian(entries: SalaryEntry[]) {
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

function ChartSkeleton() {
  return (
    <Skeleton className="h-64 w-full rounded-3xl border border-white/10 bg-white/5" />
  );
}

function EmptyState() {
  return (
    <Card className="border-white/10 bg-black/40 p-8 text-center text-white/70">
      <CardContent className="flex flex-col items-center gap-3">
        <AlertTriangle className="h-10 w-10 text-white/40" />
        <h3 className="text-lg font-semibold text-white">
          Aucune donnée pour l’instant
        </h3>
        <p className="text-sm text-white/60">
          Partage ton salaire sur l’onglet{" "}
          <span className="font-medium text-white">Contribuer</span> pour
          alimenter les statistiques.
        </p>
      </CardContent>
    </Card>
  );
}

export default function StatsPage() {
  const [filters, setFilters] = useState<SalaryFilters>({
    participantType: "Alumni",
  });
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);

  useEffect(() => {
    if (
      filters.participantType &&
      filters.participantType !== "Alumni" &&
      filters.yearsSinceGraduation !== undefined
    ) {
      setFilters((prev) => {
        const next = { ...prev };
        delete next.yearsSinceGraduation;
        return next;
      });
    }
  }, [filters.participantType, filters.yearsSinceGraduation]);

  const query = useQuery<
    { entries: SalaryEntry[]; metrics: SalaryMetrics },
    Error
  >({
    queryKey: ["salaries", filters],
    queryFn: async () => {
      const entries = await fetchSalaryEntries(filters);
      const metrics = computeSalaryMetrics(entries);
      return { entries, metrics };
    },
    staleTime: 60_000,
    refetchInterval: 90_000,
    retry: 1,
    throwOnError: false,
    placeholderData: (previousData) => previousData,
  });

  const overallAverage = useMemo(
    () =>
      query.data?.entries.length
        ? Math.round(
            query.data.entries.reduce(
              (acc: number, item: SalaryEntry) => acc + item.salary,
              0
            ) / query.data.entries.length
          )
        : 0,
    [query.data?.entries]
  );

  const medianSalary = useMemo(
    () => (query.data?.entries ? computeMedian(query.data.entries) : 0),
    [query.data?.entries]
  );

  const pivotedTrend = useMemo(() => {
    if (!query.data?.metrics) return [];
    return formations.map((formation) => {
      const base: Record<string, string | number> = { formation };
      specialties.forEach((speciality) => {
        const matching =
          query.data?.metrics.averageBySpecialtyAndFormation.find(
            (item) =>
              item.formation === formation && item.speciality === speciality
          );
        base[speciality] = matching?.averageSalary ?? 0;
      });
      return base;
    });
  }, [query.data?.metrics]);

  const contractChartData = useMemo(() => {
    if (!query.data?.metrics) return [];
    return toAverageArray(query.data.metrics.averageByContract ?? {}).map(
      (item) => ({
        ...item,
        label: CONTRACT_LABEL_MAP[item.label as ContractType] ?? item.label,
      })
    );
  }, [query.data?.metrics]);

  const availableYears = useMemo(() => {
    if (!query.data?.entries) return [];
    const unique = new Set<number>();
    query.data.entries.forEach((entry) => {
      if (typeof entry.years_since_graduation === "number") {
        unique.add(entry.years_since_graduation);
      }
    });
    return Array.from(unique).sort((a, b) => a - b);
  }, [query.data?.entries]);

  const handleFilterChange = <Key extends keyof SalaryFilters>(
    key: Key,
    value: SalaryFilters[Key] | "all"
  ) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (value === "all") {
        delete next[key];
      } else {
        next[key] = value as SalaryFilters[Key];
      }
      return next;
    });
  };

  const isLoadingState = query.isLoading || query.isFetching;
  const hasData = (query.data?.entries?.length ?? 0) > 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-12"
    >
      <div className="flex flex-col gap-6 rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur-2xl md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-semibold text-white">
              Statistiques en direct
            </h2>
            <Badge
              variant="outline"
              className="border-white/30 bg-white/10 text-white/80"
            >
              Live
            </Badge>
          </div>
          <p className="text-sm text-white/70">
            Filtre les données par formation, spécialité ou nature de contrat
            pour affiner les indicateurs clés.
          </p>
        </div>
        <div className="grid w-full gap-3 text-sm md:w-auto md:grid-cols-5">
          <Select
            value={(filters.formation as string) ?? "all"}
            onValueChange={(value) =>
              handleFilterChange("formation", value as Formation | "all")
            }
          >
            <SelectTrigger className="border-white/20 bg-black/40 text-white">
              <SelectValue placeholder="Formation" />
            </SelectTrigger>
            <SelectContent className="border border-white/10 bg-black/90 text-sm text-white">
              {filterOptions.formation.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={(filters.speciality as string) ?? "all"}
            onValueChange={(value) =>
              handleFilterChange("speciality", value as Specialty | "all")
            }
          >
            <SelectTrigger className="border-white/20 bg-black/40 text-white">
              <SelectValue placeholder="Spécialité" />
            </SelectTrigger>
            <SelectContent className="border border-white/10 bg-black/90 text-sm text-white">
              {filterOptions.speciality.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={(filters.contractType as string) ?? "all"}
            onValueChange={(value) =>
              handleFilterChange("contractType", value as ContractType | "all")
            }
          >
            <SelectTrigger className="border-white/20 bg-black/40 text-white">
              <SelectValue placeholder="Contrat" />
            </SelectTrigger>
            <SelectContent className="border border-white/10 bg-black/90 text-sm text-white">
              {filterOptions.contract.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={(filters.participantType as string) ?? "Alumni"}
            onValueChange={(value) =>
              handleFilterChange(
                "participantType",
                value as "Alumni" | "Étudiant" | "all"
              )
            }
          >
            <SelectTrigger className="border-white/20 bg-black/40 text-white">
              <SelectValue placeholder="Profil" />
            </SelectTrigger>
            <SelectContent className="border border-white/10 bg-black/90 text-sm text-white">
              {filterOptions.participant.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={
              typeof filters.yearsSinceGraduation === "number"
                ? String(filters.yearsSinceGraduation)
                : "all"
            }
            onValueChange={(value) =>
              handleFilterChange(
                "yearsSinceGraduation",
                value === "all" ? "all" : Number(value)
              )
            }
            disabled={
              (filters.participantType &&
                filters.participantType !== "Alumni") ||
              availableYears.length === 0
            }
          >
            <SelectTrigger className="border-white/20 bg-black/40 text-white disabled:cursor-not-allowed disabled:opacity-50">
              <SelectValue placeholder="Ancienneté" />
            </SelectTrigger>
            <SelectContent className="border border-white/10 bg-black/90 text-sm text-white">
              <SelectItem value="all">Toutes les anciennetés</SelectItem>
              {availableYears.map((years) => (
                <SelectItem key={years} value={String(years)}>
                  {years === 0
                    ? "Alumni +0 — bébé alumni"
                    : `Alumni +${years} an${years > 1 ? "s" : ""}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {query.isError && (
        <Card className="border-red-500/30 bg-red-500/10 p-6 text-sm text-red-100">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base font-semibold text-red-100">
              Impossible de charger les statistiques
            </CardTitle>
            <CardDescription className="text-red-200">
              {(query.error as Error)?.message ??
                "Vérifie la configuration Supabase et réessaie."}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {!hasData && !isLoadingState && !query.isError && <EmptyState />}

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-white/10 bg-black/40 p-6 text-white">
          <CardHeader className="space-y-1">
            <CardDescription>Participants</CardDescription>
            <CardTitle className="text-4xl font-semibold">
              {isLoadingState ? (
                <Skeleton className="h-8 w-24 bg-white/10" />
              ) : (
                query.data?.metrics.totalParticipants ?? 0
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-white/60">
            Nombre total de contributions anonymes pour la période sélectionnée.
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-black/40 p-6 text-white">
          <CardHeader className="space-y-1">
            <CardDescription>Par profil</CardDescription>
            <CardTitle className="text-2xl font-semibold">
              Statistiques des participants
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-white/60">
            {/* Discreet participant counts (replaces the previous 'Par profil' card) */}
            <div className="mt-1 text-xs text-white/60">
              {!isLoadingState && query.data ? (
                <span>
                  Alumni:{" "}
                  {query.data.metrics.countByParticipantType.Alumni ?? 0} •
                  Étudiants:{" "}
                  {query.data.metrics.countByParticipantType["Étudiant"] ?? 0}
                </span>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-black/40 p-6 text-white">
          <CardHeader className="space-y-1">
            <CardDescription>Salaire moyen</CardDescription>
            <CardTitle className="text-4xl font-semibold">
              {isLoadingState ? (
                <Skeleton className="h-8 w-32 bg-white/10" />
              ) : (
                currencyFormatter.format(overallAverage)
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-white/60">
            Moyenne des salaires nets déclarés selon les filtres appliqués.
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-black/40 p-6 text-white">
          <CardHeader className="space-y-1">
            <CardDescription>Médiane</CardDescription>
            <CardTitle className="text-4xl font-semibold">
              {isLoadingState ? (
                <Skeleton className="h-8 w-32 bg-white/10" />
              ) : (
                currencyFormatter.format(medianSalary)
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-white/60">
            La moitié des salaires se situe sous cette valeur, les autres
            au-dessus.
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/10 bg-black/40 p-6 text-white">
        <CardHeader>
          <CardTitle>Participants par formation & profil</CardTitle>
          <CardDescription className="text-white/70">
            Nombre de contributions par formation ventilées par type de profil.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {formations.map((formation) => (
              <div
                key={formation}
                className="rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <div className="text-sm uppercase tracking-[0.2em] text-white/60">
                  {formation}
                </div>
                <div className="mt-2 text-lg font-medium text-white">
                  {query.data?.metrics.countByFormation[formation] ?? 0}
                </div>
                <div className="mt-1 text-sm text-white/60">
                  Alumni:{" "}
                  {
                    query.data?.entries.filter(
                      (e) =>
                        e.formation === formation &&
                        e.participant_type === "Alumni"
                    ).length
                  }{" "}
                  • Étudiants:{" "}
                  {
                    query.data?.entries.filter(
                      (e) =>
                        e.formation === formation &&
                        e.participant_type === "Étudiant"
                    ).length
                  }
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-white/10 bg-black/40 p-6 text-white">
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle>Revenu moyen par formation</CardTitle>
              <CardDescription className="text-white/70">
                Compare rapidement les niveaux selon le diplôme.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="h-72">
            {isLoadingState ? (
              <ChartSkeleton />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={toAverageArray(
                    query.data?.metrics.averageByFormation ?? {}
                  )}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.08)"
                  />
                  <XAxis
                    dataKey="label"
                    stroke="rgba(255,255,255,0.6)"
                    tickLine={false}
                  />
                  <YAxis
                    stroke="rgba(255,255,255,0.6)"
                    tickFormatter={(value) => `${Math.round(value / 1000)}k`}
                  />
                  <RechartsTooltip
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                    contentStyle={{
                      backgroundColor: "#090909",
                      borderRadius: 16,
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#fff",
                    }}
                    formatter={(value: number) =>
                      currencyFormatter.format(value)
                    }
                  />
                  <Bar
                    dataKey="value"
                    radius={[12, 12, 0, 0]}
                    fill="rgba(255,255,255,0.85)"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-black/40 p-6 text-white">
          <CardHeader>
            <CardTitle>Répartition des contrats</CardTitle>
            <CardDescription className="text-white/70">
              Vue rapide sur les niveaux de rémunération selon le type de
              contrat.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {isLoadingState ? (
              <ChartSkeleton />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={contractChartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.08)"
                  />
                  <XAxis
                    dataKey="label"
                    stroke="rgba(255,255,255,0.6)"
                    tickLine={false}
                  />
                  <YAxis
                    stroke="rgba(255,255,255,0.6)"
                    tickFormatter={(value) => `${Math.round(value / 1000)}k`}
                  />
                  <RechartsTooltip
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                    contentStyle={{
                      backgroundColor: "#090909",
                      borderRadius: 16,
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#fff",
                    }}
                    formatter={(value: number) =>
                      currencyFormatter.format(value)
                    }
                  />
                  <Bar
                    dataKey="value"
                    radius={[12, 12, 0, 0]}
                    fill="rgba(220,220,220,0.85)"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-black/40 p-6 text-white">
          <CardHeader>
            <CardTitle>Répartition des salaires</CardTitle>
            <CardDescription className="text-white/70">
              Visualise en un coup d’œil les tranches de rémunération.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {isLoadingState ? (
              <ChartSkeleton />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={query.data?.metrics.salariesByRange ?? []}>
                  <defs>
                    <linearGradient id="fillRange" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="rgba(255,255,255,0.8)"
                        stopOpacity={0.7}
                      />
                      <stop
                        offset="95%"
                        stopColor="rgba(255,255,255,0.05)"
                        stopOpacity={0.05}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.08)"
                  />
                  <XAxis
                    dataKey="label"
                    stroke="rgba(255,255,255,0.6)"
                    tickLine={false}
                  />
                  <YAxis stroke="rgba(255,255,255,0.6)" />
                  <RechartsTooltip
                    cursor={{ stroke: "rgba(255,255,255,0.2)" }}
                    contentStyle={{
                      backgroundColor: "#090909",
                      borderRadius: 16,
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#fff",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="rgba(255,255,255,0.85)"
                    fill="url(#fillRange)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-black/40 p-6 text-white">
          <CardHeader>
            <CardTitle>Nombre de participants par formation</CardTitle>
            <CardDescription className="text-white/70">
              Analyse de l’engagement des promos.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {isLoadingState ? (
              <ChartSkeleton />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={toAverageArray(
                    query.data?.metrics.countByFormation ?? {}
                  )}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.08)"
                  />
                  <XAxis
                    dataKey="label"
                    stroke="rgba(255,255,255,0.6)"
                    tickLine={false}
                  />
                  <YAxis stroke="rgba(255,255,255,0.6)" allowDecimals={false} />
                  <RechartsTooltip
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                    contentStyle={{
                      backgroundColor: "#090909",
                      borderRadius: 16,
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#fff",
                    }}
                  />
                  <Bar
                    dataKey="value"
                    radius={[12, 12, 0, 0]}
                    fill="rgba(180,180,180,0.85)"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/10 bg-black/40 p-6 text-white">
        <CardHeader className="flex flex-col gap-1">
          <CardTitle>Tendance par spécialité et formation</CardTitle>
          <CardDescription className="text-white/70">
            Les lignes mettent en lumière les variations entre promotions et
            spécialisations.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[360px]">
          {isLoadingState ? (
            <ChartSkeleton />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={pivotedTrend}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.08)"
                />
                <XAxis dataKey="formation" stroke="rgba(255,255,255,0.6)" />
                <YAxis
                  stroke="rgba(255,255,255,0.6)"
                  tickFormatter={(value) =>
                    `${Math.round(Number(value) / 1000)}k`
                  }
                />
                <RechartsTooltip
                  cursor={{ stroke: "rgba(255,255,255,0.3)" }}
                  contentStyle={{
                    backgroundColor: "#090909",
                    borderRadius: 16,
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#fff",
                  }}
                  formatter={(value: number) => currencyFormatter.format(value)}
                />
                <Legend />
                {specialties.map((speciality, index) => (
                  <Line
                    key={speciality}
                    type="monotone"
                    dataKey={speciality}
                    stroke={`hsla(0,0%,${80 - index * 12}%,1)`}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {hasData && query.data?.metrics.latestEntries.length ? (
        <Card className="border-white/10 bg-black/40">
          <CardHeader>
            <CardTitle>Contributions récentes</CardTitle>
            <CardDescription className="text-white/70">
              Toutes les contributions les plus récentes (triées du plus récent
              au plus ancien).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-white/70">
            {query.data.metrics.latestEntries.map((entry) => {
              const isExpanded = expandedEntryId === entry.id;
              return (
                <div
                  key={entry.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.2em] text-white/60">
                    <span>{entry.formation}</span>
                    <Separator
                      orientation="vertical"
                      className="hidden h-4 bg-white/20 sm:block"
                    />
                    <span>{entry.speciality}</span>
                    <Separator
                      orientation="vertical"
                      className="hidden h-4 bg-white/20 sm:block"
                    />
                    <span>{entry.contract_type}</span>
                    <Separator
                      orientation="vertical"
                      className="hidden h-4 bg-white/20 sm:block"
                    />
                    <span>{entry.participant_type}</span>
                  </div>
                  <p className="mt-3 text-sm text-white">
                    <span className="font-semibold uppercase tracking-[0.2em] text-white/60">
                      Intitulé
                    </span>
                    <br />
                    {entry.job_title || "Non communiqué"}
                  </p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-lg font-medium text-white">
                      {currencyFormatter.format(entry.salary)}
                    </span>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-white/50">
                      <span>
                        {new Date(entry.created_at).toLocaleDateString(
                          "fr-FR",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          }
                        )}
                      </span>
                      {entry.years_since_graduation !== null ? (
                        <span>
                          Alumni +{entry.years_since_graduation} an
                          {entry.years_since_graduation > 1 ? "s" : ""}
                        </span>
                      ) : null}
                      {entry.job_description ? (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedEntryId(isExpanded ? null : entry.id)
                          }
                          className="inline-flex items-center gap-1 rounded-full border border-white/20 px-3 py-1 text-white/70 transition hover:border-white/40 hover:text-white"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {isExpanded ? "Masquer" : "Voir détails"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                  {entry.job_description && isExpanded ? (
                    <div className="mt-3 rounded-xl border border-white/10 bg-black/60 p-3 text-sm text-white/75">
                      <p className="mb-2 text-xs uppercase tracking-[0.25em] text-white/50">
                        Description du poste
                      </p>
                      <p className="whitespace-pre-line">
                        {entry.job_description}
                      </p>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}
    </motion.section>
  );
}
