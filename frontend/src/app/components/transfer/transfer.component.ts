import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LedgerService } from '../../services/ledger.service';
import { Account } from '../../models/ledger.models';
import { describeApiError } from '../../utils/api-error';

/**
 * Money transfer form (bonus). Debit of source and credit of destination are
 * atomic on the backend — this component just surfaces the result/errors.
 */
@Component({
  selector: 'app-transfer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './transfer.component.html',
})
export class TransferComponent {
  @Input() accounts: Account[] = [];
  @Output() transferred = new EventEmitter<void>();

  fromId = '';
  toId = '';
  amount: number | null = null;
  referenceId = '';
  description = '';
  submitting = false;
  error = '';
  success = '';

  constructor(private ledger: LedgerService) {}

  submit(): void {
    this.error = '';
    this.success = '';

    if (!this.fromId || !this.toId) {
      this.error = 'Please choose both source and destination accounts.';
      return;
    }
    if (this.fromId === this.toId) {
      this.error = 'Source and destination accounts must be different.';
      return;
    }
    if (this.amount === null || this.amount <= 0) {
      this.error = 'Amount must be greater than 0.';
      return;
    }

    this.submitting = true;
    this.ledger
      .transfer({
        from_account_id: this.fromId,
        to_account_id: this.toId,
        amount: this.amount,
        reference_id: this.referenceId.trim() || undefined,
        description: this.description.trim() || undefined,
      })
      .subscribe({
        next: (res) => {
          this.submitting = false;
          this.success = `Transferred ${res.amount}. Source balance: ${res.from.balance}, destination balance: ${res.to.balance}.`;
          this.amount = null;
          this.referenceId = '';
          this.description = '';
          this.transferred.emit();
        },
        error: (err) => {
          this.submitting = false;
          this.error = describeApiError(err);
        },
      });
  }
}
