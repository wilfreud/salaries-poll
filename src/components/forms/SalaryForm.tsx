import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Loader2, ShieldCheck } from "lucide-react";

import { createSalaryEntry } from "@/lib/salary-service";
import { supabase } from "@/lib/supabase";
import {
  contractTypes,
  formations,
  participantTypes,
  specialties,
  type SalaryInsert,
} from "@/types/salary";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
  job_title: z
    .string()
    .trim()
    .max(120, {
      message:
        "L’intitulé doit garder une longueur raisonnable (120 caractères max).",
    })
    .optional()
    .refine((value) => !value || value.length === 0 || value.length >= 2, {
      message: "Au moins 2 caractères si tu renseignes le poste.",
    })
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  formation: z.enum(formations),
  speciality: z.enum(specialties),
  contract_type: z.enum(contractTypes),
  salary: z.coerce.number().int().positive().max(1_000_000),
  participant_type: z.enum(participantTypes).default("Alumni"),
});
type FormSchema = typeof formSchema;
type FormValues = z.input<FormSchema>;
type FormOutput = z.output<FormSchema>;

export function SalaryForm() {
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const defaultValues: Partial<FormValues> = {
    job_title: "",
    participant_type: "Alumni",
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const mutation = useMutation<void, Error, SalaryInsert>({
    mutationFn: createSalaryEntry,
    onSuccess: () => {
      setHasSubmitted(true);
      // Reset the form to the explicit default values so selects return to defaults
      form.reset({
        ...defaultValues,
      });
    },
  });

  const onSubmit = (values: FormValues) => {
    setHasSubmitted(false);
    const parsed = formSchema.parse(values) as FormOutput;
    const payload: SalaryInsert = {
      ...parsed,
      job_title: parsed.job_title ?? null,
    };
    mutation.mutate(payload);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      <Card className="border-white/20 bg-white/10 text-foreground backdrop-blur-xl">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="border-white/40 bg-white/20 text-xs uppercase tracking-[0.3em] text-white"
            >
              Anonyme
            </Badge>
            <Badge
              variant="outline"
              className="border-white/10 bg-white/10 text-xs text-white/80"
            >
              ⏱️ 60s max
            </Badge>
          </div>
          <CardTitle className="text-2xl font-semibold text-white">
            Partage ton salaire en toute confiance
          </CardTitle>
          <CardDescription className="text-sm text-white/70">
            Toutes les réponses sont anonymes et agrégées. Aucune donnée
            personnelle n’est collectée.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <Form {...form}>
            <form
              className="grid gap-6"
              onSubmit={form.handleSubmit(onSubmit)}
              noValidate
            >
              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="formation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Formation</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="border-white/20 bg-black/40 text-sm text-white">
                            <SelectValue placeholder="Sélectionne ta formation" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="border border-white/10 bg-black/90 text-sm text-white">
                          {formations.map((item) => (
                            <SelectItem key={item} value={item}>
                              {item}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="speciality"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Spécialité</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="border-white/20 bg-black/40 text-sm text-white">
                            <SelectValue placeholder="Choisis ta spécialité" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="border border-white/10 bg-black/90 text-sm text-white">
                          {specialties.map((item) => (
                            <SelectItem key={item} value={item}>
                              {item}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contract_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nature du contrat</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="border-white/20 bg-black/40 text-sm text-white">
                            <SelectValue placeholder="Sélectionne le contrat" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="border border-white/10 bg-black/90 text-sm text-white">
                          {contractTypes.map((item) => (
                            <SelectItem key={item} value={item}>
                              {item}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="participant_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Profil</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="border-white/20 bg-black/40 text-sm text-white">
                            <SelectValue placeholder="Alumni ou Étudiant ?" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="border border-white/10 bg-black/90 text-sm text-white">
                          {participantTypes.map((item) => (
                            <SelectItem key={item} value={item}>
                              {item}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="job_title"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Intitulé du poste (optionnel)</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Ex : Ingénieur sécurité applicative"
                          className="border-white/20 bg-black/40 text-white placeholder:text-white/40"
                          value={field.value ?? ""}
                          onChange={(event) =>
                            field.onChange(event.target.value)
                          }
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormDescription>
                        Aide les autres promos à comparer les salaires par
                        poste. Laisse vide si tu préfères ne pas préciser.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="salary"
                render={({ field }) => {
                  const displayValue =
                    typeof field.value === "number" ||
                    typeof field.value === "string"
                      ? field.value
                      : "";

                  return (
                    <FormItem>
                      <FormLabel>Revenu net mensuel (XOF)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          inputMode="numeric"
                          placeholder="Ex: 250000"
                          className="border-white/20 bg-black/40 text-white placeholder:text-white/40"
                          value={displayValue}
                          onChange={(event) =>
                            field.onChange(Number(event.target.value))
                          }
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormDescription>
                        Merci d&rsquo;indiquer ton salaire net mensuel en francs
                        CFA (XOF).
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-white/80">
                <div className="flex items-center gap-2 text-white/70">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Anonymat renforcé</span>
                </div>
                <p>
                  Aucune information personnelle n’est stockée. Les données sont
                  agrégées pour les statistiques et ne peuvent pas être reliées
                  à une personne.
                </p>
              </div>

              <Button
                type="submit"
                disabled={mutation.isPending || !supabase}
                className="group inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/80 px-6 py-3 text-sm font-medium text-black transition hover:bg-white"
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Envoi en cours…
                  </>
                ) : (
                  "Partager mon salaire"
                )}
              </Button>

              {!supabase && (
                <p className="text-sm text-yellow-200/80">
                  Configure les variables d’environnement Supabase pour activer
                  la collecte (voir README).
                </p>
              )}

              {mutation.isError && (
                <p className="text-sm text-red-400">
                  Une erreur est survenue. Vérifie ta connexion et réessaie. (
                  {(mutation.error as Error)?.message})
                </p>
              )}

              {hasSubmitted && !mutation.isPending && !mutation.isError && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-white/15 bg-emerald-500/20 p-4 text-sm text-emerald-100"
                >
                  Merci pour ta contribution ✨ Les statistiques sont mises à
                  jour en direct.
                </motion.div>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
