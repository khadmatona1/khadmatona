"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { modal } from "@/lib/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Pagination } from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { EyeIcon, PencilIcon, TrashIcon } from "@/components/ui/action-icons";
import { UserDetailContent } from "@/components/users/user-detail-content";
import { UserEditContent } from "@/components/users/user-edit-content";
import { UserCreateContent } from "@/components/users/user-create-content";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { deleteUser, listRoles, listUsers } from "@/lib/users";
import type { User } from "@/types/api";
import type { Pagination as PaginationData } from "@/types/property";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

export default function UsersListPage() {
  const t = useTranslations("DashboardUsers");
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [roleFilter, setRoleFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    listRoles()
      .then((data) => {
        if (!cancelled) setRoles(data);
      })
      .catch(() => {
        // Non-blocking - the list still works without the filter dropdown if this fails.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setIsLoading(true);

      try {
        const result = await listUsers({ page, role: roleFilter || undefined, search: search || undefined });
        if (cancelled) return;
        setUsers(result.users);
        setPagination(result.pagination);
      } catch (caught) {
        if (cancelled) return;
        modal.error(caught instanceof ApiError ? caught.message : t("genericError"));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `t` is stable per locale render
  }, [page, roleFilter, search]);

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function handleRoleFilterChange(value: string) {
    setRoleFilter(value);
    setPage(1);
  }

  function handleUserUpdated(updated: User) {
    setUsers((current) => current.map((u) => (u.id === updated.id ? updated : u)));
  }

  function handleView(user: User) {
    modal.custom({
      content: (
        <UserDetailContent
          id={user.id}
          onUpdated={handleUserUpdated}
          onDeleted={() => setUsers((current) => current.filter((u) => u.id !== user.id))}
        />
      ),
    });
  }

  function handleEdit(user: User) {
    modal.custom({
      content: <UserEditContent id={user.id} onUpdated={handleUserUpdated} />,
    });
  }

  function handleCreate() {
    modal.custom({
      content: <UserCreateContent onCreated={(created) => setUsers((current) => [created, ...current])} />,
    });
  }

  function handleDelete(user: User) {
    modal.confirm({
      message: t("confirmDelete", { name: user.name }),
      confirmLabel: t("delete"),
      cancelLabel: t("cancel"),
      onConfirm: async () => {
        setDeletingId(user.id);
        try {
          await deleteUser(user.id);
          setUsers((current) => current.filter((u) => u.id !== user.id));
          modal.success(t("deleteSuccess"));
        } catch (caught) {
          modal.error(caught instanceof ApiError ? caught.message : t("deleteError"));
        } finally {
          setDeletingId(null);
        }
      },
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold text-text sm:text-3xl">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-text-muted">{t("subtitle")}</p>
        </div>
        <Button className="w-full sm:w-auto" onClick={handleCreate}>
          {t("createUser")}
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <form onSubmit={handleSearchSubmit} className="flex w-full max-w-sm items-center gap-2">
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full min-w-0 rounded-sm border-[1.5px] border-border-strong bg-surface px-3.5 py-2.5 text-[0.95rem] text-text focus-visible:border-gold-primary"
          />
        </form>
        <div className="flex flex-col gap-2 sm:w-56">
          <span className="text-sm font-bold text-text">{t("role")}</span>
          <Combobox
            value={roleFilter}
            onChange={handleRoleFilterChange}
            options={roles.map((role) => ({ value: role, label: role }))}
            placeholder={t("allRoles")}
            ariaLabel={t("role")}
          />
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} columns={6} />
      ) : users.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border-strong bg-surface-muted p-8 text-center sm:p-12">
          <h3 className="font-display text-xl font-semibold text-text">{t("noResultsTitle")}</h3>
        </div>
      ) : (
        <>
          <Table>
            <TableHead>
              <TableHeaderCell>{t("name")}</TableHeaderCell>
              <TableHeaderCell>{t("email")}</TableHeaderCell>
              <TableHeaderCell>{t("role")}</TableHeaderCell>
              <TableHeaderCell>{t("accountStatus")}</TableHeaderCell>
              <TableHeaderCell>{t("createdOn")}</TableHeaderCell>
              <TableHeaderCell>{t("actions")}</TableHeaderCell>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell label={t("name")} className="max-w-[200px] truncate font-semibold">
                    {user.name}
                  </TableCell>
                  <TableCell label={t("email")} className="max-w-[220px] truncate">
                    <bdi dir="ltr">{user.email}</bdi>
                  </TableCell>
                  <TableCell label={t("role")}>
                    {user.roles && user.roles.length > 0 ? (
                      <Badge tone="gold">{user.roles[0]}</Badge>
                    ) : (
                      <span className="text-text-muted">{t("noRole")}</span>
                    )}
                  </TableCell>
                  <TableCell label={t("accountStatus")}>
                    <Badge tone={user.is_active ? "success" : "error"}>
                      {user.is_active ? t("active") : t("inactive")}
                    </Badge>
                  </TableCell>
                  <TableCell label={t("createdOn")}>
                    {dateFormatter.format(new Date(user.created_at))}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-start gap-1">
                      <button
                        type="button"
                        onClick={() => handleView(user)}
                        title={t("view")}
                        aria-label={t("view")}
                        className="rounded-md p-2 text-text-muted hover:bg-surface-muted hover:text-gold-primary"
                      >
                        <EyeIcon />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEdit(user)}
                        title={t("edit")}
                        aria-label={t("edit")}
                        className="rounded-md p-2 text-text-muted hover:bg-surface-muted hover:text-gold-primary"
                      >
                        <PencilIcon />
                      </button>
                      {currentUser?.id !== user.id && (
                        <button
                          type="button"
                          onClick={() => handleDelete(user)}
                          disabled={deletingId === user.id}
                          title={deletingId === user.id ? t("deleting") : t("delete")}
                          aria-label={deletingId === user.id ? t("deleting") : t("delete")}
                          className="rounded-md p-2 text-text-muted hover:bg-error/10 hover:text-error disabled:opacity-50"
                        >
                          <TrashIcon />
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {pagination && <Pagination pagination={pagination} onPageChange={setPage} />}
        </>
      )}
    </div>
  );
}
