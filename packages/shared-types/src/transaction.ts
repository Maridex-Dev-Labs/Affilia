export interface TransactionSummary {
  id: string;
  amount_kes: number;
  status: 'pending' | 'approved' | 'paid';
}
