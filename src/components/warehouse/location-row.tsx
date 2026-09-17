"use client";

import { cloneElement, isValidElement, useState, type MouseEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

type LocationRowProps = {
  level: 0 | 1 | 2 | 3 | 4;
  type: string;
  code: string;
  name: string;
  summary?: string;
  hasChildren?: boolean;
  utility?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
};

export function LocationRow({
  level,
  type,
  code,
  name,
  summary,
  hasChildren = false,
  utility,
  actions,
  children,
}: LocationRowProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [editRequest, setEditRequest] = useState(0);
  const actionsWithEditRequest = isValidElement<{ editRequest?: number }>(actions)
    ? cloneElement(actions, { editRequest })
    : actions;

  function requestEdit() {
    if (actions) setEditRequest((current) => current + 1);
  }

  function handleRowClick(event: MouseEvent<HTMLDivElement>) {
    if (!actions || !(event.target instanceof Element)) return;
    if (event.target.closest("button, a, input, select, textarea, [role=button]")) return;
    requestEdit();
  }

  return (
    <li className="warehouse-node" data-level={level}>
      <div className={actions ? "warehouse-node-row warehouse-node-row--editable" : "warehouse-node-row"} onClick={handleRowClick}>
        {actions ? <button aria-label={`Sửa ${type} ${code}`} className="warehouse-node-identity warehouse-node-edit-target" onClick={requestEdit} type="button">
          <span className="warehouse-node-type">{type}</span>
          <div className="warehouse-node-title">
            <strong>{code}</strong>
            <span>{name}</span>
          </div>
        </button> : <div className="warehouse-node-identity">
          <span className="warehouse-node-type">{type}</span>
          <div className="warehouse-node-title">
            <strong>{code}</strong>
            <span>{name}</span>
          </div>
        </div>}
        {summary ? <span className="warehouse-node-summary">{summary}</span> : null}
        {hasChildren || utility || actions ? <div className="warehouse-node-controls" onClick={(event) => event.stopPropagation()}>
          {hasChildren ? <Button aria-expanded={isExpanded} className="h-12 warehouse-toggle-button" onClick={() => setIsExpanded((current) => !current)} type="button" variant="outline">{isExpanded ? "Thu gọn" : "Mở"}</Button> : null}
          {utility}
          {actionsWithEditRequest}
        </div> : null}
      </div>
      {isExpanded && children ? <ol className="warehouse-child-list">{children}</ol> : null}
    </li>
  );
}
