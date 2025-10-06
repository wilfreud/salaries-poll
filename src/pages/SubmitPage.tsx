import { motion } from "framer-motion";
import { Shield, BarChart3, Sparkles } from "lucide-react";

import { SalaryForm } from "@/components/forms/SalaryForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const assurances = [
  {
    title: "100 % anonyme",
    description:
      "Aucune donnée nominative n’est sollicitée. Les enregistrements sont stockés sans identifiant personnel.",
    icon: Shield,
  },
  {
    title: "Mises à jour en direct",
    description:
      "Les statistiques évoluent instantanément pour refléter la réalité du marché.",
    icon: BarChart3,
  },
  {
    title: "Impact collectif",
    description:
      "Chaque saisie améliore la négociation salariale des promos actuelles et futures.",
    icon: Sparkles,
  },
];

export default function SubmitPage() {
  return (
    <motion.section
      className="grid gap-8 lg:grid-cols-[1.3fr_1fr]"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: "easeOut" }}
    >
      <SalaryForm />

      <div className="space-y-6">
        {assurances.map(({ title, description, icon: Icon }) => (
          <Card
            key={title}
            className="border-white/10 bg-black/35 backdrop-blur-2xl"
          >
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="rounded-full border border-white/20 bg-white/10 p-2 text-white">
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base text-white">{title}</CardTitle>
                <CardDescription className="text-sm text-white/70">
                  {description}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                <Skeleton className="h-2 w-2/3 bg-white/10" />
                <Skeleton className="h-2 w-3/4 bg-white/10" />
                <Skeleton className="h-2 w-1/2 bg-white/10" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </motion.section>
  );
}
