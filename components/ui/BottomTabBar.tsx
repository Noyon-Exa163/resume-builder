"use client";

import { Tabs } from "@base-ui/react/tabs";
import type { LucideIcon } from "lucide-react";
import "./BottomTabBar.css";

export interface BottomTabBarItem {
  value: string;
  label: string;
  icon: LucideIcon;
}

export interface BottomTabBarProps {
  items: BottomTabBarItem[];
  value: string;
  onValueChange: (value: string) => void;
  "aria-label": string;
  className?: string;
}

/**
 * Thumb-reachable view switcher docked to the bottom of the screen on
 * narrow layouts. A tab list only — the views it switches live elsewhere
 * on the page. Arrow keys move between tabs (Base UI).
 */
export function BottomTabBar({
  items,
  value,
  onValueChange,
  "aria-label": ariaLabel,
  className,
}: BottomTabBarProps) {
  return (
    <Tabs.Root
      value={value}
      onValueChange={(next) => onValueChange(String(next))}
      className={["bottom-tab-bar", className].filter(Boolean).join(" ")}
    >
      <Tabs.List className="bottom-tab-bar__list" aria-label={ariaLabel}>
        {items.map(({ value: itemValue, label, icon: Icon }) => (
          <Tabs.Tab
            key={itemValue}
            value={itemValue}
            className="bottom-tab-bar__tab"
          >
            <Icon size={20} aria-hidden="true" />
            <span className="bottom-tab-bar__label">{label}</span>
          </Tabs.Tab>
        ))}
      </Tabs.List>
    </Tabs.Root>
  );
}

export default BottomTabBar;
