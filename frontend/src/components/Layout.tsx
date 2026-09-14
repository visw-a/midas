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

const TODAY = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

export function Layout() {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-navy-50">
      <div className="mx-auto flex max-w-7xl">
        <aside className="sticky top-0 hidden h-screen w-52 shrink-0 flex-col bg-navy-800 py-6 md:flex">
          <div className="mb-8 px-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-navy-300">McIntire Investment</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-navy-300">Institute</p>
            <p className="mt-2 text-sm font-bold text-white">Portfolio Report</p>
          </div>
          <nav className="flex flex-1 flex-col">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `border-l-2 px-5 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "border-white bg-navy-700 text-white"
                      : "border-transparent text-navy-300 hover:border-navy-500 hover:bg-navy-700/60 hover:text-white"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <button
            onClick={() => logout()}
            className="border-l-2 border-transparent px-5 py-2 text-left text-sm font-medium text-navy-400 transition-colors hover:border-navy-500 hover:bg-navy-700/60 hover:text-white"
          >
            Sign out
          </button>
        </aside>

        <div className="min-w-0 flex-1 px-4 pb-16 pt-6 md:px-8">
          <MobileNav />
          <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b-2 border-navy-800 pb-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-navy-500">
                The McIntire Investment Institute
              </p>
              <p className="text-base font-bold text-navy-900">Portfolio Report</p>
            </div>
            <p className="text-xs text-navy-500">{TODAY}</p>
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}

function MobileNav() {
  const { logout } = useAuth();
  return (
    <div className="mb-6 flex items-center justify-between gap-2 overflow-x-auto bg-navy-800 px-2 py-2 md:hidden">
      <div className="flex gap-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `whitespace-nowrap px-2.5 py-1.5 text-xs font-medium ${isActive ? "bg-navy-700 text-white" : "text-navy-300"}`
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
