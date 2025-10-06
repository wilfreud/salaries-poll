import { useState } from "react";
import { AlertTriangle, Eye, EyeOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { SalaryEntry } from "@/types/salary";

interface OutlierManagerProps {
  entries: SalaryEntry[];
  excludeOutliers: boolean;
  excludeSpecificEntries: string[];
  onToggleExcludeOutliers: (exclude: boolean) => void;
  onToggleSpecificEntry: (entryId: string, exclude: boolean) => void;
}

const currencyFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "XOF",
  maximumFractionDigits: 0,
});

export function OutlierManager({
  entries,
  excludeOutliers,
  excludeSpecificEntries,
  onToggleExcludeOutliers,
  onToggleSpecificEntry,
}: OutlierManagerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const outliers = entries.filter((entry) => entry.is_flagged_outlier);
  const suspiciousCount = outliers.length;

  if (suspiciousCount === 0) {
    return null;
  }

  const activeExclusions = outliers.filter(
    (entry) => excludeOutliers || excludeSpecificEntries.includes(entry.id)
  ).length;

  return (
    <Card className="border-orange-500/30 bg-orange-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-400" />
            <CardTitle className="text-orange-100">
              Valeurs suspectes détectées
            </CardTitle>
            <Badge
              variant="outline"
              className="border-orange-400/50 text-orange-200"
            >
              {suspiciousCount}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={excludeOutliers ? "default" : "outline"}
              size="sm"
              onClick={() => onToggleExcludeOutliers(!excludeOutliers)}
              className={`text-xs ${
                excludeOutliers
                  ? "bg-orange-600 text-white hover:bg-orange-700"
                  : "border-orange-400/50 text-orange-200 hover:bg-orange-500/10"
              }`}
            >
              {excludeOutliers ? (
                <>
                  <EyeOff className="h-3 w-3 mr-1" />
                  Exclues ({suspiciousCount})
                </>
              ) : (
                <>
                  <Eye className="h-3 w-3 mr-1" />
                  Incluses
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-orange-200 hover:bg-orange-500/10"
            >
              {isExpanded ? "Masquer" : "Voir détails"}
            </Button>
          </div>
        </div>
        <CardDescription className="text-orange-200/70">
          {activeExclusions > 0 ? (
            <>
              {activeExclusions} valeur{activeExclusions > 1 ? "s" : ""} exclue
              {activeExclusions > 1 ? "s" : ""} des calculs statistiques
            </>
          ) : (
            <>
              Ces valeurs sont incluses dans les calculs. Vous pouvez les
              exclure globalement ou individuellement.
            </>
          )}
        </CardDescription>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-3">
          <div className="grid gap-3">
            {outliers.map((entry) => {
              const isExcluded =
                excludeOutliers || excludeSpecificEntries.includes(entry.id);

              return (
                <div
                  key={entry.id}
                  className={`rounded-lg border p-3 transition-colors ${
                    isExcluded
                      ? "border-red-500/30 bg-red-500/5"
                      : "border-orange-400/30 bg-orange-500/5"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 text-sm">
                        <span
                          className={`text-white font-medium ${
                            isExcluded ? "line-through text-white/40" : ""
                          }`}
                        >
                          {currencyFormatter.format(entry.salary)}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            isExcluded ? "line-through opacity-50" : ""
                          }`}
                        >
                          {entry.formation} • {entry.speciality} •{" "}
                          {entry.contract_type}
                        </Badge>
                        {entry.years_since_graduation !== null && (
                          <Badge
                            variant="secondary"
                            className={`text-xs ${
                              isExcluded ? "line-through opacity-50" : ""
                            }`}
                          >
                            Alumni +{entry.years_since_graduation}
                          </Badge>
                        )}
                      </div>

                      <div
                        className={`text-xs text-orange-200/70 ${
                          isExcluded ? "line-through opacity-50" : ""
                        }`}
                      >
                        <AlertTriangle className="h-3 w-3 inline mr-1" />
                        {entry.outlier_reason}
                      </div>

                      {entry.job_title && (
                        <div
                          className={`text-xs text-white/60 ${
                            isExcluded ? "line-through opacity-50" : ""
                          }`}
                        >
                          <strong>Poste:</strong> {entry.job_title}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 ml-3">
                      {entry.job_description && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-orange-300 hover:text-orange-100"
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80">
                            <div className="space-y-2">
                              <h4 className="font-medium text-white text-sm">
                                Description du poste
                              </h4>
                              <p className="text-xs text-white/70 leading-relaxed">
                                {entry.job_description}
                              </p>
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}

                      <Button
                        variant={isExcluded ? "destructive" : "outline"}
                        size="sm"
                        onClick={() =>
                          onToggleSpecificEntry(entry.id, !isExcluded)
                        }
                        className="h-6 px-2 text-xs"
                        disabled={excludeOutliers} // Désactivé si exclusion globale
                      >
                        {isExcluded ? (
                          <>
                            <Eye className="h-3 w-3 mr-1" />
                            Inclure
                          </>
                        ) : (
                          <>
                            <X className="h-3 w-3 mr-1" />
                            Exclure
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {outliers.length > 3 && (
            <div className="text-center text-xs text-orange-200/60 mt-3">
              {outliers.length} valeur{outliers.length > 1 ? "s" : ""} suspect
              {outliers.length > 1 ? "es" : "e"} au total
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
