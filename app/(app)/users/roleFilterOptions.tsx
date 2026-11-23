import { Shield, User, Users } from "lucide-react";
import type { SelectOption } from "@/components/ui";

/** Options for the users-page role filter — shared by the page and its
 *  route loading fallback so both renders show the identical trigger. */
export const ROLE_FILTER_OPTIONS: SelectOption[] = [
  { value: "all", label: "All Roles", icon: <Users size={14} aria-hidden="true" /> },
  { value: "admins", label: "Admins", icon: <Shield size={14} aria-hidden="true" /> },
  { value: "members", label: "Members", icon: <User size={14} aria-hidden="true" /> },
];
