import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { BarChart3, Send } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/submit", label: "Contribuer", icon: Send },
  { to: "/stats", label: "Statistiques", icon: BarChart3 },
];

export function AppHeader() {
  const location = useLocation();

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="sticky top-6 z-30 mx-auto w-full max-w-6xl px-4 sm:px-6"
    >
      <div className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-glass shadow-glass ring-1 ring-black/10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
              Promo Salaries
            </p>
            <h1 className="text-2xl font-semibold text-white sm:text-3xl">
              Baromètre des salaires · Ingénieurs
            </h1>
          </div>
          <p className="max-w-sm text-sm text-muted-foreground">
            Contribuez anonymement et découvrez les tendances de rémunération
            des promotions sortantes.
          </p>
        </div>
        <nav className="flex items-center gap-2 text-sm font-medium">
          {navItems.map(({ to, label, icon: Icon }) => {
            const isActive = location.pathname.startsWith(to);
            return (
              <NavLink
                key={to}
                to={to}
                className={({ isActive: navActive }) =>
                  cn(
                    "group flex flex-1 items-center justify-center gap-2 rounded-2xl border border-transparent px-4 py-2 transition-all duration-200 ease-out sm:flex-none sm:px-5",
                    "bg-white/5 text-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] hover:border-white/20 hover:bg-white/10 hover:text-white",
                    (navActive || isActive) &&
                      "border-white/30 bg-white/15 text-white shadow-[0_10px_40px_-12px_rgba(255,255,255,0.45)]"
                  )
                }
              >
                <Icon className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
                <span>{label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>
    </motion.header>
  );
}
