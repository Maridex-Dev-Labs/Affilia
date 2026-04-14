export default async function VerifyReceipt({ params }: { params: Promise<{ receiptNumber: string }> }) {
  const { receiptNumber } = await params;
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-4xl font-bold">Receipt Verification</h1>
      <p className="text-muted mt-2">Receipt: {receiptNumber}</p>
    </div>
  );
}
