"use client";

import { Menu } from "@base-ui/react/menu";
import type { ReactElement } from "react";
import type { LucideIcon } from "lucide-react";
import "./ActionMenu.css";

export interface ActionMenuItem {
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  disabled?: boolean;
  isDestructive?: boolean;
}

export interface ActionMenuProps {
  /** The element that opens the menu — usually an icon-only Button. It
   *  must carry its own aria-label. */
  trigger: ReactElement;
  /** Falsy entries are skipped, so conditional items can be inlined. */
  items: (ActionMenuItem | false | null | undefined)[];
  side?: "top" | "bottom";
  align?: "start" | "end";
  isTriggerDisabled?: boolean;
}

/**
 * Dropdown list of commands behind a single trigger — the account menu,
 * overflow ("More Actions") menus, and per-row action menus all share it.
 */
export function ActionMenu({
  trigger,
  items,
  side = "bottom",
  align = "end",
  isTriggerDisabled,
}: ActionMenuProps) {
  return (
    <Menu.Root>
      <Menu.Trigger disabled={isTriggerDisabled} render={trigger} />
      <Menu.Portal>
        <Menu.Positioner
          className="action-menu__positioner"
          side={side}
          align={align}
          sideOffset={8}
        >
          <Menu.Popup className="action-menu">
            {items.map(
              (item) =>
                item && (
                  <Menu.Item
                    key={item.label}
                    disabled={item.disabled}
                    className={[
                      "action-menu__item",
                      item.isDestructive && "action-menu__item--destructive",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={item.onSelect}
                  >
                    {item.icon && <item.icon size={16} aria-hidden="true" />}
                    {item.label}
                  </Menu.Item>
                ),
            )}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

export default ActionMenu;
