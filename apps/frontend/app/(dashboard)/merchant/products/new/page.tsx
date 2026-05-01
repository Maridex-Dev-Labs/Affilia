'use client';

import { ChangeEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileImage, FileVideo, ShieldCheck } from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import Button from '@/components/ui/Button';
import { sanitizeUserFacingError } from '@/lib/errors';
import { PRODUCT_MEDIA_GUIDELINES, toMediaPayload, validateProductFiles } from '@/lib/utils/product-media';
import { uploadProductMedia } from '@/lib/supabase/storage';

export default function Page() {
  const { user } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [commission, setCommission] = useState('10');
  const [category, setCategory] = useState('');
  const [stockStatus, setStockStatus] = useState('in_stock');
  const [files, setFiles] = useState<File[]>([]);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const fileSummary = useMemo(() => files.map((file) => ({ name: file.name, type: file.type })), [files]);

  const onFilesSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const chosen = Array.from(event.target.files || []);
    const validationError = validateProductFiles(chosen);
    if (validationError) {
      setError(validationError);
      return;
    }
    setFiles(chosen);
    setError('');
  };

  const create = async () => {
    if (!user) return;
    if (!title || !description || !price || !commission || !category) {
      setError('Fill in all required fields before submitting.');
      return;
    }
    if (!agreed) {
      setError('You must confirm the product media guidelines before submitting.');
      return;
    }
    const validationError = validateProductFiles(files);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError('');
    try {
      const uploads = await Promise.all(
        files.map(async (file) => ({
          url: await uploadProductMedia(user.id, file),
          type: file.type,
          name: file.name,
          size: file.size,
        })),
      );
      const media = toMediaPayload(uploads);
      const images = media.filter((item) => item.type === 'image').map((item) => item.url);
      const { error: insertError } = await supabase.from('products').insert({
        merchant_id: user.id,
        title,
        description,
        price_kes: Number(price),
        commission_percent: Number(commission),
        category,
        stock_status: stockStatus,
        images,
        media,
        is_active: false,
        moderation_status: 'pending',
        submitted_at: new Date().toISOString(),
      });
      if (insertError) throw insertError;
      router.push('/merchant/products');
    } catch (err: any) {
      setError(sanitizeUserFacingError(err, 'We could not submit the product for review right now.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black italic">Submit Product</h1>
        <p className="text-muted mt-2">Every new product is reviewed by admin before it appears in the marketplace.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="card-surface p-6 space-y-4">
          <input className="input-shell" placeholder="Product title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea className="input-shell min-h-[140px]" placeholder="Describe the product, ideal buyer, and what makes it sell." value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="grid gap-4 sm:grid-cols-2">
            <input className="input-shell" placeholder="Price (KES)" value={price} onChange={(e) => setPrice(e.target.value)} />
            <input className="input-shell" placeholder="Commission %" value={commission} onChange={(e) => setCommission(e.target.value)} />
            <input className="input-shell" placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} />
            <select className="input-shell" value={stockStatus} onChange={(e) => setStockStatus(e.target.value)}>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="out">Out of Stock</option>
            </select>
          </div>
          <label className="block rounded-3xl border border-dashed border-white/12 bg-black/20 p-6 text-center">
            <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={onFilesSelected} />
            <div className="flex justify-center gap-3 text-[#9ca5b9]">
              <FileImage size={24} />
              <FileVideo size={24} />
            </div>
            <div className="mt-3 text-sm font-bold text-white">Upload product images or videos</div>
            <div className="text-xs text-[#9ca5b9] mt-2">PNG, JPG, WEBP, MP4, MOV, WEBM</div>
          </label>
          {fileSummary.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {fileSummary.map((file) => (
                <div key={file.name} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-sm text-white">
                  <div className="font-bold">{file.name}</div>
                  <div className="text-xs text-[#8f98ab]">{file.type.startsWith('video/') ? 'Video asset' : 'Image asset'}</div>
                </div>
              ))}
            </div>
          ) : null}
          <label className="flex items-start gap-3 rounded-2xl border border-white/8 bg-black/20 p-4 text-sm text-[#c0c7d6]">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1" />
            <span>I confirm these media assets meet the marketplace guidelines and are ready for admin review.</span>
          </label>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <Button loading={saving} loadingText="Submitting for review..." onClick={create} className="w-full justify-center">
            Submit Product For Approval
          </Button>
        </div>

        <div className="card-surface p-6">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.24em] text-[#7e869a]">
            <ShieldCheck size={18} className="text-[#009A44]" /> Review rules
          </div>
          <div className="mt-5 space-y-3">
            {PRODUCT_MEDIA_GUIDELINES.map((guideline) => (
              <div key={guideline} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-sm text-[#d0d6e2]">
                {guideline}
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-2xl border border-[#BB0000]/15 bg-[#BB0000]/8 p-4 text-sm text-[#f0c5c5]">
            If you edit an approved listing later, it will return to the pending review queue until admin approves it again.
          </div>
        </div>
      </div>
    </div>
  );
}
