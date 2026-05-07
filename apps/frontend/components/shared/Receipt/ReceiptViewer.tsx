// @ts-nocheck
'use client';

import { PDFViewer } from '@react-pdf/renderer';
import ReceiptPDF from './ReceiptPDF';

export type ReceiptViewerData = {
  receipt_number: string;
  recipient: string;
  amount_kes: number;
  mpesa_reference?: string | null;
  generated_at: string;
  receipt_type?: string;
  verification_hash?: string;
};

export default function ReceiptViewer({ receipt }: { receipt: ReceiptViewerData }) {
  return (
    <div className="h-[760px] w-full overflow-hidden rounded-[28px] border border-white/10 bg-[#0f1420]">
      <PDFViewer width="100%" height="100%">
        <ReceiptPDF
          receiptNumber={receipt.receipt_number}
          recipient={receipt.recipient}
          amount={`KES ${Number(receipt.amount_kes || 0).toLocaleString()}`}
          reference={receipt.mpesa_reference || '—'}
          generatedAt={new Date(receipt.generated_at).toLocaleString('en-KE')}
          receiptType={receipt.receipt_type}
          verificationHash={receipt.verification_hash}
        />
      </PDFViewer>
    </div>
  );
}
