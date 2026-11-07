import { forwardRef, type ComponentProps } from "react";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { Link } from "@/lib/router-compat";
import { cn } from "@/lib/utils";

type NavLinkCompatProps = Omit<ComponentProps<typeof Link>, "className"> & {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
  end?: boolean;
};

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  (
    { className, activeClassName, pendingClassName, to, end = false, ...props },
    ref,
  ) => {
    const router = useRouter();
    const pathname = useRouterState({
      select: (state) => state.location.pathname,
    });
    const pendingPath = useRouterState({
      select: (state) =>
        state.status === "pending" ? state.location.pathname : undefined,
    });
    const path = to.split(/[?#]/, 1)[0] || pathname;
    const matches = (current: string | undefined) =>
      current != null &&
      (current === path ||
        (!end &&
          path !== "/" &&
          current.startsWith(path.endsWith("/") ? path : `${path}/`)));
    return (
      <Link
        ref={ref}
        to={to}
        className={cn(
          className,
          matches(pathname) && activeClassName,
          router.state.status === "pending" &&
            matches(pendingPath) &&
            pendingClassName,
        )}
        {...props}
      />
    );
  },
);

NavLink.displayName = "NavLink";
export { NavLink };
