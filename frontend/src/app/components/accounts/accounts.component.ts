import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LedgerService } from '../../services/ledger.service';
import { Account } from '../../models/ledger.models';
import { describeApiError } from '../../utils/api-error';

/**
 * Create a new account and list existing accounts. Emits the selected account
 * to the parent so the detail panel can load it.
 */
@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './accounts.component.html',
})
export class AccountsComponent implements OnInit {
  @Input() selectedId: string | null = null;
  @Output() accountSelected = new EventEmitter<Account>();
  @Output() accountsChanged = new EventEmitter<Account[]>();

  accounts: Account[] = [];
  name = '';
  loading = false;
  error = '';
  success = '';

  constructor(private ledger: LedgerService) {}

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.ledger.listAccounts().subscribe({
      next: (accounts) => {
        this.accounts = accounts;
        this.accountsChanged.emit(accounts);
      },
      error: (err) => (this.error = describeApiError(err)),
    });
  }

  create(): void {
    this.error = '';
    this.success = '';
    const name = this.name.trim();
    if (!name) {
      this.error = 'Please enter an account holder name.';
      return;
    }
    this.loading = true;
    this.ledger.createAccount(name).subscribe({
      next: (account) => {
        this.loading = false;
        this.name = '';
        this.success = `Account "${account.name}" created.`;
        this.refresh();
        this.select(account);
      },
      error: (err) => {
        this.loading = false;
        this.error = describeApiError(err);
      },
    });
  }

  select(account: Account): void {
    this.accountSelected.emit(account);
  }
}
