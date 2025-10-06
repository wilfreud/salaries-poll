import { motion } from "framer-motion";
import { Github, Heart } from "lucide-react";

export function SiteFooter() {
  return (
    <motion.footer
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
      className="mt-auto w-full border-t border-white/5 bg-black/40 px-4 py-8 backdrop-blur-md"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-4 text-center text-xs text-muted-foreground sm:flex-row sm:text-left">
        <p className="max-w-xl leading-relaxed">
          Codé avec vibes, café et amour ☕✨ – C’est vibe codé.
        </p>
        <div className="flex items-center gap-3 text-muted-foreground/80">
          <span className="flex items-center gap-1">
            <Heart className="h-3.5 w-3.5" />
            <span>Projet open ✦ anonymat garanti</span>
          </span>
          <span className="hidden h-5 w-px bg-white/20 sm:block" />
          <a
            href="https://github.com/wilfreud/salaries-poll"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1 text-muted-foreground transition hover:border-white/30 hover:text-white"
          >
            <Github className="h-3.5 w-3.5" />
            <span>Contribuer</span>
          </a>
        </div>
      </div>
    </motion.footer>
  );
}
