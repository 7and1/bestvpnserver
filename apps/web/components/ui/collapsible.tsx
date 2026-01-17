"use client";

import * as React from "react";
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
import { ChevronDown } from "lucide-react";

const Collapsible = CollapsiblePrimitive.Root;

const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger;

const CollapsibleContent = CollapsiblePrimitive.CollapsibleContent;

interface ToolEducationProps {
  title?: string;
  children: React.ReactNode;
}

export function ToolEducation({
  title = "What is this?",
  children,
}: ToolEducationProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="mt-6 rounded-lg border border-border/60 bg-muted/30">
        <CollapsibleTrigger className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors min-h-[44px]">
          <span className="text-sm font-semibold">{title}</span>
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden">
          <div className="px-4 pb-4 text-sm text-muted-foreground space-y-2">
            {children}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
