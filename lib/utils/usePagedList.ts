import { useEffect, useMemo, useState } from "react";

/**
 * Windows a fully client-filtered list for "Load More" paging: shows the
 * first `pageSize` items and grows by `pageSize` per click. The visible
 * window resets to the first page whenever the filtered list changes
 * identity (any search/filter/sort edit or data change), so the controls
 * always start from the top matches.
 *
 * Callers pass a memoized array (their filtered/sorted useMemo), keeping
 * search/filter/sort working over the full dataset while bounding the DOM.
 */
export function usePagedList<T>(items: T[], pageSize: number) {
  const [visibleCount, setVisibleCount] = useState(pageSize);

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [items, pageSize]);

  const visible = useMemo(
    () => items.slice(0, visibleCount),
    [items, visibleCount],
  );

  return {
    visible,
    visibleCount,
    total: items.length,
    hasMore: visibleCount < items.length,
    loadMore: () =>
      setVisibleCount((count) => Math.min(count + pageSize, items.length)),
  };
}
