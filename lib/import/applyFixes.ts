import type { ImportIssue } from "./errorFlagging";
import {
  formatFieldPath,
  parseFieldPath,
  type PathSegment,
} from "@/lib/utils/dataPath";

/**
 * Applies the "Fix" resolutions chosen in the import review dialog onto the
 * extracted data, producing a corrected copy. Every issue path refers to a
 * position in the ORIGINAL partial — so removals can't be applied one splice
 * at a time (removing sections[0] would shift every later index). Instead
 * all edits are collected first, then a single rebuild pass writes sets and
 * drops removed elements/keys while walking the original structure, keeping
 * every index valid. Pure: the input is never mutated.
 */
export function applyIssueFixes<T>(
  data: T,
  issues: readonly ImportIssue[],
  fixedIds: readonly string[],
): T {
  const fixed = new Set(fixedIds);

  const sets = new Map<string, string>();
  /** Container path → indices to drop from that array. */
  const elementRemovals = new Map<string, Set<number>>();
  /** Object path → keys to delete from that object. */
  const keyRemovals = new Map<string, Set<string>>();

  for (const issue of issues) {
    if (!fixed.has(issue.id) || !issue.fix) continue;
    const segments = parseFieldPath(issue.field);
    if (segments.length === 0) continue;

    if (issue.fix.action === "set") {
      sets.set(issue.field, issue.fix.value);
      continue;
    }

    const parentPath = formatFieldPath(segments.slice(0, -1));
    const last = segments[segments.length - 1];
    if ("index" in last) {
      const indices = elementRemovals.get(parentPath) ?? new Set<number>();
      indices.add(last.index);
      elementRemovals.set(parentPath, indices);
    } else {
      const keys = keyRemovals.get(parentPath) ?? new Set<string>();
      keys.add(last.key);
      keyRemovals.set(parentPath, keys);
    }
  }

  if (sets.size === 0 && elementRemovals.size === 0 && keyRemovals.size === 0) {
    return data;
  }

  return rebuild(data, [], { sets, elementRemovals, keyRemovals }) as T;
}

interface FixPlan {
  sets: Map<string, string>;
  elementRemovals: Map<string, Set<number>>;
  keyRemovals: Map<string, Set<string>>;
}

function rebuild(
  node: unknown,
  segments: readonly PathSegment[],
  plan: FixPlan,
): unknown {
  const path = formatFieldPath(segments);

  if (Array.isArray(node)) {
    const removals = plan.elementRemovals.get(path);
    const rebuilt = node.map((item, index) =>
      rebuild(item, [...segments, { index }], plan),
    );
    return removals
      ? rebuilt.filter((_, index) => !removals.has(index))
      : rebuilt;
  }

  if (isPlainObject(node)) {
    // Keys marked for deletion on this object, plus any key that a "set"
    // targets below this object but that doesn't exist yet (e.g. a fix for
    // an optional field the extraction never emitted).
    const removedKeys = plan.keyRemovals.get(path);
    const keys = new Set<string>(Object.keys(node));
    if (removedKeys) {
      for (const key of removedKeys) keys.delete(key);
    }
    for (const setPath of plan.sets.keys()) {
      const remainder = childKeyOf(setPath, path);
      if (remainder !== null && !removedKeys?.has(remainder)) {
        keys.add(remainder);
      }
    }

    const result: Record<string, unknown> = {};
    for (const key of keys) {
      const childSegments = [...segments, { key }];
      const childPath = formatFieldPath(childSegments);
      if (plan.sets.has(childPath)) {
        result[key] = plan.sets.get(childPath);
      } else if (key in node) {
        result[key] = rebuild(node[key], childSegments, plan);
      }
    }
    return result;
  }

  return node;
}

/**
 * If `setPath` names a direct child key of `parentPath` (e.g. "sections[0]"
 * under "" or "title" under "sections[0]"), returns that key's name;
 * otherwise null. Index children never come from sets — detectors only set
 * scalar keys — so only key segments count.
 */
function childKeyOf(setPath: string, parentPath: string): string | null {
  if (parentPath === "") {
    const segments = parseFieldPath(setPath);
    return segments.length > 0 && "key" in segments[0] ? segments[0].key : null;
  }
  const prefix = `${parentPath}.`;
  if (!setPath.startsWith(prefix)) return null;
  const remainder = setPath.slice(prefix.length);
  return /^[^.[]+$/.test(remainder) ? remainder : null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
