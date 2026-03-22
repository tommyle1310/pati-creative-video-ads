"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "announcement-dismissed";

export function AnnouncementDialog() {
  const [open, setOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) setOpen(true);
  }, []);

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem(STORAGE_KEY, "true");
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base text-center text-3xl">Look at me!</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground">Ad crawling</strong> is temporarily
            paused — Apify quota ran out 🥲
          </p>
          <p>
            Everything else still works:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Browse & filter existing crawled ads</li>
            <li>Video Ad Studio (clone & improve ads)</li>
            <li>Save to boards & generate briefs</li>
            <li>Trending ads & ad explorer</li>
          </ul>
        </div>

        <DialogFooter className="flex-col gap-3 sm:flex-col">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded border-border"
            />
            Don&apos;t show this again
          </label>
          <Button onClick={handleClose} className="w-full">
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
