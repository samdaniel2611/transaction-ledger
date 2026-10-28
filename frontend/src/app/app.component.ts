import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccountsComponent } from './components/accounts/accounts.component';
import { AccountDetailComponent } from './components/account-detail/account-detail.component';
import { TransferComponent } from './components/transfer/transfer.component';
import { Account } from './models/ledger.models';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, AccountsComponent, AccountDetailComponent, TransferComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  @ViewChild(AccountsComponent) accountsCmp!: AccountsComponent;

  selected: Account | null = null;
  accounts: Account[] = [];

  onSelected(account: Account): void {
    this.selected = account;
  }

  onAccountsChanged(accounts: Account[]): void {
    this.accounts = accounts;
    // Keep the selected account's cached balance/name in sync with the list.
    if (this.selected) {
      const match = accounts.find((a) => a.id === this.selected!.id);
      if (match) this.selected = { ...match };
    }
  }

  /** Refresh the account list (and derived balances) after any mutation. */
  refreshAll(): void {
    this.accountsCmp?.refresh();
  }
}
