export default function VerifyReceipt({ params }: { params: { receiptNumber: string } }) {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-4xl font-bold">Receipt Verification</h1>
      <p className="text-muted mt-2">Receipt: {params.receiptNumber}</p>
    </div>
  );
}
