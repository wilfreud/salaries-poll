import { memo } from "react";
import { motion } from "framer-motion";

const blobs = [
  {
    className:
      "bg-gradient-to-br from-white/10 via-white/5 to-transparent blur-3xl",
    style: { width: 420, height: 420, top: "-12%", left: "-10%" },
    duration: 34,
  },
  {
    className:
      "bg-gradient-to-br from-white/12 via-transparent to-transparent blur-3xl",
    style: { width: 520, height: 520, top: "25%", right: "-18%" },
    duration: 28,
  },
  {
    className:
      "bg-gradient-to-br from-white/8 via-transparent to-transparent blur-3xl",
    style: { width: 360, height: 360, bottom: "-14%", left: "30%" },
    duration: 40,
  },
];

export const BackgroundBlobs = memo(function BackgroundBlobs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_60%)]" />
      {blobs.map((blob, index) => (
        <motion.span
          key={index}
          className={`absolute rounded-full ${blob.className}`}
          style={blob.style}
          animate={{
            x: [0, 20, -25, 10, 0],
            y: [0, -30, 20, -15, 0],
            rotate: [0, 12, -8, 4, 0],
          }}
          transition={{
            duration: blob.duration,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black via-black/60 to-transparent" />
    </div>
  );
});
