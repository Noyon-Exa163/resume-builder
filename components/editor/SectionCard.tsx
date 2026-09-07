"use client";

import { useState } from "react";
import type {
  ResumeEntry,
  ResumeSection,
  SectionKind,
} from "@/lib/schema/resume";
import { EntryList } from "./EntryList";
import { Button, SwitchField, ConfirmDialog } from "@/components/ui";
import {
  Briefcase,
  GraduationCap,
  Sparkles,
  FolderGit2,
  Award,
  Languages,
  Trophy,
  LayoutGrid,
  ChevronDown,
  ChevronUp,
  Trash2,
  Plus,
  GripVertical,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import "./SectionCard.css";

export interface SectionCardProps {
  section: ResumeSection;
  onUpdateSection: (patch: Partial<ResumeSection>) => void;
  onRemoveSection: () => void;
  onAddEntry: () => void;
  onUpdateEntry: (entryId: string, patch: Partial<ResumeEntry>) => void;
  onRemoveEntry: (entryId: string) => void;
  onReorderEntries: (orderedIds: string[]) => void;
  dragHandleProps?: Record<string, unknown>;
  isDragging?: boolean;
  className?: string;
}

const SECTION_KIND_ICONS: Record<SectionKind, LucideIcon> = {
  experience: Briefcase,
  education: GraduationCap,
  skills: Sparkles,
  projects: FolderGit2,
  certifications: Award,
  languages: Languages,
  awards: Trophy,
  custom: LayoutGrid,
};

export function SectionCard({
  section,
  onUpdateSection,
  onRemoveSection,
  onAddEntry,
  onUpdateEntry,
  onRemoveEntry,
  onReorderEntries,
  dragHandleProps,
  isDragging,
  className,
}: SectionCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const KindIcon = SECTION_KIND_ICONS[section.kind] || LayoutGrid;

  const cardClasses = [
    "section-card",
    !section.visible && "section-card--hidden",
    !isExpanded && "section-card--collapsed",
    isDragging && "section-card--dragging",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cardClasses}>
      <div className="section-card__header">
        {dragHandleProps && (
          <button
            type="button"
            className="section-card__drag-handle"
            aria-label={`Reorder ${section.title} section`}
            {...dragHandleProps}
          >
            <GripVertical size={18} />
          </button>
        )}

        <div className="section-card__icon" aria-hidden="true">
          <KindIcon size={18} />
        </div>

        <div className="section-card__title-area">
          <input
            className="section-card__title-input"
            value={section.title}
            onChange={(e) => onUpdateSection({ title: e.target.value })}
            aria-label="Section title"
            placeholder="Section Title"
          />
          <span className="section-card__count-badge">
            {section.entries.length} {section.entries.length === 1 ? "item" : "items"}
          </span>
        </div>

        <div className="section-card__actions">
          <SwitchField
            checked={section.visible}
            onCheckedChange={(checked) => onUpdateSection({ visible: checked })}
            aria-label={`Toggle visibility of ${section.title}`}
          />

          <button
            type="button"
            className="section-card__icon-btn"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? `Collapse ${section.title}` : `Expand ${section.title}`}
          >
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          <button
            type="button"
            className="section-card__icon-btn section-card__icon-btn--danger"
            onClick={() => setConfirmDeleteOpen(true)}
            aria-label={`Delete section ${section.title}`}
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="section-card__body">
          <EntryList
            entries={section.entries}
            sectionKind={section.kind}
            onUpdateEntry={onUpdateEntry}
            onRemoveEntry={onRemoveEntry}
            onReorderEntries={onReorderEntries}
          />

          <div className="section-card__footer">
            <Button
              type="button"
              variant="secondary"
              size="s"
              onClick={onAddEntry}
            >
              <Plus size={14} style={{ marginRight: 4 }} />
              Add Entry
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title={`Delete section "${section.title}"?`}
        description="This will also delete all entries in this section."
        onConfirm={onRemoveSection}
      />
    </div>
  );
}

export default SectionCard;
