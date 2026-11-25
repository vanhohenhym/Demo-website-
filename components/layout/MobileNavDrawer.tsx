"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export interface MobileNavDrawerProps {
  id?: string;
  className?: string;
  children: React.ReactNode;
}

export function MobileNavDrawer({
  id = "mobile-nav-drawer",
  className,
  children,
}: MobileNavDrawerProps) {
  const pathname = usePathname();
  const drawerRef = useRef<HTMLDivElement | null>(null);

  const closeDrawer = useCallback(() => {
    try {
      (
        drawerRef.current as
          | (HTMLDivElement & { hidePopover?: () => void })
          | null
      )?.hidePopover?.();
    } catch {
      // Ignore if popover is already closed or unsupported
    }
  }, []);

  useEffect(() => {
    closeDrawer();
  }, [pathname, closeDrawer]);

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement | null)?.closest("a[href]")) {
      closeDrawer();
    }
  };

  return (
    <div
      ref={drawerRef}
      id={id}
      popover="auto"
      onClick={handleClick}
      className={className}
    >
      {children}
    </div>
  );
}
