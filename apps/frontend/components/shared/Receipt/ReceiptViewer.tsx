'use client';

import { PDFViewer } from '@react-pdf/renderer';
import ReceiptPDF from './ReceiptPDF';

export default function ReceiptViewer() {
  return (
    <div className="w-full h-[600px] border border-soft rounded-2xl overflow-hidden">
      <PDFViewer width="100%" height="100%">
        <ReceiptPDF
          receiptNumber="AFF-2026-0001"
          recipient="Jane Mwangi"
          amount="KES 12,450"
          reference="QW9R8T2X"
        />
      </PDFViewer>
    </div>
  );
}
