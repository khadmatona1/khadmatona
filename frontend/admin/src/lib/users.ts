import { api } from "@/lib/api";
import type { Pagination } from "@/types/property";
import type { User } from "@/types/api";
import type { UserFormValues } from "@/types/user";

export interface UserList {
  users: User[];
  pagination: Pagination;
}

export interface ListUsersParams {
  page?: number;
  role?: string;
  search?: string;
  perPage?: number;
}

export async function listUsers(params: ListUsersParams | number = 1): Promise<UserList> {
  const { page = 1, role, search, perPage } =
    typeof params === "number" ? { page: params } : params;

  const query = new URLSearchParams({ page: String(page) });
  if (role) query.set("filter[role]", role);
  if (search) query.set("filter[search]", search);
  if (perPage) query.set("per_page", String(perPage));

  const envelope = await api.getWithMeta<User[]>(`/api/v1/users?${query.toString()}`);

  return {
    users: envelope.data,
    pagination: (envelope.meta?.pagination as Pagination) ?? {
      current_page: 1,
      last_page: 1,
      per_page: 15,
      total: envelope.data.length,
    },
  };
}

export function getUser(id: number | string): Promise<User> {
  return api.get<User>(`/api/v1/users/${id}`);
}

export function createUser(values: UserFormValues): Promise<User> {
  return api.post<User>("/api/v1/users", values);
}

/**
 * A blank password means "keep the current one" - only sent to the API
 * when the admin actually typed a new one, matching UpdateUserRequest's
 * nullable password rule.
 */
export function updateUser(id: number | string, values: UserFormValues): Promise<User> {
  const payload: Record<string, unknown> = {
    name: values.name,
    email: values.email,
    role: values.role,
  };
  if (values.password) {
    payload.password = values.password;
    payload.password_confirmation = values.password_confirmation;
  }
  if (values.is_active !== undefined) {
    payload.is_active = values.is_active;
  }

  return api.put<User>(`/api/v1/users/${id}`, payload);
}

export function deleteUser(id: number | string): Promise<void> {
  return api.delete<void>(`/api/v1/users/${id}`);
}

export function listRoles(): Promise<string[]> {
  return api.get<string[]>("/api/v1/roles");
}
