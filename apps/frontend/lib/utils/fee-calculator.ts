import { fees } from '../config/fees';

export function platformFee(amount: number) {
  return amount * fees.platformCommission;
}
