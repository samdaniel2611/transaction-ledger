import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Account,
  AddTransactionResult,
  Balance,
  HistoryResponse,
  TransactionType,
  TransferResult,
} from '../models/ledger.models';

/**
 * Thin API service layer — the single place that knows how to talk to the
 * Transaction Ledger backend. Components depend only on this.
 */
@Injectable({ providedIn: 'root' })
export class LedgerService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  createAccount(name: string): Observable<Account> {
    return this.http
      .post<{ data: Account }>(`${this.baseUrl}/accounts`, { name })
      .pipe(map((r) => r.data));
  }

  listAccounts(): Observable<Account[]> {
    return this.http
      .get<{ data: Account[] }>(`${this.baseUrl}/accounts`)
      .pipe(map((r) => r.data));
  }

  getBalance(accountId: string): Observable<Balance> {
    return this.http
      .get<{ data: Balance }>(`${this.baseUrl}/accounts/${accountId}/balance`)
      .pipe(map((r) => r.data));
  }

  addTransaction(
    accountId: string,
    payload: {
      type: TransactionType;
      amount: number;
      reference_id: string;
      description?: string;
    }
  ): Observable<AddTransactionResult> {
    return this.http.post<AddTransactionResult>(
      `${this.baseUrl}/accounts/${accountId}/transactions`,
      payload
    );
  }

  getHistory(
    accountId: string,
    opts: { type?: TransactionType | ''; page: number; limit: number }
  ): Observable<HistoryResponse> {
    let params = new HttpParams()
      .set('page', String(opts.page))
      .set('limit', String(opts.limit));
    if (opts.type) {
      params = params.set('type', opts.type);
    }
    return this.http.get<HistoryResponse>(
      `${this.baseUrl}/accounts/${accountId}/transactions`,
      { params }
    );
  }

  transfer(payload: {
    from_account_id: string;
    to_account_id: string;
    amount: number;
    reference_id?: string;
    description?: string;
  }): Observable<TransferResult> {
    return this.http
      .post<{ data: TransferResult }>(`${this.baseUrl}/transfers`, payload)
      .pipe(map((r) => r.data));
  }
}
