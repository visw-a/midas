import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/holdings", label: "Holdings" },
  { to: "/performance", label: "Performance" },
  { to: "/attribution", label: "Attribution" },
  { to: "/risk", label: "Risk" },
  { to: "/activity", label: "Activity" },
];

export function Layout() {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-ink-950">
      <div className="mx-auto flex max-w-7xl">
        <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-ink-800 px-4 py-6 md:flex">
          <div className="mb-8 px-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">MII</p>
            <p className="mt-0.5 text-sm font-semibold text-ink-100">Portfolio Tracker</p>
          </div>
          <nav className="flex flex-1 flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-accent/15 text-accent"
                      : "text-ink-300 hover:bg-ink-800 hover:text-ink-100"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <button
            onClick={() => logout()}
            className="mt-4 rounded-lg px-3 py-2 text-left text-sm font-medium text-ink-400 transition-colors hover:bg-ink-800 hover:text-ink-100"
          >
            Sign out
          </button>
        </aside>

        <div className="flex-1 px-4 pb-16 pt-6 md:px-8">
          <MobileNav />
          <Outlet />
        </div>
      </div>
    </div>
  );
}

function MobileNav() {
  const { logout } = useAuth();
  return (
    <div className="mb-6 flex items-center justify-between gap-2 overflow-x-auto md:hidden">
      <div className="flex gap-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                isActive ? "bg-accent/15 text-accent" : "text-ink-300"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>
      <button onClick={() => logout()} className="whitespace-nowrap text-xs text-ink-400">
        Sign out
      </button>
    </div>
  );
}
