"use client";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type SlotPlan = { sequence: number; slotCount: number };

export function createSlotPlans(levelCount: number, existing: SlotPlan[] = []) {
  const counts = new Map(existing.map((plan) => [plan.sequence, plan.slotCount]));
  return Array.from({ length: levelCount }, (_, index) => ({ sequence: index + 1, slotCount: counts.get(index + 1) ?? 0 }));
}

type SlotPlanFieldsProps = {
  plans: SlotPlan[];
  slotLimit: number;
  controlClassName?: string;
  onChange: (plans: SlotPlan[]) => void;
};

export function SlotPlanFields({ plans, slotLimit, controlClassName = "h-12", onChange }: SlotPlanFieldsProps) {
  return (
    <div className="warehouse-slot-plans">
      {plans.map((plan) => (
        <div className="field-group" key={plan.sequence}>
          <Label>Ô chứa · Tầng {plan.sequence}</Label>
          <Select onValueChange={(value) => onChange(plans.map((item) => item.sequence === plan.sequence ? { ...item, slotCount: Number(value) } : item))} value={String(plan.slotCount)}>
            <SelectTrigger className={`${controlClassName} w-full`}><SelectValue /></SelectTrigger>
            <SelectContent>{Array.from({ length: slotLimit + 1 }, (_, count) => <SelectItem key={count} value={String(count)}>{count} ô chứa</SelectItem>)}</SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );
}
