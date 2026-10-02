import Bio from "@/components/Bio";
import Collage from "@/components/Collage";
import Dock from "@/components/Dock";
import PlayBall from "@/components/PlayBall";
import UISounds from "@/components/UISounds";

export default function Home() {
  return (
    <>
      <main className="space-y-12 pt-24 pb-40">
        <div className="mx-auto w-full max-w-xl px-6">
          <Bio />
        </div>
        <Collage />
      </main>
      <PlayBall />
      <Dock />
      <UISounds />
    </>
  );
}
