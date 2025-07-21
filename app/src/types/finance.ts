// Account and Finance related TypeScript interfaces

export interface Account {
  id: number;
  name: string;
  type?: string;
  currency?: string;
  institution?: string;
  metadata?: string;
  balance?: number;
}

export interface AccountWithBalance extends Account {
  balance: number;
}

export interface BalanceHistoryEntry {
  date: string;
  balance: number;
}

export interface AccountBalanceHistory {
  account_id: number;
  history: BalanceHistoryEntry[];
}

export interface Transaction {
  id: number;
  from_account_id?: number;
  to_account_id?: number;
  amount: number;
  currency: string;
  category?: string;
  description?: string;
  notes?: string;
  timestamp: string;
}

export interface Investment {
  id: number;
  account_id?: number;
  asset_type?: string;
  symbol?: string;
  quantity?: number;
  value?: number;
  currency?: string;
  timestamp: string;
}

export interface Budget {
  id: number;
  name?: string;
  category?: string;
  account_id?: number;
  amount: number;
  period?: string;
  start_date?: string;
  end_date?: string;
  goal_type?: string;
  description?: string;
}

export interface Tag {
  id: number;
  name: string;
}

export type AccountType =
  | "checking"
  | "savings"
  | "credit"
  | "investment"
  | "cash"
  | "other";

export interface CreateAccountRequest {
  name: string;
  type?: AccountType;
  currency?: string;
  institution?: string;
  metadata?: string;
}

export interface UpdateAccountRequest {
  name?: string;
  type?: AccountType;
  currency?: string;
  institution?: string;
  metadata?: string;
}

export interface CreateTransactionRequest {
  amount: number;
  currency: string;
  from_account_id?: number;
  to_account_id?: number;
  category?: string;
  description?: string;
  notes?: string;
}
