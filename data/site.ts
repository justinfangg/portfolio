// All editable site content lives here.

export const site = {
  name: "Justin Fang",
  title: "Justin Fang",
  description: "Justin Fang's Personal Site.",
  tagline: "Computer Science @ uWaterloo",
  bio: [
    "Hi, I'm Justin. This is placeholder text for a short introduction — who you are, what you're working on, and what you care about.",
    "A second paragraph can cover past work, interests, or what you're looking for next. Keep it to two or three sentences.",
  ],
};

export const links = {
  linkedin: "https://www.linkedin.com/in/your-handle",
  github: "https://github.com/your-handle",
};

// Collage layout. Positions are percentages of the collage area (x from the left,
// y from the top); w is the item's width as a percentage of the collage width.
// Items listed later sit on top. Drag them around in the browser to find a
// layout you like, then copy the numbers here.
export type CollageItem = {
  kind:
    | "photo" // polaroid-style white frame
    | "plain" // borderless image with rounded corners
    | "circle" // round image
    | "note" // text card (quotes, kind messages, tweets…)
    | "sticker"; // emoji / app-icon style tile
  x: number;
  y: number;
  w: number;
  aspect?: number; // width / height, defaults to 1
  rotate?: number; // degrees
  alt?: string;
  // Path under /public, e.g. "/collage/desk.jpg". Leave undefined for a placeholder.
  src?: string;
  text?: string; // for notes
  emoji?: string; // for stickers
  tone?: "white" | "blue" | "pink" | "yellow"; // background for notes, stickers and placeholders
};

export const collage: CollageItem[] = [
  // Top row
  { kind: "note", x: 16, y: 8, w: 14, rotate: -3, tone: "blue", text: "“A favorite quote goes here.”" },
  { kind: "photo", x: 28, y: 2, w: 17, aspect: 0.95, rotate: -6, alt: "Conference" },
  { kind: "sticker", x: 46, y: 0, w: 5, rotate: 0, tone: "white", emoji: "✨" },
  { kind: "photo", x: 49, y: 6, w: 19, aspect: 1.4, rotate: -1, alt: "Travel" },
  { kind: "sticker", x: 65, y: 4, w: 7, rotate: 10, tone: "white", emoji: "📷" },
  // Bottom row
  { kind: "photo", x: 12, y: 36, w: 15, aspect: 0.82, rotate: -4, alt: "Event" },
  { kind: "note", x: 33, y: 46, w: 13, aspect: 0.82, rotate: 4, tone: "pink", text: "A badge, ticket or card" },
  { kind: "circle", x: 42, y: 34, w: 13, alt: "Selfie" },
  { kind: "photo", x: 56, y: 38, w: 15, aspect: 0.95, rotate: -2, alt: "Trip" },
  { kind: "sticker", x: 51, y: 66, w: 6, rotate: -8, tone: "yellow", emoji: "☕" },
  { kind: "note", x: 19, y: 76, w: 18, aspect: 2.4, rotate: -3, tone: "white", text: "A kind message someone sent you — screenshots of DMs or tweets work great here." },
  { kind: "note", x: 63, y: 72, w: 20, aspect: 3, rotate: 4, tone: "white", text: "Another nice note, shoutout or testimonial." },
];
