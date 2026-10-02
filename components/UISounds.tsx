"use client";

import { useEffect } from "react";
import { installSounds } from "@/lib/sound";

export default function UISounds() {
  useEffect(() => installSounds(), []);
  return null;
}
