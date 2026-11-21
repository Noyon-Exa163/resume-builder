"use client";

import { Button } from "@/components/ui";
import "./LoadMoreFooter.css";

export interface LoadMoreFooterProps {
  /** How many items are currently shown. */
  visible: number;
  /** Total items in the filtered dataset. */
  total: number;
  /** The page size the list was seeded with — distinguishes "expanded the
   *  list" from "it all fit on one page". */
  pageSize: number;
  /** Plural noun for the "Showing X of Y" line and the button's label. */
  itemLabel: string;
  onLoadMore: () => void;
}

/**
 * "Load More" pager footer for client-paged lists (see usePagedList):
 * count + button while items remain, then a quiet "No more …" line once the
 * person has expanded the list to the end. A list that fits one page from
 * the start stays footer-free.
 */
export function LoadMoreFooter({
  visible,
  total,
  pageSize,
  itemLabel,
  onLoadMore,
}: LoadMoreFooterProps) {
  if (visible < total) {
    return (
      <div className="load-more">
        <p className="load-more__count" aria-live="polite">
          {`Showing ${visible} of ${total} ${itemLabel}`}
        </p>
        <Button
          type="button"
          variant="secondary"
          size="m"
          aria-label={`Load More ${itemLabel}`}
          onClick={onLoadMore}
        >
          Load More
        </Button>
      </div>
    );
  }

  if (visible > pageSize) {
    return (
      <div className="load-more">
        <p className="load-more__count">No more {itemLabel}.</p>
      </div>
    );
  }

  return null;
}

export default LoadMoreFooter;
