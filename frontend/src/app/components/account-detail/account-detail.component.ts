import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LedgerService } from '../../services/ledger.service';
import { Account, Pagination, Transaction, TransactionType } from '../../models/ledger.models';
import { describeApiError } from '../../utils/api-error';

/**
 * Shows an account's live balance, a form to add credit/debit transactions, and
 * paginated, filterable, latest-first transaction history.
 */
@Component({
  selector: 'app-account-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './account-detail.component.html',
})
export class AccountDetailComponent implements OnChanges {
  @Input() account: Account | null = null;
  /** Emitted after a balance-changing action so the parent can refresh lists. */
  @Output() balanceChanged = new EventEmitter<void>();

  balance = 0;

  // Add-transaction form
  txnType: TransactionType = 'credit';
  amount: number | null = null;
  referenceId = '';
  description = '';
  submitting = false;
  formError = '';
  formNotice = '';

  // History
  transactions: Transaction[] = [];
  pagination: Pagination | null = null;
  filterType: TransactionType | '' = '';
  page = 1;
  limit = 5;
  historyError = '';

  constructor(private ledger: LedgerService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['account'] && this.account) {
      this.page = 1;
      this.filterType = '';
      this.formError = '';
      this.formNotice = '';
      this.loadBalance();
      this.loadHistory();
    }
  }

  loadBalance(): void {
    if (!this.account) return;
    this.ledger.getBalance(this.account.id).subscribe({
      next: (b) => (this.balance = b.balance),
      error: (err) => (this.historyError = describeApiError(err)),
    });
  }

  loadHistory(): void {
    if (!this.account) return;
    this.historyError = '';
    this.ledger
      .getHistory(this.account.id, { type: this.filterType, page: this.page, limit: this.limit })
      .subscribe({
        next: (res) => {
          this.transactions = res.data;
          this.pagination = res.pagination;
        },
        error: (err) => (this.historyError = describeApiError(err)),
      });
  }

  applyFilter(type: TransactionType | ''): void {
    this.filterType = type;
    this.page = 1;
    this.loadHistory();
  }

  goToPage(page: number): void {
    if (!this.pagination) return;
    if (page < 1 || page > this.pagination.total_pages) return;
    this.page = page;
    this.loadHistory();
  }

  addTransaction(): void {
    if (!this.account) return;
    this.formError = '';
    this.formNotice = '';

    if (this.amount === null || this.amount <= 0) {
      this.formError = 'Amount must be greater than 0.';
      return;
    }
    if (!this.referenceId.trim()) {
      this.formError = 'Reference ID is required.';
      return;
    }

    this.submitting = true;
    this.ledger
      .addTransaction(this.account.id, {
        type: this.txnType,
        amount: this.amount,
        reference_id: this.referenceId.trim(),
        description: this.description.trim(),
      })
      .subscribe({
        next: (res) => {
          this.submitting = false;
          if (res.duplicate) {
            this.formNotice =
              res.message || 'A transaction with this reference_id already exists — nothing changed.';
          } else {
            this.formNotice = `${this.txnType === 'credit' ? 'Credited' : 'Debited'} ${this.amount}. New balance: ${res.account.balance}.`;
            this.amount = null;
            this.referenceId = '';
            this.description = '';
          }
          this.page = 1;
          this.loadBalance();
          this.loadHistory();
          this.balanceChanged.emit();
        },
        error: (err) => {
          this.submitting = false;
          this.formError = describeApiError(err);
        },
      });
  }
}
