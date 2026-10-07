import { PenLine } from "lucide-react";
import {
  SecondaryPage,
  PAGE_H1,
  PAGE_LEAD,
} from "../../components/site/SecondaryPage";
import { EmptyState } from "../../components/ui/EmptyState";
import { Reveal } from "../../components/site/Reveal";

export default function BlogPage() {
  return (
    <SecondaryPage>
      <Reveal>
        <h1 className={PAGE_H1}>Blog</h1>
        <p className={PAGE_LEAD}>
          Notes on learning, focus and craft from the ATLAS team.
        </p>
      </Reveal>
      <div className="mt-8">
        <EmptyState
          icon={PenLine}
          eyebrow="Coming soon"
          title="No posts yet"
          description="Notes on learning, focus and craft will live here. The first posts are on the way."
        />
      </div>
    </SecondaryPage>
  );
}
