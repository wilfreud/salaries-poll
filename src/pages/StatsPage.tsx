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
import { AlertTriangle } from "lucide-react";

import {
  computeSalaryMetrics,
  fetchSalaryEntries,
  computeMedian,
  getAvailableYearsSinceGraduation,
  filterEntriesForCalculations,
} from "@/lib/salary-service";
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ContributionEntry } from "@/components/ui/contribution-entry";
import { OutlierManager } from "@/components/ui/outlier-manager";

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
  return Object.entries(record)
    .filter(([_, value]) => value > 0) // Ne garder que les moyennes avec des données réelles
    .map(([label, value]) => ({ label, value }));
}

// Suppression de computeMedian - maintenant dans salary-service.ts

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
    selectedYearsSinceGraduation: [],
    excludeOutliers: true, // Par défaut, les valeurs suspectes sont ignorées
    excludeSpecificEntries: [],
  });

  // Query pour obtenir toutes les entrées Alumni afin de calculer les années disponibles
  const allAlumniQuery = useQuery<SalaryEntry[], Error>({
    queryKey: ["all-alumni"],
    queryFn: async () => {
      return await fetchSalaryEntries({ participantType: "Alumni" });
    },
    staleTime: 300_000, // 5 minutes
  });

  const availableYears = useMemo(() => {
    if (!allAlumniQuery.data) return [];
    return getAvailableYearsSinceGraduation(allAlumniQuery.data);
  }, [allAlumniQuery.data]);

  useEffect(() => {
    if (
      filters.participantType &&
      filters.participantType !== "Alumni" &&
      filters.selectedYearsSinceGraduation?.length
    ) {
      setFilters((prev) => {
        const next = { ...prev };
        delete next.selectedYearsSinceGraduation;
        return next;
      });
    }
  }, [filters.participantType]);

  const query = useQuery<
    { entries: SalaryEntry[]; metrics: SalaryMetrics },
    Error
  >({
    queryKey: ["salaries", filters],
    queryFn: async () => {
      const entries = await fetchSalaryEntries(filters);
      const metrics = computeSalaryMetrics(entries, filters);
      return { entries, metrics };
    },
    staleTime: 60_000,
    refetchInterval: 90_000,
    retry: 1,
    throwOnError: false,
    placeholderData: (previousData) => previousData,
  });

  // Entrées filtrées pour les calculs (exclut les outliers/suspects si demandé)
  const filteredEntriesForCalculations = useMemo(() => {
    if (!query.data?.entries) return [];
    return filterEntriesForCalculations(query.data.entries, filters);
  }, [query.data?.entries, filters]);

  const overallAverage = useMemo(
    () =>
      filteredEntriesForCalculations.length
        ? Math.round(
            filteredEntriesForCalculations.reduce(
              (acc: number, item: SalaryEntry) => acc + item.salary,
              0
            ) / filteredEntriesForCalculations.length
          )
        : 0,
    [filteredEntriesForCalculations]
  );

  const medianSalary = useMemo(
    () =>
      filteredEntriesForCalculations.length
        ? computeMedian(filteredEntriesForCalculations)
        : 0,
    [filteredEntriesForCalculations]
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

  const handleToggleExcludeOutliers = (exclude: boolean) => {
    setFilters((prev) => ({ ...prev, excludeOutliers: exclude }));
  };

  const handleToggleSpecificEntry = (entryId: string, exclude: boolean) => {
    setFilters((prev) => {
      const current = prev.excludeSpecificEntries || [];
      const newExclusions = exclude
        ? [...current, entryId]
        : current.filter((id) => id !== entryId);
      return { ...prev, excludeSpecificEntries: newExclusions };
    });
  };

  const isLoadingState = query.isLoading || query.isFetching;
  const hasData = (filteredEntriesForCalculations?.length ?? 0) > 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-12"
    >
      {/* Note sur l'exclusion des données suspectes */}
      <div className="rounded-xl bg-orange-500/10 border border-orange-500/30 p-3 mb-2 text-xs text-orange-200 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 inline mr-1" />
        <span>
          Par défaut, les données suspectes (valeurs éloignées de la médiane)
          sont ignorées des statistiques. Vous pouvez les inclure via le bouton{" "}
          <b>Inclure suspects</b> ci-dessous.
        </span>
      </div>
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

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="border-white/20 bg-black/40 text-white hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50 w-full justify-between"
                disabled={
                  (filters.participantType &&
                    filters.participantType !== "Alumni") ||
                  availableYears.length === 0
                }
              >
                <span className="text-sm">
                  {filters.selectedYearsSinceGraduation?.length
                    ? filters.selectedYearsSinceGraduation.length ===
                      availableYears.length
                      ? "Toutes les anciennetés"
                      : filters.selectedYearsSinceGraduation.length === 1
                      ? filters.selectedYearsSinceGraduation[0] === 0
                        ? "Alumni +0 — bébé alumni"
                        : `Alumni +${
                            filters.selectedYearsSinceGraduation[0]
                          } an${
                            filters.selectedYearsSinceGraduation[0] > 1
                              ? "s"
                              : ""
                          }`
                      : `${
                          filters.selectedYearsSinceGraduation.length
                        } sélectionnée${
                          filters.selectedYearsSinceGraduation.length > 1
                            ? "s"
                            : ""
                        }`
                    : "Toutes les anciennetés"}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-white text-sm">
                    Filtrer par ancienneté
                  </h4>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        handleFilterChange("selectedYearsSinceGraduation", []);
                      }}
                      className="h-6 px-2 text-xs"
                      disabled={!filters.selectedYearsSinceGraduation?.length}
                    >
                      Tout
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        handleFilterChange("selectedYearsSinceGraduation", [
                          ...availableYears,
                        ]);
                      }}
                      className="h-6 px-2 text-xs"
                      disabled={
                        filters.selectedYearsSinceGraduation?.length ===
                        availableYears.length
                      }
                    >
                      Sélectionner tout
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                  {availableYears.map((year) => {
                    const isSelected =
                      filters.selectedYearsSinceGraduation?.includes(year) ||
                      false;
                    return (
                      <Button
                        key={year}
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          const current =
                            filters.selectedYearsSinceGraduation || [];
                          const newSelection = isSelected
                            ? current.filter((y) => y !== year)
                            : [...current, year];

                          handleFilterChange(
                            "selectedYearsSinceGraduation",
                            newSelection
                          );
                        }}
                        className={`justify-between text-xs ${
                          isSelected
                            ? "bg-white text-black hover:bg-white/90"
                            : "border-white/20 text-white hover:bg-white/10"
                        }`}
                      >
                        <span>
                          {year === 0
                            ? "Alumni +0 — bébé alumni"
                            : `Alumni +${year} an${year > 1 ? "s" : ""}`}
                        </span>
                        {isSelected && <span>✓</span>}
                      </Button>
                    );
                  })}
                </div>

                {filters.selectedYearsSinceGraduation?.length ? (
                  <div className="space-y-2">
                    <div className="text-xs text-white/60">
                      {filters.selectedYearsSinceGraduation.length} sélectionnée
                      {filters.selectedYearsSinceGraduation.length > 1
                        ? "s"
                        : ""}{" "}
                      :
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {filters.selectedYearsSinceGraduation
                        .sort((a, b) => a - b)
                        .map((year) => (
                          <Badge
                            key={year}
                            variant="secondary"
                            className="text-xs flex items-center gap-1"
                          >
                            {year === 0 ? "Bébé" : `+${year}`}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const current =
                                  filters.selectedYearsSinceGraduation || [];
                                const newSelection = current.filter(
                                  (y) => y !== year
                                );
                                handleFilterChange(
                                  "selectedYearsSinceGraduation",
                                  newSelection
                                );
                              }}
                              className="h-3 w-3 p-0 hover:bg-white/20"
                            >
                              ×
                            </Button>
                          </Badge>
                        ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </PopoverContent>
          </Popover>
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

      {hasData && query.data && (
        <OutlierManager
          entries={query.data.entries}
          excludeOutliers={filters.excludeOutliers || false}
          excludeSpecificEntries={filters.excludeSpecificEntries || []}
          onToggleExcludeOutliers={handleToggleExcludeOutliers}
          onToggleSpecificEntry={handleToggleSpecificEntry}
        />
      )}

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
                    filteredEntriesForCalculations.filter(
                      (e) =>
                        e.formation === formation &&
                        e.participant_type === "Alumni"
                    ).length
                  }{" "}
                  • Étudiants:{" "}
                  {
                    filteredEntriesForCalculations.filter(
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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Contributions récentes</CardTitle>
                <CardDescription className="text-white/70">
                  Toutes les contributions les plus récentes (triées du plus
                  récent au plus ancien).
                </CardDescription>
              </div>

              {/* Contrôles d'exclusion rapides */}
              <div className="flex items-center gap-2">
                {query.data.metrics.latestEntries.some(
                  (entry) => entry.is_flagged_outlier
                ) && (
                  <Button
                    variant={
                      filters.excludeOutliers ? "destructive" : "outline"
                    }
                    size="sm"
                    onClick={() =>
                      handleToggleExcludeOutliers(!filters.excludeOutliers)
                    }
                    className="text-xs"
                  >
                    {filters.excludeOutliers
                      ? "Inclure suspects"
                      : "Exclure suspects"}
                  </Button>
                )}

                {filters.excludeSpecificEntries?.length ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleFilterChange("excludeSpecificEntries", [])
                    }
                    className="text-xs text-orange-300 hover:text-orange-100"
                  >
                    Réinitialiser ({filters.excludeSpecificEntries.length})
                  </Button>
                ) : null}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-white/70">
            {query.data.metrics.latestEntries.map((entry) => {
              const isExcluded =
                (filters.excludeOutliers && entry.is_flagged_outlier) ||
                filters.excludeSpecificEntries?.includes(entry.id) ||
                false;

              return (
                <ContributionEntry
                  key={entry.id}
                  entry={entry}
                  isExcluded={isExcluded}
                  onToggleExclusion={handleToggleSpecificEntry}
                  currencyFormatter={currencyFormatter}
                />
              );
            })}

            {/* Statistiques d'exclusion */}
            {(filters.excludeOutliers ||
              filters.excludeSpecificEntries?.length) && (
              <div className="mt-4 rounded-lg border border-orange-500/20 bg-orange-500/5 p-3">
                <p className="text-xs text-orange-200/80">
                  <AlertTriangle className="h-3 w-3 inline mr-1" />
                  {(() => {
                    const totalExcluded =
                      query.data.metrics.latestEntries.filter(
                        (entry) =>
                          (filters.excludeOutliers &&
                            entry.is_flagged_outlier) ||
                          filters.excludeSpecificEntries?.includes(entry.id)
                      ).length;

                    return `${totalExcluded} contribution${
                      totalExcluded > 1 ? "s" : ""
                    } exclue${
                      totalExcluded > 1 ? "s" : ""
                    } des calculs statistiques`;
                  })()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </motion.section>
  );
}
