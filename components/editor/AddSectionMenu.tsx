"use client";

import { Menu } from "@base-ui/react/menu";
import type { SectionKind } from "@/lib/schema/resume";
import { Button } from "@/components/ui";
import {
  Briefcase,
  GraduationCap,
  Sparkles,
  FolderGit2,
  Award,
  Languages,
  Trophy,
  LayoutGrid,
  Plus,
  ChevronDown,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import "./AddSectionMenu.css";

export interface AddSectionMenuProps {
  onAddSection: (kind: SectionKind, defaultTitle: string) => void;
  className?: string;
}

interface SectionOption {
  kind: SectionKind;
  label: string;
  defaultTitle: string;
  icon: LucideIcon;
}

const SECTION_OPTIONS: SectionOption[] = [
  {
    kind: "experience",
    label: "Work Experience",
    defaultTitle: "Work Experience",
    icon: Briefcase,
  },
  {
    kind: "education",
    label: "Education",
    defaultTitle: "Education",
    icon: GraduationCap,
  },
  {
    kind: "skills",
    label: "Skills",
    defaultTitle: "Skills",
    icon: Sparkles,
  },
  {
    kind: "projects",
    label: "Projects",
    defaultTitle: "Projects",
    icon: FolderGit2,
  },
  {
    kind: "certifications",
    label: "Certifications",
    defaultTitle: "Certifications",
    icon: Award,
  },
  {
    kind: "languages",
    label: "Languages",
    defaultTitle: "Languages",
    icon: Languages,
  },
  {
    kind: "awards",
    label: "Honors & Awards",
    defaultTitle: "Honors & Awards",
    icon: Trophy,
  },
  {
    kind: "custom",
    label: "Custom Section",
    defaultTitle: "Custom Section",
    icon: LayoutGrid,
  },
];

export function AddSectionMenu({
  onAddSection,
  className,
}: AddSectionMenuProps) {
  return (
    <div className={["add-section-menu", className].filter(Boolean).join(" ")}>
      <Menu.Root>
        <Menu.Trigger
          render={
            <Button type="button" variant="secondary">
              <Plus size={16} />
              Add Section
              <ChevronDown size={14} />
            </Button>
          }
        />
        <Menu.Portal>
          <Menu.Positioner sideOffset={8} align="start">
            <Menu.Popup
              className="add-section-menu__dropdown"
              aria-label="Add resume section options"
            >
              {SECTION_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <Menu.Item
                    key={opt.kind}
                    className="add-section-menu__item"
                    onClick={() => onAddSection(opt.kind, opt.defaultTitle)}
                  >
                    <span
                      className="add-section-menu__item-icon"
                      aria-hidden="true"
                    >
                      <Icon size={16} />
                    </span>
                    <span>{opt.label}</span>
                  </Menu.Item>
                );
              })}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </div>
  );
}

export default AddSectionMenu;
