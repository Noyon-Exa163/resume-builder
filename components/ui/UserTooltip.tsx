import type { ReactElement } from "react";
import type { AvatarPreferences } from "@/lib/avatar";
import Avatar from "./Avatar";
import { Tooltip } from "./Tooltip";
import "./UserTooltip.css";

export interface UserTooltipProps {
  /** Small heading above the person, e.g. "Created By". */
  title: string;
  name: string;
  email: string;
  avatar?: AvatarPreferences;
  /** Optional muted line under the person, e.g. a timestamp. */
  caption?: string;
  children: ReactElement;
}

/** Hover card for a person: heading, avatar, name and email. */
export default function UserTooltip({
  title,
  name,
  email,
  avatar,
  caption,
  children,
}: UserTooltipProps) {
  return (
    <Tooltip
      side="bottom"
      variant="light"
      label={
        <span className="user-tooltip">
          <span className="user-tooltip__title">{title}</span>
          <span className="user-tooltip__person">
            <Avatar name={email} size={32} {...avatar} />
            <span className="user-tooltip__identity">
              <span className="user-tooltip__name">{name}</span>
              <span className="user-tooltip__email">{email}</span>
              {caption && (
                <span className="user-tooltip__caption">{caption}</span>
              )}
            </span>
          </span>
        </span>
      }
    >
      {children}
    </Tooltip>
  );
}
