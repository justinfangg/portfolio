import Bio from "@/components/Bio";
import Dock from "@/components/Dock";
import PlayBall from "@/components/PlayBall";
import UISounds from "@/components/UISounds";

export default function Home() {
  return (
    <>
      <main className="mx-auto w-full max-w-xl px-6 pt-24 pb-40">
        <Bio />
      </main>
      <PlayBall />
      <Dock />
      <UISounds />
    </>
  );
}
