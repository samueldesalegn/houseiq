export interface PropertyAnalysisResponse {
  source?: string;
  summary: Summary;
  property: PropertyInfo;
  underwriting: Underwriting;
  break_even: BreakEven;
  scenarios: Scenarios;
  resilience: Resilience;
  hidden_insights: string[];
  action_plan: string[];
  deal_explanation: DealExplanation;
  data_sources: DataSources;
}

export interface Summary {
  buy_decision: string;
  recommendation: string;
  deal_score: number;
  final_summary: string;
  key_blocker: string;
  resilience_rating: string;
  resilience_score: number;
}

export interface PropertyInfo {
  address: string;
  property_type: string;
  beds: number;
  baths: number;
  sqft: number;
  year_built: number;
  estimated_value: number;
  estimated_rent: number;
  price_per_sqft: number;
  rent_to_value_ratio_percent: number;
}

export interface Underwriting {
  purchase_price: number;
  down_payment_percent: number;
  interest_rate: number;
  monthly_cash_flow: number;
  total_monthly_expenses: number;
  cap_rate: number;
  dscr: number;
  cash_on_cash_return: number;
}

export interface BreakEven {
  break_even_monthly_rent: number;
  break_even_purchase_price: number;
  max_interest_rate_for_positive_cashflow: number;
  minimum_down_payment_percent: number;
}

export interface Scenarios {
  base: Scenario;
  optimistic: Scenario;
  conservative: Scenario;
}

export interface Scenario {
  decision: string;
  cash_flow: number;
  dscr: number;
  cap_rate: number;
  cash_on_cash_return: number;
  monthly_expenses: number;
  assumptions: ScenarioAssumptions;
}

export interface ScenarioAssumptions {
  purchase_price: number;
  down_payment_percent: number;
  interest_rate: number;
  vacancy_percent: number;
  maintenance_percent: number;
  property_management_percent: number;
}

export interface Resilience {
  rating: string;
  score: number;
  interpretation: string;
  stress_tests: StressTests;
}

export interface StressTests {
  income_reduction_5_percent: StressTest;
  income_reduction_10_percent: StressTest;
  interest_rate_plus_1_percent: StressTest;
  maintenance_double: StressTest;
}

export interface StressTest {
  cash_flow: number;
  decision: string;
}

export interface DealExplanation {
  classification: 'weak' | 'moderate' | 'strong' | 'unknown';
  why_good: string[];
  why_moderate: string[];
  why_risky: string[];
  final_verdict: string;
}

export interface DataSources {
  rentcast_property: string;
  rentcast_valuation: string;
  rentcast_rent: string;
  zillow: string;
  realtor: string;
  attom: string;
}

export type InvestmentProfile =
  | 'house_hacker'
  | 'cash_flow_investor'
  | 'conservative'
  | 'aggressive';

export interface PropertyAnalysisRequest {
  address: string;
  profile?: InvestmentProfile;
  refresh?: boolean;
  include_details?: boolean;
  assumptions?: {
    purchase_price?: number;
    down_payment_percent?: number;
    interest_rate?: number;
  };
}
