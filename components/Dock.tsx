"use client";

import { useState, type ReactNode } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import { links } from "@/data/site";

const items = [
  { label: "GitHub", href: links.github, icon: <GitHubIcon /> },
  { label: "LinkedIn", href: links.linkedin, icon: <LinkedInIcon /> },
];

export default function Dock() {
  const mouseX = useMotionValue(Infinity);

  return (
    <motion.nav
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 24, delay: 0.2 }}
      onMouseMove={(e) => mouseX.set(e.clientX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-end gap-2 rounded-full border border-black/5 bg-white/70 p-2 shadow-lg shadow-black/5 backdrop-blur-md"
    >
      {items.map((item) => (
        <DockItem key={item.label} mouseX={mouseX} {...item} />
      ))}
    </motion.nav>
  );
}

function DockItem({
  mouseX,
  label,
  href,
  icon,
}: {
  mouseX: MotionValue<number>;
  label: string;
  href: string;
  icon: ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  const [el, setEl] = useState<HTMLAnchorElement | null>(null);

  // Grow icons based on cursor distance, like the macOS dock.
  const distance = useTransform(mouseX, (x) => {
    const rect = el?.getBoundingClientRect();
    return rect ? x - rect.left - rect.width / 2 : Infinity;
  });
  const size = useSpring(useTransform(distance, [-120, 0, 120], [40, 52, 40]), {
    stiffness: 300,
    damping: 22,
  });

  return (
    <motion.a
      ref={setEl}
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      style={{ width: size, height: size }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative flex items-center justify-center rounded-full bg-neutral-100 text-neutral-700 transition-colors hover:bg-neutral-200 hover:text-neutral-900"
    >
      <AnimatePresence>
        {hovered && (
          <motion.span
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="pointer-events-none absolute -top-9 whitespace-nowrap rounded-md bg-neutral-900 px-2 py-1 text-xs text-white"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
      <span className="size-[45%]">{icon}</span>
    </motion.a>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-full" aria-hidden>
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-full" aria-hidden>
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
    </svg>
  );
}
