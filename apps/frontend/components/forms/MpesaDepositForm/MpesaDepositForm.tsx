'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { uploadDepositScreenshot } from '@/lib/supabase/storage';

type Props = {
  onCreated?: () => void;
};

export default function MpesaDepositForm({ onCreated }: Props) {
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [mpesa, setMpesa] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setSuccess(null);
    if (!user) {
      setError('Please sign in.');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    setLoading(true);
    try {
      let screenshot_url: string | null = null;
      if (file) {
        screenshot_url = await uploadDepositScreenshot(user.id, file);
      }
      const { error: insertError } = await supabase.from('deposit_requests').insert({
        merchant_id: user.id,
        amount_kes: Number(amount),
        mpesa_code: mpesa || null,
        screenshot_url,
        status: 'pending',
      });
      if (insertError) throw insertError;
      setAmount('');
      setMpesa('');
      setFile(null);
      setSuccess('Deposit request submitted.');
      onCreated?.();
    } catch (err: any) {
      setError(err?.message || 'Failed to submit deposit.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-muted">Amount (KES)</label>
        <input
          className="mt-2 w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm"
          type="number"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="e.g. 25000"
        />
      </div>
      <div>
        <label className="text-xs text-muted">M-Pesa Code (optional)</label>
        <input
          className="mt-2 w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm"
          value={mpesa}
          onChange={(e) => setMpesa(e.target.value)}
          placeholder="QW9R8T2X"
        />
      </div>
      <div>
        <label className="text-xs text-muted">Screenshot (optional)</label>
        <input
          className="mt-2 w-full text-xs"
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
      </div>
      {error && <div className="text-xs text-red-400">{error}</div>}
      {success && <div className="text-xs text-green-400">{success}</div>}
      <button
        className="button-primary rounded-full px-4 py-2 text-xs"
        onClick={submit}
        disabled={loading}
      >
        {loading ? 'Submitting...' : 'Submit Deposit'}
      </button>
    </div>
  );
}
