import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import type { SalaryEntry } from "@/types/salary";

interface JobDetailsPopoverProps {
  entry: SalaryEntry;
}

export function JobDetailsPopover({ entry }: JobDetailsPopoverProps) {
  const hasJobDetails = entry.job_title || entry.job_description;

  if (!hasJobDetails) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-white/40 hover:text-white hover:bg-white/10"
        >
          <Eye className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {entry.formation}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {entry.speciality}
              </Badge>
            </div>
            {entry.years_since_graduation !== null && (
              <Badge variant="secondary" className="text-xs">
                Alumni +{entry.years_since_graduation}
              </Badge>
            )}
          </div>

          {entry.job_title && (
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-white">Poste</h4>
              <p className="text-sm text-white/80">{entry.job_title}</p>
            </div>
          )}

          {entry.job_description && (
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-white">Description</h4>
              <p className="text-xs text-white/70 leading-relaxed">
                {entry.job_description}
              </p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
