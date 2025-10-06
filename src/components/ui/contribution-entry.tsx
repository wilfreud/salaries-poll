import { AlertTriangle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { JobDetailsPopover } from "@/components/ui/job-details-popover";
import type { SalaryEntry } from "@/types/salary";

interface ContributionEntryProps {
  entry: SalaryEntry;
  isExcluded: boolean;
  onToggleExclusion: (entryId: string, exclude: boolean) => void;
  currencyFormatter: Intl.NumberFormat;
}

export function ContributionEntry({
  entry,
  isExcluded,
  onToggleExclusion,
  currencyFormatter,
}: ContributionEntryProps) {
  const isOutlier = entry.is_flagged_outlier;

  return (
    <div
      className={`rounded-2xl border p-4 transition-all duration-200 ${
        isExcluded
          ? "border-red-500/20 bg-red-500/5 opacity-60"
          : "border-white/10 bg-white/5"
      }`}
    >
      {/* Header avec formation, spécialité, etc. */}
      <div
        className={`flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.2em] ${
          isExcluded ? "text-white/40 line-through" : "text-white/60"
        }`}
      >
        <div className="flex flex-wrap items-center gap-3">
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

        {/* Badge suspect et bouton d'exclusion */}
        {(isOutlier || isExcluded) && (
          <div className="flex items-center gap-2">
            {isOutlier && (
              <Badge
                variant="outline"
                className="border-orange-400/50 bg-orange-500/10 text-orange-300 text-xs"
              >
                <AlertTriangle className="h-2.5 w-2.5 mr-1" />
                Suspect
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleExclusion(entry.id, !isExcluded)}
              className={`h-6 px-2 text-xs ${
                isExcluded
                  ? "text-red-300 hover:text-red-100 hover:bg-red-500/20"
                  : "text-orange-300 hover:text-orange-100 hover:bg-orange-500/20"
              }`}
            >
              {isExcluded ? (
                <>
                  <Eye className="h-3 w-3 mr-1" />
                  Inclure
                </>
              ) : (
                <>
                  <EyeOff className="h-3 w-3 mr-1" />
                  Exclure
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Titre du poste */}
      <p
        className={`mt-3 text-sm ${
          isExcluded ? "text-white/40 line-through" : "text-white"
        }`}
      >
        <span className="font-semibold uppercase tracking-[0.2em] text-white/60">
          Intitulé
        </span>
        <br />
        {entry.job_title || "Non communiqué"}
      </p>

      {/* Salaire et métadonnées */}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span
          className={`text-lg font-medium ${
            isExcluded ? "text-white/40 line-through" : "text-white"
          }`}
        >
          {currencyFormatter.format(entry.salary)}
        </span>

        <div className="flex flex-wrap items-center gap-3 text-xs text-white/50">
          <span className={isExcluded ? "line-through text-white/30" : ""}>
            {new Date(entry.created_at).toLocaleDateString("fr-FR", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>

          {entry.years_since_graduation !== null && (
            <span className={isExcluded ? "line-through text-white/30" : ""}>
              Alumni +{entry.years_since_graduation} an
              {entry.years_since_graduation > 1 ? "s" : ""}
            </span>
          )}

          <JobDetailsPopover entry={entry} />
        </div>
      </div>

      {/* Raison de l'exclusion si outlier */}
      {isOutlier && entry.outlier_reason && (
        <div className="mt-2 rounded-lg border border-orange-500/20 bg-orange-500/5 p-2">
          <p className="text-xs text-orange-200/80">
            <AlertTriangle className="h-3 w-3 inline mr-1" />
            {entry.outlier_reason}
          </p>
        </div>
      )}
    </div>
  );
}
