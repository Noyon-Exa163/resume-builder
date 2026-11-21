import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { usePagedList } from "@/lib/utils/usePagedList";

describe("usePagedList", () => {
  const items = Array.from({ length: 25 }, (_, i) => i);

  it("shows only the first page", () => {
    const { result } = renderHook(() => usePagedList(items, 9));
    expect(result.current.visible).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(result.current.visibleCount).toBe(9);
    expect(result.current.total).toBe(25);
    expect(result.current.hasMore).toBe(true);
  });

  it("loadMore grows the window and clamps at the total", () => {
    const { result } = renderHook(() => usePagedList(items, 9));
    act(() => result.current.loadMore());
    expect(result.current.visibleCount).toBe(18);
    act(() => result.current.loadMore());
    expect(result.current.visibleCount).toBe(25);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.visible).toEqual(items);
  });

  it("shows everything without a footer state when under one page", () => {
    const { result } = renderHook(() => usePagedList([1, 2], 9));
    expect(result.current.visible).toEqual([1, 2]);
    expect(result.current.hasMore).toBe(false);
  });

  it("resets to the first page when the items identity changes", () => {
    const initial = [...items];
    const { result, rerender } = renderHook(
      ({ list }) => usePagedList(list, 9),
      { initialProps: { list: initial } },
    );
    act(() => result.current.loadMore());
    expect(result.current.visibleCount).toBe(18);

    // A new array (search/filter/sort re-ran) restarts paging.
    rerender({ list: [...items].reverse() });
    expect(result.current.visibleCount).toBe(9);
    expect(result.current.visible.length).toBe(9);
  });
});
