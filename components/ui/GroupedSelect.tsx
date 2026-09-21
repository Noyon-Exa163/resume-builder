"use client";

import { Menu } from "@base-ui/react/menu";
import { ChevronDown } from "lucide-react";
import "./Select.css";
import "./GroupedSelect.css";

export interface GroupedSelectOption {
  value: string;
  label: string;
}

export interface GroupedSelectGroup {
  /** Groups are chosen independently; a divider separates them. */
  id: string;
  options: GroupedSelectOption[];
  value: string;
  onValueChange: (value: string) => void;
}

export interface GroupedSelectReset {
  label: string;
  /** Shows a checkmark while every group is already at its default. */
  isActive: boolean;
  onSelect: () => void;
}

export interface GroupedSelectProps {
  groups: GroupedSelectGroup[];
  /** Item pinned above the groups, with a divider, that restores defaults. */
  reset?: GroupedSelectReset;
  size?: "m" | "s";
  className?: string;
  "aria-label"?: string;
}

/**
 * A dropdown with several independent single-choice groups (e.g. sort field
 * and sort direction). Looks like SelectField; the trigger summarizes every
 * group's current choice, and the menu stays open so each can be set in turn.
 */
export default function GroupedSelect({
  groups,
  reset,
  size = "s",
  className,
  "aria-label": ariaLabel,
}: GroupedSelectProps) {
  const summary = groups
    .map(
      (group) =>
        group.options.find((option) => option.value === group.value)?.label,
    )
    .filter(Boolean)
    .join(" · ");

  return (
    <div className={["select", className].filter(Boolean).join(" ")}>
      <Menu.Root>
        <Menu.Trigger
          aria-label={ariaLabel}
          className={`select__trigger select__trigger--${size}`}
        >
          <span className="select__value">{summary}</span>
          <span className="select__icon">
            <ChevronDown size={16} />
          </span>
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner
            className="select__positioner"
            sideOffset={4}
            align="start"
          >
            <Menu.Popup className="select__popup">
              {reset && (
                <div className="grouped-select__group">
                  <Menu.Item
                    className={[
                      "select__item",
                      reset.isActive && "grouped-select__item--active",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={reset.onSelect}
                  >
                    <span className="select__item-text">{reset.label}</span>
                    {reset.isActive && (
                      <span className="select__item-indicator">
                        <CheckIcon />
                      </span>
                    )}
                  </Menu.Item>
                  <div role="separator" className="grouped-select__separator" />
                </div>
              )}
              {groups.map((group, index) => (
                <div key={group.id} className="grouped-select__group">
                  {index > 0 && (
                    <div
                      role="separator"
                      className="grouped-select__separator"
                    />
                  )}
                  <Menu.RadioGroup
                    value={group.value}
                    onValueChange={(next) => group.onValueChange(String(next))}
                  >
                    {group.options.map((option) => (
                      <Menu.RadioItem
                        key={option.value}
                        value={option.value}
                        closeOnClick={false}
                        className="select__item grouped-select__item"
                      >
                        <span className="select__item-text">
                          {option.label}
                        </span>
                        <Menu.RadioItemIndicator className="select__item-indicator">
                          <CheckIcon />
                        </Menu.RadioItemIndicator>
                      </Menu.RadioItem>
                    ))}
                  </Menu.RadioGroup>
                </div>
              ))}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M11.5 3.5L5.5 10.5L2.5 7.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
