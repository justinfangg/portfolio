// Tiny synthesized UI sounds via the Web Audio API — no audio files needed.
// Each sound is a short burst of filtered noise (the "tick") layered with a
// quick sine blip (the "tink"). Browsers keep audio locked until the first user
// gesture (click, tap or key), so hover sounds start after that first interaction.

// Anything matching this selector plays sounds on hover and press.
export const SOUND_TARGETS = "a, button, [data-sound]";

type Tick = {
  volume: number;
  noiseLength: number; // seconds
  noiseDecay: number; // seconds
  noiseFreq: number; // bandpass center, Hz
  noiseQ: number;
  noiseGain: number;
  toneFreq: number; // Hz
  toneGain: number;
  toneLength: number; // seconds
};

const HOVER: Tick = {
  volume: 0.38,
  noiseLength: 0.014,
  noiseDecay: 0.0016,
  noiseFreq: 5400,
  noiseQ: 1.8,
  noiseGain: 0.14,
  toneFreq: 2600,
  toneGain: 0.018,
  toneLength: 0.012,
};

const CLICK: Tick = {
  volume: 0.42,
  noiseLength: 0.022,
  noiseDecay: 0.0022,
  noiseFreq: 4800,
  noiseQ: 1.4,
  noiseGain: 0.18,
  toneFreq: 1900,
  toneGain: 0.045,
  toneLength: 0.025,
};

let ctx: AudioContext | null = null;

function getContext() {
  if (typeof window === "undefined") return null;
  ctx ??= new AudioContext();
  return ctx;
}

function play(ac: AudioContext, s: Tick) {
  const t = ac.currentTime;
  const out = ac.createGain();
  out.gain.value = s.volume;
  out.connect(ac.destination);

  // Noise burst with an exponential decay, shaped by a bandpass filter.
  const length = Math.floor(s.noiseLength * ac.sampleRate);
  const buffer = ac.createBuffer(1, length, ac.sampleRate);
  const data = buffer.getChannelData(0);
  const decay = s.noiseDecay * ac.sampleRate;
  for (let i = 0; i < length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / decay);
  }
  const noise = ac.createBufferSource();
  noise.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = s.noiseFreq;
  filter.Q.value = s.noiseQ;
  const noiseGain = ac.createGain();
  noiseGain.gain.setValueAtTime(s.noiseGain, t);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + s.noiseLength + 0.004);
  noise.connect(filter).connect(noiseGain).connect(out);
  noise.start(t);
  noise.stop(t + s.noiseLength + 0.006);

  // Short sine blip on top.
  const tone = ac.createOscillator();
  tone.type = "sine";
  tone.frequency.value = s.toneFreq;
  const toneGain = ac.createGain();
  toneGain.gain.setValueAtTime(0.0001, t);
  toneGain.gain.exponentialRampToValueAtTime(s.toneGain, t + 0.001);
  toneGain.gain.exponentialRampToValueAtTime(0.0001, t + s.toneLength);
  tone.connect(toneGain).connect(out);
  tone.start(t);
  tone.stop(t + s.toneLength + 0.005);
}

export function playHover() {
  const ac = getContext();
  if (ac?.state === "running") play(ac, HOVER);
}

export function playClick() {
  const ac = getContext();
  if (!ac) return;
  if (ac.state === "running") play(ac, CLICK);
  else ac.resume().then(() => play(ac, CLICK)).catch(() => {});
  navigator.vibrate?.(8);
}

// Two soft rising notes for a basket.
export function playScore() {
  const ac = getContext();
  if (ac?.state !== "running") return;
  const t = ac.currentTime;
  [1046.5, 1568].forEach((freq, i) => {
    const start = t + i * 0.07;
    const tone = ac.createOscillator();
    tone.type = "sine";
    tone.frequency.value = freq;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.05, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.25);
    tone.connect(gain).connect(ac.destination);
    tone.start(start);
    tone.stop(start + 0.26);
  });
}

// Attaches delegated listeners so every link, button and [data-sound] element
// gets sounds without wiring each one up. Returns a cleanup function.
export function installSounds() {
  let hovered: Element | null = null;
  let lastHover = 0;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

  const unlock = () => {
    getContext()?.resume().catch(() => {});
    window.removeEventListener("pointerdown", unlock, true);
    window.removeEventListener("keydown", unlock, true);
  };

  const onOver = (e: PointerEvent) => {
    if (!finePointer.matches || e.pointerType !== "mouse") return;
    const target = (e.target as Element | null)?.closest(SOUND_TARGETS);
    if (!target || target === hovered) return;
    hovered = target;
    // Skip the sound when sweeping across several targets quickly.
    const now = performance.now();
    const tooSoon = now - lastHover < 90;
    lastHover = now;
    if (!tooSoon) playHover();
  };

  const onOut = (e: PointerEvent) => {
    if ((e.target as Element | null)?.closest(SOUND_TARGETS) === hovered) hovered = null;
  };

  const onDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    if ((e.target as Element | null)?.closest(SOUND_TARGETS)) playClick();
  };

  window.addEventListener("pointerdown", unlock, true);
  window.addEventListener("keydown", unlock, true);
  document.addEventListener("pointerover", onOver);
  document.addEventListener("pointerout", onOut);
  document.addEventListener("pointerdown", onDown);

  return () => {
    window.removeEventListener("pointerdown", unlock, true);
    window.removeEventListener("keydown", unlock, true);
    document.removeEventListener("pointerover", onOver);
    document.removeEventListener("pointerout", onOut);
    document.removeEventListener("pointerdown", onDown);
  };
}
