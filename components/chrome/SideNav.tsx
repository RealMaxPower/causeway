import { SideNavList } from "./SideNavList";
import type { TrackLetter } from "@/lib/tracks";

interface SideNavProps {
  /** Currently active node id (e.g. "A3"). Expands its parent track. */
  currentNodeId?: string;
  /** Currently active track letter when there's no specific node selected. */
  currentTrackLetter?: TrackLetter;
}

/** Desktop track-map rail. Hidden below `lg` — the MobileNav drawer covers that range. */
export function SideNav({ currentNodeId, currentTrackLetter }: SideNavProps) {
  return (
    <nav className="hidden lg:block w-72 shrink-0 border-r border-rule px-5 py-6 sticky top-14 self-start max-h-[calc(100vh-3.5rem)] overflow-y-auto">
      <SideNavList
        currentNodeId={currentNodeId}
        currentTrackLetter={currentTrackLetter}
      />
    </nav>
  );
}
