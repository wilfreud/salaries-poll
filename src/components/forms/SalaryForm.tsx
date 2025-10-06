import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { HelpCircle, Loader2, ShieldCheck } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  job_description: z
    .string()
    .trim()
    .max(600, {
      message: "600 caractères maximum pour la description.",
    })
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  formation: z.enum(formations),
  speciality: z.enum(specialties),
  contract_type: z.enum(contractTypes),
  salary: z.coerce
    .number()
    .int("Merci d’indiquer un montant entier.")
    .positive("Le salaire doit être positif."),
  participant_type: z.enum(participantTypes).default("Alumni"),
  years_since_graduation: z
    .union([
      z.literal(""),
      z.coerce
        .number()
        .int("Merci d’indiquer un nombre entier.")
        .min(0, "Minimum 0 (à la sortie d’école).")
        .max(50, "Maximum 50 ans après la diplomation."),
    ])
    .transform((value) => (value === "" ? undefined : value)),
});
type FormSchema = typeof formSchema;
type FormValues = z.input<FormSchema>;
type FormOutput = z.output<FormSchema>;

export function SalaryForm() {
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showYearsHelp, setShowYearsHelp] = useState(false);

  const defaultValues: Partial<FormValues> = {
    job_title: "",
    job_description: "",
    salary: "",
    participant_type: "Alumni",
    years_since_graduation: "",
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const participantType = form.watch("participant_type");

  useEffect(() => {
    if (participantType !== "Alumni") {
      setShowYearsHelp(false);
      form.setValue("years_since_graduation", "");
    }
  }, [participantType, form]);

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
      job_description: parsed.job_description ?? null,
      years_since_graduation: parsed.years_since_graduation ?? null,
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

                <FormField
                  control={form.control}
                  name="job_description"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Description du travail (optionnel)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Partage le périmètre, les missions clés, les technos…"
                          className="border-white/15 bg-black/30 text-sm text-white placeholder:text-white/40"
                          value={field.value ?? ""}
                          onChange={(event) =>
                            field.onChange(event.target.value)
                          }
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                          maxLength={600}
                        />
                      </FormControl>
                      <FormDescription>
                        Quelques phrases pour donner du contexte (600 caractères
                        max).
                      </FormDescription>
                      <div className="text-right text-xs text-white/40">
                        {field.value?.length ?? 0}/600
                      </div>
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
                    typeof field.value === "string"
                      ? field.value
                      : typeof field.value === "number"
                      ? field.value.toString()
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
                          onChange={(event) => {
                            const value = event.target.value;
                            if (/^\d*$/.test(value)) {
                              field.onChange(value);
                            }
                          }}
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

              {participantType === "Alumni" ? (
                <FormField
                  control={form.control}
                  name="years_since_graduation"
                  render={({ field }) => {
                    const value =
                      field.value === undefined || field.value === null
                        ? ""
                        : (field.value as string | number);
                    return (
                      <FormItem>
                        <FormLabel>
                          <span className="flex items-center gap-2">
                            Ancienneté (Alumni + X ans)
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/20 text-white/70 transition hover:border-white/40 hover:text-white"
                                  onClick={() =>
                                    setShowYearsHelp((prev) => !prev)
                                  }
                                  aria-label="En savoir plus sur le champ Alumni + X"
                                  aria-pressed={showYearsHelp}
                                >
                                  <HelpCircle className="h-3.5 w-3.5" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs text-left text-xs">
                                Indique depuis combien d’années tu es sorti·e de
                                l’école. « Alumni +0 » correspond à un « bébé
                                alumni » (tout juste diplômé·e).
                              </TooltipContent>
                            </Tooltip>
                          </span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={50}
                            placeholder="Ex: 3"
                            className="border-white/20 bg-black/40 text-white placeholder:text-white/40"
                            value={value}
                            onChange={(event) =>
                              field.onChange(event.target.value)
                            }
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                          />
                        </FormControl>
                        <FormDescription>
                          Exemple: Alumni +3 pour un salaire 3 ans après la
                          diplomation. Alumni +0 = « bébé alumni ».
                        </FormDescription>
                        <FormMessage />
                        {showYearsHelp ? (
                          <div className="mt-2 rounded-xl border border-white/15 bg-black/50 p-3 text-xs text-white/70">
                            Ce champ permet d’indiquer depuis combien d’années
                            tu es diplômé·e. Exemple&nbsp;: saisis
                            «&nbsp;3&nbsp;» pour un salaire trois ans après ta
                            sortie.
                          </div>
                        ) : null}
                      </FormItem>
                    );
                  }}
                />
              ) : null}

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
