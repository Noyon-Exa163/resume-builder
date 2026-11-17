"use client";

import { useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  Check,
} from "lucide-react";
import { DialogRoot, DialogPopup } from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import type { ImportIssue } from "@/lib/import/errorFlagging";
import "./ImportReviewDialog.css";

export interface ImportReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  issues: ImportIssue[];
  onImport: (resolution: { ignored: string[]; fixed: string[] }) => void;
}

const SEVERITY_ICON: Record<ImportIssue["severity"], typeof X> = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

export function ImportReviewDialog({
  open,
  onOpenChange,
  issues,
  onImport,
}: ImportReviewDialogProps) {
  const [ignored, setIgnored] = useState<Set<string>>(new Set());
  const [fixed, setFixed] = useState<Set<string>>(new Set());

  const unresolved = issues.filter((i) => !ignored.has(i.id) && !fixed.has(i.id));
  const errors = unresolved.filter((i) => i.severity === "error");
  const canCommit = errors.length === 0;

  function handleIgnore(issue: ImportIssue) {
    setIgnored((prev) => new Set(prev).add(issue.id));
  }

  function handleFix(issue: ImportIssue) {
    setFixed((prev) => new Set(prev).add(issue.id));
  }

  function handleFixAll() {
    unresolved.forEach((issue) => {
      if (issue.fix) setFixed((prev) => new Set(prev).add(issue.id));
      else setIgnored((prev) => new Set(prev).add(issue.id));
    });
  }

  function handleImportAnyway() {
    onImport({ ignored: [...ignored], fixed: [...fixed] });
    onOpenChange(false);
  }
  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogPopup
        title="Review extracted data"
        description={
          issues.length === 1
            ? "One item found in the extracted data. Fix or ignore it before importing."
            : `${issues.length} items found in the extracted data. Fix or ignore each one before importing.`
        }
        className="import-review-dialog"
      >
        <div className="import-review-dialog__list">
          {unresolved.map((issue) => {
            const SeverityIcon = SEVERITY_ICON[issue.severity];
            return (
            <div
              key={issue.id}
              className={[
                "import-review-dialog__item",
                `import-review-dialog__item--${issue.severity}`,
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className="import-review-dialog__item-icon">
                <SeverityIcon size={18} />
              </div>
              <div className="import-review-dialog__item-content">
                <div className="import-review-dialog__item-message">
                  {issue.message}
                </div>
                {issue.currentValue != null && (
                  <div className="import-review-dialog__item-current">
                    Current: <span>{String(issue.currentValue)}</span>
                  </div>
                )}
                {issue.fix?.action === "set" && (
                  <div className="import-review-dialog__item-suggested">
                    Suggested: <span>{issue.fix.value}</span>
                  </div>
                )}
                {issue.fix?.action === "remove" && (
                  <div className="import-review-dialog__item-suggested">
                    Fixing removes this item.
                  </div>
                )}
              </div>
              <div className="import-review-dialog__item-actions">
                {issue.fix && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="s"
                    onClick={() => handleFix(issue)}
                  >
                    <Check size={14} />
                    Fix
                  </Button>
                )}
                <Button
                  type="button"
                  variant="tertiary"
                  size="s"
                  onClick={() => handleIgnore(issue)}
                >
                  <X size={14} />
                  Ignore
                </Button>
              </div>
            </div>
          );
        })}
          {unresolved.length === 0 && (
            <div className="import-review-dialog__empty">
              All items reviewed. Ready to import.
            </div>
          )}
        </div>
        <div className="import-review-dialog__footer">
          {unresolved.length > 0 && canCommit && (
            <Button
              type="button"
              variant="secondary"
              size="m"
              onClick={handleFixAll}
            >
              Fix all fixable
            </Button>
          )}
          <Button
            type="button"
            variant="primary"
            size="m"
            disabled={!canCommit}
            onClick={handleImportAnyway}
          >
            {canCommit ? "Import resume" : "Fix errors first"}
          </Button>
        </div>
      </DialogPopup>
    </DialogRoot>
  );
}
