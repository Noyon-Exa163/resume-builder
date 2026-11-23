"use client";

import { useState } from "react";
import { Check, Copy, Mail, UserPlus } from "lucide-react";
import { DialogRoot, DialogPopup } from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { SwitchField, useToast } from "@/components/ui";
import "./InviteUserDialog.css";

interface InviteResponse {
  inviteUrl?: string;
  delivered?: boolean;
  deliveryError?: string | null;
}

export interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInviteSent: () => void;
}

export function InviteUserDialog({
  open,
  onOpenChange,
  onInviteSent,
}: InviteUserDialogProps) {
  const [email, setEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  /** Set when an invite was created but no email went out — the admin gets
   *  the link to share by hand instead of a false "sent" confirmation. */
  const [pendingLink, setPendingLink] = useState<{
    inviteUrl: string;
    deliveryError: string | null;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  function reset() {
    setEmail("");
    setError(null);
    setPendingLink(null);
    setCopied(false);
  }

  function handleClose() {
    reset();
    onOpenChange(false);
  }

  async function handleCopy() {
    if (!pendingLink) return;
    try {
      await navigator.clipboard.writeText(pendingLink.inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (e.g. insecure context) — the link stays
      // selectable in the readonly input below.
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("An email address is required.");
      return;
    }

    setIsLoading(true);
    void fetch("/api/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), isAdmin }),
    })
      .then(async (res) => {
        const data = (await res.json()) as InviteResponse & { error?: string };
        if (!res.ok) {
          setError(data.error || "Failed to send invite.");
          setIsLoading(false);
          return;
        }
        setIsLoading(false);
        if (data.inviteUrl && data.delivered === false) {
          // Created, but no email went out — surface the link instead.
          // Still notify the parent: the invite exists and must show up in
          // the page's pending-invites section right away.
          setPendingLink({
            inviteUrl: data.inviteUrl,
            deliveryError: data.deliveryError ?? null,
          });
          onInviteSent();
          toast({
            type: "info",
            title: "Invite created successfully!",
            message: "Email delivery isn't configured — copy the link to share it.",
            duration: 6000,
          });
          return;
        }
        reset();
        onOpenChange(false);
        onInviteSent();
        toast({ type: "success", title: "Invite sent successfully!" });
      })
      .catch(() => {
        setError("Something went wrong. Please try again.");
        setIsLoading(false);
      });
  }

  return (
    <DialogRoot open={open} onOpenChange={(next) => (next ? undefined : handleClose())}>
      <DialogPopup
        title={pendingLink ? "Invite Created" : "Invite a Teammate"}
        description={
          pendingLink
            ? "Email delivery isn't configured on this server, so share the invite link below directly."
            : "Enter their email address. They’ll receive an invitation to set up their account."
        }
        className="invite-user-dialog"
      >
        {pendingLink ? (
          <div className="invite-user-dialog__form">
            {pendingLink.deliveryError && (
              <p className="invite-user-dialog__error">
                {pendingLink.deliveryError}
              </p>
            )}
            <div className="invite-user-dialog__link-row">
              <Input
                id="invite-link"
                label="Invite Link"
                type="text"
                value={pendingLink.inviteUrl}
                readOnly
                onFocus={(e) => e.currentTarget.select()}
              />
              <Button
                type="button"
                variant="secondary"
                size="m"
                onClick={() => void handleCopy()}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <div className="invite-user-dialog__footer">
              <Button type="button" variant="primary" size="m" onClick={handleClose}>
                <UserPlus size={16} />
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="invite-user-dialog__form">
            <Input
              id="invite-email"
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ada@example.com"
              required
            />
            {error && <p className="invite-user-dialog__error">{error}</p>}
            <div className="invite-user-dialog__admin-row">
              <SwitchField
                checked={isAdmin}
                onCheckedChange={setIsAdmin}
                label="Admin access"
                tooltip="Admins can manage all resumes, invite users, and change settings."
              />
            </div>
            <div className="invite-user-dialog__footer">
              <Button
                type="button"
                variant="secondary"
                size="m"
                onClick={handleClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="m"
                disabled={isLoading}
              >
                <Mail size={16} />
                {isLoading ? "Sending…" : "Send Invite"}
              </Button>
            </div>
          </form>
        )}
      </DialogPopup>
    </DialogRoot>
  );
}
