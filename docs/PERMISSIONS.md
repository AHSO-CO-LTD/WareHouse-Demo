# Permission Model

## Fixed authentication roles

| Role             | Purpose                                                 | Better Auth admin capabilities                              |
| ---------------- | ------------------------------------------------------- | ----------------------------------------------------------- |
| `demo_user`      | Own one isolated demo workspace                         | None                                                        |
| `platform_admin` | Manage demo registrations, support and leads            | List/get/update/ban users, reset passwords, manage sessions |
| `platform_dev`   | Highest platform authority and technical administration | ADMIN capabilities plus create user and change email        |

No role receives Better Auth impersonation capability. Generic `set-role` and `delete` are also withheld so those sensitive operations can be implemented with application rules and audit.

## Planned application permissions

Operational checks will use centralized `resource.action` permissions instead of scattered role comparisons. Initial groups include:

- `workspace.read`, `workspace.configure`, `workspace.reset`, `workspace.delete`
- `warehouse.read`, `warehouse.create`, `warehouse.update`, `warehouse.delete`
- `inventory.read`, `inventory.receive`, `inventory.issue`, `inventory.transfer`, `inventory.stocktake`, `inventory.adjust`, `inventory.override`
- `project.read`, `project.manage`, `project.budget.override`
- `quotation.read`, `quotation.manage`, `quotation.export`
- `platform.account.read`, `platform.account.manage`, `platform.support.enter`
- `system.config`, `developer.diagnostics`

The demo keeps two-person approval switched off because a workspace has one user. The permission capability remains a later production concern, not an active demo workflow.

## Sensitive invariants

- ADMIN cannot grant or obtain DEV-only authority.
- The final active DEV cannot be demoted, banned or deleted.
- Support Mode requires a reason and expires automatically.
- Frontend visibility is UX only; backend authorization is mandatory.
