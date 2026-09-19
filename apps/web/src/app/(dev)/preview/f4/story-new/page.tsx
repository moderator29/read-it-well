import { PageHeader } from "@/components/app/PageHeader";
import { StoryComposer } from "@/components/social/story/StoryComposer";
import { AREA_OPTIONS } from "../fixtures";
import { PERSON } from "../../_fixtures/people";

/**
 * Writing a story, from fixtures: the real composer under the real page
 * header, as `/stories/new` composes it for somebody who has joined a place.
 */
export default function StoryComposerPreview() {
  return (
    <div className="nf-shell mx-auto w-full max-w-2xl pb-4xl pt-md">
      <PageHeader
        title="Write a story"
        subtitle="A picture, a headline, and a line or two. It stays up."
        fallback="/around"
      />
      <StoryComposer
        areas={AREA_OPTIONS.map((area) => ({ id: area.id, name: area.name, city: area.city }))}
        userId={PERSON.id}
        signedIn
      />
    </div>
  );
}
