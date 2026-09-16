import type { ReactNode } from "react";

type LocationEmptySlotProps = {
  children: ReactNode;
};

export function LocationEmptySlot({ children }: LocationEmptySlotProps) {
  return <li className="warehouse-empty-slot">{children}</li>;
}
