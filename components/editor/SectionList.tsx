"use client";

import type {
  ResumeEntry,
  ResumeSection,
} from "@/lib/schema/resume";
import { SectionCard } from "./SectionCard";
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
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Layers } from "lucide-react";
import { EmptyState } from "@/components/ui";
import "./SectionList.css";

export interface SectionListProps {
  sections: ResumeSection[];
  onUpdateSection: (sectionId: string, patch: Partial<ResumeSection>) => void;
  onRemoveSection: (sectionId: string) => void;
  onReorderSections: (orderedIds: string[]) => void;
  onAddEntry: (sectionId: string) => void;
  onUpdateEntry: (
    sectionId: string,
    entryId: string,
    patch: Partial<ResumeEntry>,
  ) => void;
  onRemoveEntry: (sectionId: string, entryId: string) => void;
  onReorderEntries: (sectionId: string, orderedIds: string[]) => void;
  className?: string;
}

interface SortableSectionItemProps {
  section: ResumeSection;
  onUpdateSection: (patch: Partial<ResumeSection>) => void;
  onRemoveSection: () => void;
  onAddEntry: () => void;
  onUpdateEntry: (entryId: string, patch: Partial<ResumeEntry>) => void;
  onRemoveEntry: (entryId: string) => void;
  onReorderEntries: (orderedIds: string[]) => void;
}

function SortableSectionItem({
  section,
  onUpdateSection,
  onRemoveSection,
  onAddEntry,
  onUpdateEntry,
  onRemoveEntry,
  onReorderEntries,
}: SortableSectionItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <SectionCard
        section={section}
        onUpdateSection={onUpdateSection}
        onRemoveSection={onRemoveSection}
        onAddEntry={onAddEntry}
        onUpdateEntry={onUpdateEntry}
        onRemoveEntry={onRemoveEntry}
        onReorderEntries={onReorderEntries}
        dragHandleProps={{ ...attributes, ...listeners }}
        isDragging={isDragging}
      />
    </div>
  );
}

export function SectionList({
  sections,
  onUpdateSection,
  onRemoveSection,
  onReorderSections,
  onAddEntry,
  onUpdateEntry,
  onRemoveEntry,
  onReorderEntries,
  className,
}: SectionListProps) {
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

    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = [...sections];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);
      onReorderSections(reordered.map((s) => s.id));
    }
  };

  if (sections.length === 0) {
    return (
      <EmptyState
        icon={Layers}
        title="No sections added yet"
        description={'Click "Add Section" below to add Work Experience, Education, Skills, or custom sections.'}
        className={className}
      />
    );
  }

  return (
    <div className={["section-list", className].filter(Boolean).join(" ")}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sections.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          {sections.map((section) => (
            <SortableSectionItem
              key={section.id}
              section={section}
              onUpdateSection={(patch) => onUpdateSection(section.id, patch)}
              onRemoveSection={() => onRemoveSection(section.id)}
              onAddEntry={() => onAddEntry(section.id)}
              onUpdateEntry={(entryId, patch) =>
                onUpdateEntry(section.id, entryId, patch)
              }
              onRemoveEntry={(entryId) => onRemoveEntry(section.id, entryId)}
              onReorderEntries={(orderedIds) =>
                onReorderEntries(section.id, orderedIds)
              }
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}

export default SectionList;
