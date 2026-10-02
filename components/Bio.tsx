import { links, site } from "@/data/site";
import TextLink from "./TextLink";

export default function Bio() {
  return (
    <section className="space-y-6">
      <header>
        <h1 className="font-medium text-neutral-900">{site.name}</h1>
        <p className="text-neutral-500">{site.tagline}</p>
      </header>

      <div className="space-y-4 text-neutral-600 leading-relaxed">
        {site.bio.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        <p>
          Find me on{" "}
          <TextLink href={links.github} target="_blank" rel="noreferrer">
            GitHub
          </TextLink>{" "}
          and{" "}
          <TextLink href={links.linkedin} target="_blank" rel="noreferrer">
            LinkedIn
          </TextLink>
          .
        </p>
      </div>
    </section>
  );
}
