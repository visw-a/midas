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
    <div className="min-h-screen bg-navy-50">
      <div className="mx-auto flex max-w-7xl">
        <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col bg-navy-800 px-4 py-6 md:flex">
          <div className="mb-8 px-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-navy-300">
              McIntire Investment Institute
            </p>
            <p className="mt-0.5 text-sm font-bold text-white">Portfolio Tracker</p>
          </div>
          <nav className="flex flex-1 flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `rounded px-3 py-2 text-sm font-medium transition-colors ${
                    isActive ? "bg-white text-navy-800" : "text-navy-200 hover:bg-navy-700 hover:text-white"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <button
            onClick={() => logout()}
            className="mt-4 rounded px-3 py-2 text-left text-sm font-medium text-navy-300 transition-colors hover:bg-navy-700 hover:text-white"
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
    <div className="mb-6 flex items-center justify-between gap-2 overflow-x-auto rounded-lg bg-navy-800 px-2 py-2 md:hidden">
      <div className="flex gap-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `whitespace-nowrap rounded px-2.5 py-1.5 text-xs font-medium ${
                isActive ? "bg-white text-navy-800" : "text-navy-200"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>
      <button onClick={() => logout()} className="whitespace-nowrap text-xs text-navy-300">
        Sign out
      </button>
    </div>
  );
}
