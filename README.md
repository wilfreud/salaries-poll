# Promo Salaries · React + Vite + Supabase

Application web responsive pour collecter et analyser anonymement les salaires des promotions sortantes d’ingénieurs. L’interface est minimaliste en noir & blanc, animée avec des blobs flottants, et s’appuie sur les composants shadcn/ui.

## ✨ Fonctionnalités principales

- **Page “Contribuer” (/submit)** : formulaire anonyme avec validations (formation, spécialité, type de contrat, intitulé du poste en option, revenu net, profil).
- **Page “Statistiques” (/stats)** : tableaux de bord interactifs (Recharts) avec filtres dynamiques, KPIs, histogrammes, barres et courbes.
- **Skeletons & animations** : transitions douces (Framer Motion) et skeleton loading par carte/graphique.
- **Thème glassmorphique noir & blanc** avec blobs animés en arrière-plan et footer signature « Vibe codé avec amour et tendresse ☕✨. »
- **Pile technique** : React Router 7, React Query 5, Supabase, TailwindCSS 3, shadcn/ui, Recharts, Framer Motion, Zod, React Hook Form.

## 🛠️ Prérequis

- [Node.js 18+](https://nodejs.org/) (recommandé 20+)
- [pnpm 9+](https://pnpm.io/installation)
- [Supabase CLI 1.200+](https://supabase.com/docs/guides/cli) configuré pour ton projet (commande `supabase login` puis `supabase link --project-ref <ton-ref>`)
- Un projet [Supabase](https://supabase.com/) configuré (base de données Postgres + table `salaries`)

## 🚀 Démarrage rapide

```bash
pnpm install
cp .env.example .env.local
# puis renseigner les clés Supabase dans .env.local
pnpm dev
```

L’application est disponible sur [http://localhost:5173](http://localhost:5173).

> 💡 Pour exécuter l’application en **mode production**, lance `pnpm build` puis `pnpm start` (serveur Vite preview).

## 🔐 Configuration Supabase

1. Crée un fichier `.env.local` à partir de `.env.example` et complète :

```
VITE_SUPABASE_URL=ton-url.supabase.co
VITE_SUPABASE_ANON_KEY=ta-clé-anon
```

2. Génère une nouvelle migration à chaque fois que tu modifies le schéma Postgres :

```bash
pnpm db:generate nom-de-ta-migration
```

Le script s’appuie sur `supabase db diff --use-migra` pour créer automatiquement un fichier `supabase/migrations/<timestamp>_nom-de-ta-migration.sql`. Il nécessite que le CLI soit **linké** à ton projet (voir prérequis) et que tu sois authentifié (`supabase login`). Ajoute ensuite le fichier généré au contrôle de version.

3. Applique les migrations sur ton projet Supabase :

   ```bash
   pnpm db:push
   ```

   Ce script utilise `supabase db push` pour envoyer toutes les migrations locales vers la base distante.

   > Alternative manuelle : `pnpm supabase db push`

⚠️ Les politiques incluses autorisent la lecture/écriture publique pour faciliter le prototypage. Durcis la sécurité avant un déploiement réel (auth, quotas, edge functions, etc.).

## 📊 Structure du projet

```
src/
  components/
    forms/SalaryForm.tsx        # Formulaire Supabase + validation
    layout/*                    # Header, footer, arrière-plan animé
    ui/*                        # Composants shadcn/ui générés
  lib/
    env.ts                      # Lecture des variables d’environnement
    supabase.ts                 # Client Supabase
    salary-service.ts           # Requêtes & agrégations
  pages/
    SubmitPage.tsx              # Page formulaire
    StatsPage.tsx               # Dashboards & filtres
  types/salary.ts               # Types partagés et constantes
```

## � Synchroniser la base avec le CLI Supabase

1. **Authentifie-toi** (une seule fois par machine) :

```bash
pnpm supabase login
```

2. **Lie le projet local** à ton espace Supabase (une seule fois ou lorsque tu changes de projet) :

```bash
pnpm supabase link --project-ref <ton-project-ref>
```

3. **Génère une migration** après toute modification de schéma Postgres :

```bash
pnpm db:generate nom-de-migration
```

Utilise `--` pour transmettre des options supplémentaires à `supabase db diff`, par exemple `pnpm db:generate init -- --schema public`.

4. **Applique les migrations** vers la base distante (dev, staging ou prod) :

```bash
pnpm db:push
```

Si Supabase détecte un historique différent, suis les recommandations de la CLI (`supabase migration repair`, `supabase db pull`, etc.) avant de relancer la commande.

5. **Vérifie l’état** si besoin :

```bash
pnpm supabase migration list
```

## 📦 Scripts pnpm

- `pnpm db:generate <nom>` – crée un fichier de migration basé sur les différences de schéma
- `pnpm db:push` – déploie les migrations locales sur Supabase
- `pnpm dev` – serveur de développement (hot reload)
- `pnpm build` – compilation (type-check + build Vite)
- `pnpm start` – sert le build de prod (`vite preview`) sur `0.0.0.0:4173`
- `pnpm preview` – prévisualisation locale (sans exposer toutes les interfaces)
- `pnpm lint` – linting (ESLint)

## 🧪 Qualité & bonnes pratiques

- `pnpm build` doit rester vert (inclut le `tsc -b`).
- Chaque requête Supabase passe par `salary-service` pour centraliser les règles métier.
- Les composants shadcn/ui peuvent être étendus via `pnpm dlx shadcn@latest add <component>`.

## 🗺️ Roadmap / idées suivantes

- Export CSV/Excel et snapshot PDF des graphiques.
- Authentification légère (OTP) côté Supabase pour limiter les doublons.
- Déploiement Vercel + Supabase Edge Functions pour calculer les agrégations côté serveur.

---

Codé avec vibes, café et amour ☕✨ – C’est vibe codé.
