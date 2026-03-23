// 관리자 역할 타입
export type AdminRole = "SUPER_ADMIN" | "MANAGER";

// 역할별 권한 정의
export interface RolePermissions {
  finance: {
    read: boolean;
    write: boolean;
  };
  settlements: {
    read: boolean;
    write: boolean;
  };
  disputes: {
    read: boolean;
    write: boolean;
    forceCancel: boolean;
  };
  users: {
    read: boolean;
    write: boolean;
  };
  matches: {
    read: boolean;
    write: boolean;
    forceCancel: boolean;
  };
  community: {
    read: boolean;
    write: boolean;
  };
  audit: {
    read: boolean;
  };
  settings: {
    read: boolean;
    write: boolean;
  };
}

export const ROLE_PERMISSIONS: Record<AdminRole, RolePermissions> = {
  SUPER_ADMIN: {
    finance: { read: true, write: true },
    settlements: { read: true, write: true },
    disputes: { read: true, write: true, forceCancel: true },
    users: { read: true, write: true },
    matches: { read: true, write: true, forceCancel: true },
    community: { read: true, write: true },
    audit: { read: true },
    settings: { read: true, write: true },
  },
  MANAGER: {
    finance: { read: true, write: false },
    settlements: { read: true, write: false },
    disputes: { read: true, write: true, forceCancel: false },
    users: { read: true, write: true },
    matches: { read: true, write: false, forceCancel: false },
    community: { read: true, write: true },
    audit: { read: true },
    settings: { read: false, write: false },
  },
};
