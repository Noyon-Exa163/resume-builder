"use client";

import { useState } from "react";
import type { ResumeEntry, SectionKind } from "@/lib/schema/resume";
import { EntryForm } from "./EntryForm";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ChevronDown, ChevronUp, Trash2, ListOrdered } from "lucide-react";
import { EmptyState, ConfirmDialog } from "@/components/ui";
import { formatDateRange } from "@/lib/date";
import "./EntryList.css";

export interface EntryListProps {
  entries: ResumeEntry[];
  sectionKind: SectionKind;
  onUpdateEntry: (entryId: string, patch: Partial<ResumeEntry>) => void;
  onRemoveEntry: (entryId: string) => void;
  onReorderEntries: (orderedIds: string[]) => void;
  className?: string;
}

interface SortableEntryItemProps {
  entry: ResumeEntry;
  sectionKind: SectionKind;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (patch: Partial<ResumeEntry>) => void;
  onRemove: () => void;
}

function SortableEntryItem({
  entry,
  sectionKind,
  isExpanded,
  onToggleExpand,
  onUpdate,
  onRemove,
}: SortableEntryItemProps) {
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const displayTitle = entry.title || "Untitled Entry";
  const displaySubtitle = [entry.subtitle, formatDateRange(entry) || null]
    .filter(Boolean)
    .join(" • ");

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        "entry-list__item",
        isDragging && "entry-list__item--dragging",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="entry-list__header">
        <button
          type="button"
          className="entry-list__drag-handle"
          aria-label={`Reorder entry ${displayTitle}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical size={16} />
        </button>

        <div
          className="entry-list__summary"
          onClick={onToggleExpand}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onToggleExpand();
            }
          }}
          aria-expanded={isExpanded}
        >
          <span className="entry-list__title">{displayTitle}</span>
          {displaySubtitle && (
            <span className="entry-list__subtitle">{displaySubtitle}</span>
          )}
        </div>

        <div className="entry-list__actions">
          <button
            type="button"
            className="entry-list__icon-btn"
            onClick={onToggleExpand}
            aria-label={isExpanded ? "Collapse entry" : "Expand entry"}
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <button
            type="button"
            className="entry-list__icon-btn entry-list__icon-btn--danger"
            onClick={() => setConfirmDeleteOpen(true)}
            aria-label={`Delete entry ${displayTitle}`}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="entry-list__body">
          <EntryForm
            value={entry}
            sectionKind={sectionKind}
            onChange={onUpdate}
          />
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title={`Delete "${displayTitle}"?`}
        description="This cannot be undone."
        onConfirm={onRemove}
      />
    </div>
  );
}

export function EntryList({
  entries,
  sectionKind,
  onUpdateEntry,
  onRemoveEntry,
  onReorderEntries,
  className,
}: EntryListProps) {
  // Store set of expanded entry IDs. Default newly added/first entry open.
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(entries.length > 0 ? [entries[0].id] : [])
  );

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = entries.findIndex((e) => e.id === active.id);
    const newIndex = entries.findIndex((e) => e.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(entries, oldIndex, newIndex);
      onReorderEntries(reordered.map((e) => e.id));
    }
  };

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={ListOrdered}
        title="No entries yet"
        description={'Click "Add Entry" to create one.'}
        className={className}
      />
    );
  }

  return (
    <div className={["entry-list", className].filter(Boolean).join(" ")}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={entries.map((e) => e.id)}
          strategy={verticalListSortingStrategy}
        >
          {entries.map((entry) => (
            <SortableEntryItem
              key={entry.id}
              entry={entry}
              sectionKind={sectionKind}
              isExpanded={expandedIds.has(entry.id)}
              onToggleExpand={() => toggleExpand(entry.id)}
              onUpdate={(patch) => onUpdateEntry(entry.id, patch)}
              onRemove={() => onRemoveEntry(entry.id)}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}

export default EntryList;
