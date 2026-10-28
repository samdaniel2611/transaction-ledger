export type TransactionType = 'credit' | 'debit';

export interface Account {
  id: string;
  name: string;
  balance: number;
  created_at: string;
}

export interface Balance {
  account_id: string;
  balance: number;
}

export interface Transaction {
  id: string;
  account_id: string;
  type: TransactionType;
  amount: number;
  description: string;
  reference_id: string;
  balance_after: number;
  created_at: string;
}

export interface Pagination {
  page: number;
  limit: number;
  page_size: number;
  total_records: number;
  total_pages: number;
}

export interface HistoryResponse {
  data: Transaction[];
  pagination: Pagination;
}

export interface AddTransactionResult {
  data: Transaction;
  account: { id: string; balance: number };
  duplicate: boolean;
  message?: string;
}

export interface TransferResult {
  reference_id: string;
  amount: number;
  from: { account_id: string; balance: number; transaction: Transaction };
  to: { account_id: string; balance: number; transaction: Transaction };
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }> | unknown;
  };
}
