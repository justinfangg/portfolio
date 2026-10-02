"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { motion, useAnimationControls } from "motion/react";
import { collage, type CollageItem } from "@/data/site";

const tones = {
  white: "bg-white text-neutral-800",
  blue: "bg-[#5b74c4] text-white",
  pink: "bg-[#f3a6d8] text-[#7a2160]",
  yellow: "bg-[#fde9a9] text-[#6b4b00]",
};

const placeholderTones = ["bg-[#e8e4dc]", "bg-[#dfe6ec]", "bg-[#ece0e4]", "bg-[#e2e8dd]"];

export default function Collage() {
  const containerRef = useRef<HTMLDivElement>(null);
  // Shared counter so whichever item you grab jumps to the top of the pile.
  const topZRef = useRef(collage.length);

  return (
    <section aria-label="Collage" className="mx-auto w-full max-w-6xl px-4">
      {/*
        All sizes use container query units (cqw = 1% of the collage width), so the
        whole composition scales with the screen. On phones --s enlarges the items
        and the area gets taller so they stay legible.
      */}
      <div
        ref={containerRef}
        className="@container relative isolate aspect-square w-full select-none [--s:1.7] sm:aspect-[5/2] sm:[--s:1]"
      >
        {collage.map((item, i) => (
          <Piece key={i} item={item} index={i} containerRef={containerRef} topZRef={topZRef} />
        ))}
      </div>
    </section>
  );
}

function Piece({
  item,
  index,
  containerRef,
  topZRef,
}: {
  item: CollageItem;
  index: number;
  containerRef: RefObject<HTMLDivElement | null>;
  topZRef: RefObject<number>;
}) {
  const controls = useAnimationControls();
  const [z, setZ] = useState(index + 1);
  const rotate = item.rotate ?? 0;
  const aspect = item.aspect ?? 1;
  const width = `calc(var(--s) * ${item.w}cqw)`;
  const height = `calc(var(--s) * ${item.w / aspect}cqw)`;

  // Pop in one after another on load.
  useEffect(() => {
    controls.start({
      opacity: 1,
      scale: 1,
      transition: { type: "spring", stiffness: 260, damping: 20, delay: 0.3 + index * 0.04 },
    });
  }, [controls, index]);

  const wiggle = () =>
    controls.start({
      scale: [1, 1.12, 0.97, 1],
      rotate: [rotate, rotate - 7, rotate + 4, rotate],
      transition: { duration: 0.5, ease: "easeInOut" },
    });

  const style: CSSProperties = {
    zIndex: z,
    width,
    height,
    // Keep items inside the collage area when they're enlarged on small screens.
    left: `min(${item.x}%, 100% - ${width})`,
    top: `min(${item.y}%, 100% - ${height})`,
  };

  return (
    <motion.div
      data-sound
      role="button"
      tabIndex={0}
      aria-label={item.alt ?? item.text ?? "Collage item"}
      className="absolute cursor-grab touch-none outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 active:cursor-grabbing"
      style={style}
      initial={{ opacity: 0, scale: 0.6, rotate }}
      animate={controls}
      // Drag lift is driven through the same controls as the entrance and
      // wiggle; mixing in whileHover/whileDrag made pieces snap back to their
      // initial (shrunken) scale afterwards.
      onDragStart={() => controls.start({ scale: 1.06, transition: { duration: 0.15 } })}
      onDragEnd={() => controls.start({ scale: 1, transition: { type: "spring", stiffness: 300, damping: 20 } })}
      drag
      dragConstraints={containerRef}
      dragElastic={0.15}
      dragMomentum={false}
      onPointerDown={() => setZ(++topZRef.current)}
      onTap={wiggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          wiggle();
        }
      }}
    >
      <Content item={item} index={index} />
    </motion.div>
  );
}

function Content({ item, index }: { item: CollageItem; index: number }) {
  const shadow = "shadow-[0_6px_20px_-6px_rgba(0,0,0,0.25)]";

  switch (item.kind) {
    case "photo":
      return (
        <div className={`size-full bg-white p-[5%] pb-[16%] ${shadow}`}>
          <Picture item={item} index={index} />
        </div>
      );
    case "plain":
      return (
        <div className={`size-full overflow-hidden rounded-[6%] ${shadow}`}>
          <Picture item={item} index={index} />
        </div>
      );
    case "circle":
      return (
        <div className={`size-full overflow-hidden rounded-full border-[0.4cqw] border-white ${shadow}`}>
          <Picture item={item} index={index} />
        </div>
      );
    case "note":
      return (
        <div
          className={`flex size-full items-center rounded-[calc(var(--s)*1cqw)] p-[calc(var(--s)*1.2cqw)] leading-snug ${tones[item.tone ?? "white"]} ${shadow}`}
          style={{ fontSize: `calc(var(--s) * 1.25cqw)` }}
        >
          {item.text}
        </div>
      );
    case "sticker":
      return (
        <div
          className={`flex size-full items-center justify-center rounded-[24%] ${tones[item.tone ?? "white"]} ${shadow}`}
          style={{ fontSize: `calc(var(--s) * ${item.w * 0.45}cqw / ${Math.max(1, [...(item.emoji ?? "")].length * 0.6)})` }}
        >
          {item.emoji}
        </div>
      );
  }
}

function Picture({ item, index }: { item: CollageItem; index: number }) {
  if (item.src) {
    return (
      <div className="relative size-full overflow-hidden">
        <Image
          src={item.src}
          alt={item.alt ?? ""}
          fill
          draggable={false}
          sizes="(min-width: 640px) 25vw, 60vw"
          className="pointer-events-none object-cover"
        />
      </div>
    );
  }
  return (
    <div
      className={`flex size-full items-center justify-center text-center text-neutral-400 ${placeholderTones[index % placeholderTones.length]}`}
      style={{ fontSize: `calc(var(--s) * 1cqw)` }}
    >
      {item.alt}
    </div>
  );
}
