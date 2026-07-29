import * as React from "react";
import { LogOut, User as UserIcon } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";
import { roleLabels } from "@/lib/roles";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

/** Account card fixed at the bottom of the sidebar (desktop + mobile): avatar, name, role, and
 * always-visible links to the profile page / logout — pulled out of the topbar so it lives with
 * the rest of the nav instead of floating in the corner. Deliberately not a dropdown: both actions
 * stay on screen at all times instead of needing a click to reveal them. */
export function UserAccountMenu({ onNavigate }: { onNavigate?: () => void }) {
  const { profile, signOut } = useAuth();
  const initials = profile?.full_name?.trim()?.[0] ?? "؟";
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  return (
    <div className="border-t border-border p-3">
      <div className="flex items-center gap-2 px-1 pb-2">
        <Avatar>
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">
            {profile?.full_name}
          </p>
          <p className="text-xs text-muted-foreground leading-tight">
            {profile ? roleLabels[profile.role] : ""}
          </p>
        </div>
      </div>

      <NavLink
        to="/profile"
        onClick={onNavigate}
        className={({ isActive }) =>
          cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors",
            "hover:bg-accent hover:text-accent-foreground",
            isActive &&
              "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
          )
        }
      >
        <UserIcon className="size-4" />
        الملف الشخصي
      </NavLink>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-start text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
      >
        <LogOut className="size-4" />
        تسجيل الخروج
      </button>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="تسجيل الخروج؟"
        // description="هتحتاجي تسجّلي الدخول تاني عشان تكملي شغلك"
        confirmLabel="تسجيل الخروج"
        variant="destructive"
        onConfirm={() => {
          setConfirmOpen(false);
          onNavigate?.();
          signOut();
        }}
      />
    </div>
  );
}
