export type Role = "ADMIN" | "WAITER" | "KITCHEN";

export const AUTH_COOKIE = "brasa_token";

export type SessionPayload = {
  userId: string;
  role: Role;
  name: string;
  username: string;
};

export function roleHomePath(role: Role | string) {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "WAITER":
      return "/waiter";
    case "KITCHEN":
      return "/kitchen";
    default:
      return "/login";
  }
}
