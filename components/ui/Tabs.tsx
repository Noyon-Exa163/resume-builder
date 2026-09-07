"use client";

import { Tabs } from "@base-ui/react/tabs";
import { forwardRef, type ReactNode } from "react";
import "./Tabs.css";

export interface TabItem {
  value: string;
  label: string;
  content: ReactNode;
}

export interface TabsFieldProps {
  tabs: TabItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}

const TabsField = forwardRef<HTMLDivElement, TabsFieldProps>(
  ({ tabs, value, defaultValue, onValueChange, className }, ref) => {
    return (
      <Tabs.Root
        ref={ref}
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
        className={["tabs", className].filter(Boolean).join(" ")}
      >
        <Tabs.List className="tabs__list">
          {tabs.map((tab) => (
            <Tabs.Tab key={tab.value} value={tab.value} className="tabs__tab">
              {tab.label}
            </Tabs.Tab>
          ))}
          <Tabs.Indicator className="tabs__indicator" />
        </Tabs.List>
        {tabs.map((tab) => (
          <Tabs.Panel key={tab.value} value={tab.value} className="tabs__panel">
            {tab.content}
          </Tabs.Panel>
        ))}
      </Tabs.Root>
    );
  },
);

TabsField.displayName = "TabsField";
export default TabsField;
