import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/admin/access";

export const AUTH_ROLES = {
  DEMO_USER: "demo_user",
  PLATFORM_ADMIN: "platform_admin",
  PLATFORM_DEV: "platform_dev",
} as const;

export type AuthRole = (typeof AUTH_ROLES)[keyof typeof AUTH_ROLES];

export const platformAccessControl = createAccessControl(defaultStatements);

export const demoUserRole = platformAccessControl.newRole({
  user: [],
  session: [],
});

export const platformAdminRole = platformAccessControl.newRole({
  user: ["list", "get", "update", "ban", "set-password"],
  session: ["list", "revoke", "delete"],
});

export const platformDevRole = platformAccessControl.newRole({
  user: [
    "create",
    "list",
    "get",
    "update",
    "ban",
    "set-password",
    "set-email",
    "set-role",
  ],
  session: ["list", "revoke", "delete"],
});

export const platformAuthRoles = {
  [AUTH_ROLES.DEMO_USER]: demoUserRole,
  [AUTH_ROLES.PLATFORM_ADMIN]: platformAdminRole,
  [AUTH_ROLES.PLATFORM_DEV]: platformDevRole,
};
