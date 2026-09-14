// Empty string means "same origin as the page" -- correct for production,
// where the backend serves this built frontend itself. For local dev (a
// separate `npm run dev` server on a different port than the backend),
// set VITE_API_URL in frontend/.env (see .env.example).
const API_URL = import.meta.env.VITE_API_URL || "";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      // no JSON body
    }
    throw new ApiError(res.status, detail);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
};

// ---- Types mirroring the backend response shapes ----

export interface PortfolioSummary {
  as_of_statement: string;
  custodian: string;
  account_label: string;
  statement_total_value: number;
  live_total_value: number;
  change_since_statement: number;
  change_since_statement_pct: number;
  cash_value: number;
  stocks_value: number;
  cash_weight: number;
  stocks_weight: number;
  num_positions: number;
  last_period_return: number | null;
  last_period_note: string | null;
}

export interface Holding {
  ticker: string;
  name: string;
  sector: string;
  asset_class: string;
  quantity: number;
  statement_price: number;
  current_price: number;
  is_live_price: boolean;
  price_as_of: string;
  day_change_pct: number | null;
  market_value: number;
  statement_market_value: number;
  cost_basis: number | null;
  unrealized_gain: number | null;
  weight: number;
}

export interface SnapshotSummary {
  date: string;
  custodian: string;
  total_value: number;
  cash_value: number;
  stocks_value: number;
}

export interface PerformancePeriod {
  start_date: string;
  end_date: string;
  start_value: number;
  end_value: number;
  return_pct: number;
  months_elapsed: number;
  flow_adjusted: boolean;
  note: string | null;
}

export interface RiskMetrics {
  annualized_volatility: number | null;
  annualized_return?: number;
  cumulative_return?: number;
  sharpe_ratio: number | null;
  max_drawdown: number | null;
  beta: number | null;
  risk_free_rate?: number;
  sample_size: number;
  note: string;
}

export interface PerformanceResponse {
  benchmark_ticker: string;
  benchmark_available: boolean;
  periods: PerformancePeriod[];
  benchmark_periods: { date: string; return_pct: number | null }[];
  cumulative_return: number | null;
  risk_metrics: RiskMetrics;
}

export interface AttributionRow {
  ticker: string;
  name: string;
  start_value: number;
  end_value: number;
  position_return: number | null;
  contribution_to_return: number;
  status: "new" | "exited" | "held";
}

export interface AttributionResponse {
  start_date: string;
  end_date: string;
  flow_adjusted_period: boolean;
  available_periods: string[];
  attribution: AttributionRow[];
}

export interface SectorExposureRow {
  sector: string;
  market_value: number;
  weight: number;
  over_limit: boolean;
}

export interface ConcentrationRow {
  ticker: string;
  name: string;
  weight: number;
  market_value: number;
  over_limit: boolean;
}

export interface RiskResponse {
  as_of_statement: string;
  sector_exposure: SectorExposureRow[];
  concentration: ConcentrationRow[];
  single_name_limit: number;
  sector_limit: number;
}

export interface ActivityRow {
  date: string;
  category: string;
  description: string;
  amount: number | null;
}

export const portfolioApi = {
  summary: () => api.get<PortfolioSummary>("/api/portfolio/summary"),
  holdings: () => api.get<{ as_of_statement: string; holdings: Holding[] }>("/api/portfolio/holdings"),
  history: () => api.get<{ snapshots: SnapshotSummary[] }>("/api/portfolio/history"),
  performance: () => api.get<PerformanceResponse>("/api/portfolio/performance"),
  attribution: (periodEnd?: string) =>
    api.get<AttributionResponse>(`/api/portfolio/attribution${periodEnd ? `?period_end=${periodEnd}` : ""}`),
  risk: () => api.get<RiskResponse>("/api/portfolio/risk"),
  activity: () => api.get<{ activity: ActivityRow[] }>("/api/portfolio/activity"),
};

export const authApi = {
  login: (password: string) => api.post<{ ok: boolean }>("/api/auth/login", { password }),
  logout: () => api.post<{ ok: boolean }>("/api/auth/logout"),
  me: () => api.get<{ authenticated: boolean }>("/api/auth/me"),
};
