'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowClockwise, ClockCounterClockwise, FileImage, FileVideo } from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase/client';
import Button, { SecondaryButton } from '@/components/ui/Button';
import { sanitizeUserFacingError } from '@/lib/errors';
import { merchantApi } from '@/lib/api/merchant';
import { PRODUCT_MEDIA_GUIDELINES, getPrimaryMediaUrl, toMediaPayload, validateProductFiles } from '@/lib/utils/product-media';
import { uploadProductMedia } from '@/lib/supabase/storage';
import { useAuth } from '@/lib/hooks/useAuth';

export default function Page() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const [product, setProduct] = useState<any>(null);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saleForm, setSaleForm] = useState({
    affiliate_code: '',
    sale_amount_kes: '',
    quantity: '1',
    customer_reference: '',
    notes: '',
  });
  const [saleStatus, setSaleStatus] = useState<string | null>(null);
  const [submittingSale, setSubmittingSale] = useState(false);

  useEffect(() => {
    supabase.from('products').select('*').eq('id', params.id).single().then(({ data }) => setProduct(data));
  }, [params.id]);

  const previewUrl = useMemo(() => getPrimaryMediaUrl(product), [product]);

  const onFilesSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const chosen = Array.from(event.target.files || []);
    const validationError = validateProductFiles(chosen);
    if (validationError) {
      setError(validationError);
      return;
    }
    setNewFiles(chosen);
    setError('');
  };

  const save = async () => {
    if (!product || !user) return;
    setSaving(true);
    setError('');
    try {
      let media = Array.isArray(product.media) ? [...product.media] : [];
      if (newFiles.length > 0) {
        const validationError = validateProductFiles(newFiles);
        if (validationError) throw new Error(validationError);
        const uploads = await Promise.all(
          newFiles.map(async (file) => ({
            url: await uploadProductMedia(user.id, file),
            type: file.type,
            name: file.name,
            size: file.size,
          })),
        );
        media = [...media, ...toMediaPayload(uploads)].slice(0, 6);
      }
      const images = media.filter((item: any) => item.type === 'image').map((item: any) => item.url);
      const { error: updateError } = await supabase
        .from('products')
        .update({
          title: product.title,
          description: product.description,
          price_kes: Number(product.price_kes),
          commission_percent: Number(product.commission_percent),
          category: product.category,
          stock_status: product.stock_status,
          media,
          images,
          is_active: false,
          moderation_status: 'pending',
          moderation_notes: null,
          approved_at: null,
          approved_by: null,
          rejected_at: null,
          submitted_at: new Date().toISOString(),
        })
        .eq('id', params.id);
      if (updateError) throw updateError;
      router.push('/merchant/products');
    } catch (err: any) {
      setError(sanitizeUserFacingError(err, 'We could not update the product right now.'));
    } finally {
      setSaving(false);
    }
  };

  const submitManualSale = async () => {
    if (!product) return;
    setSubmittingSale(true);
    setSaleStatus(null);
    try {
      const response = await merchantApi.recordAffiliateSale(product.id, {
        product_id: product.id,
        affiliate_code: saleForm.affiliate_code,
        sale_amount_kes: Number(saleForm.sale_amount_kes),
        quantity: Number(saleForm.quantity || '1'),
        customer_reference: saleForm.customer_reference,
        notes: saleForm.notes || null,
      });
      setSaleStatus(`Sale submitted for review. KES ${response.commission_kes} has been reserved from escrow for ${response.affiliate_name}.`);
      setSaleForm({
        affiliate_code: '',
        sale_amount_kes: '',
        quantity: '1',
        customer_reference: '',
        notes: '',
      });
    } catch (err: any) {
      setSaleStatus(sanitizeUserFacingError(err, 'We could not submit the affiliate sale right now.'));
    } finally {
      setSubmittingSale(false);
    }
  };

  if (!product) return <div className="text-muted">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black italic">Edit Product</h1>
          <p className="text-muted mt-2">Any updated listing returns to the admin review queue before it goes live again.</p>
        </div>
        <div className="rounded-full border border-white/8 bg-black/30 px-4 py-2 text-sm font-bold capitalize text-white">
          Status: {product.moderation_status || 'pending'}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="card-surface p-6 space-y-4">
          <input className="input-shell" value={product.title || ''} onChange={(e) => setProduct({ ...product, title: e.target.value })} />
          <textarea className="input-shell min-h-[140px]" value={product.description || ''} onChange={(e) => setProduct({ ...product, description: e.target.value })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <input className="input-shell" value={product.price_kes || ''} onChange={(e) => setProduct({ ...product, price_kes: e.target.value })} />
            <input className="input-shell" value={product.commission_percent || ''} onChange={(e) => setProduct({ ...product, commission_percent: e.target.value })} />
            <input className="input-shell" value={product.category || ''} onChange={(e) => setProduct({ ...product, category: e.target.value })} />
            <select className="input-shell" value={product.stock_status || 'in_stock'} onChange={(e) => setProduct({ ...product, stock_status: e.target.value })}>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="out">Out of Stock</option>
            </select>
          </div>
          <label className="block rounded-3xl border border-dashed border-white/12 bg-black/20 p-6 text-center">
            <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={onFilesSelected} />
            <div className="flex justify-center gap-3 text-[#9ca5b9]"><FileImage size={24} /><FileVideo size={24} /></div>
            <div className="mt-3 text-sm font-bold text-white">Add new media assets</div>
          </label>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <div className="flex flex-wrap gap-3">
            <Button loading={saving} loadingText="Resubmitting..." onClick={save}>Save And Resubmit</Button>
            <SecondaryButton href="/merchant/products">Back to products</SecondaryButton>
          </div>
        </div>

        <div className="card-surface p-6 space-y-4">
          <div className="rounded-3xl border border-white/8 bg-black/20 p-4">
            {previewUrl ? (
              product.media?.[0]?.type === 'video' ? (
                <video src={previewUrl} controls className="h-56 w-full rounded-2xl object-cover" />
              ) : (
                <img src={previewUrl} alt={product.title} className="h-56 w-full rounded-2xl object-cover" />
              )
            ) : (
              <div className="flex h-56 items-center justify-center rounded-2xl bg-white/5 text-[#9ca5b9]">No primary media yet</div>
            )}
          </div>
          <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm text-[#d0d6e2]">
            <div className="mb-3 flex items-center gap-2 font-bold text-white"><ClockCounterClockwise size={18} /> Review notes</div>
            <p>{product.moderation_notes || 'No admin notes yet. Keep assets clean and product-focused.'}</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm text-[#d0d6e2]">
            <div className="mb-3 flex items-center gap-2 font-bold text-white"><ArrowClockwise size={18} /> Media guidelines</div>
            <ul className="space-y-2">
              {PRODUCT_MEDIA_GUIDELINES.map((guideline) => (
                <li key={guideline}>{guideline}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm text-[#d0d6e2] space-y-4">
            <div>
              <div className="mb-2 font-bold text-white">Record Affiliate Sale</div>
              <p className="text-sm text-[#9ca5b9]">
                Use the affiliate code shared from My Links. Affilia reserves the commission from escrow immediately and sends the sale to admin review before payout.
              </p>
            </div>
            <input className="input-shell" placeholder="Affiliate / Promo code" value={saleForm.affiliate_code} onChange={(e) => setSaleForm((current) => ({ ...current, affiliate_code: e.target.value.toUpperCase() }))} />
            <div className="grid gap-3 sm:grid-cols-2">
              <input className="input-shell" placeholder="Sale amount (KES)" value={saleForm.sale_amount_kes} onChange={(e) => setSaleForm((current) => ({ ...current, sale_amount_kes: e.target.value }))} />
              <input className="input-shell" placeholder="Quantity" value={saleForm.quantity} onChange={(e) => setSaleForm((current) => ({ ...current, quantity: e.target.value }))} />
            </div>
            <input className="input-shell" placeholder="Customer / Order reference" value={saleForm.customer_reference} onChange={(e) => setSaleForm((current) => ({ ...current, customer_reference: e.target.value }))} />
            <textarea className="input-shell min-h-[110px]" placeholder="Notes for admin review (optional)" value={saleForm.notes} onChange={(e) => setSaleForm((current) => ({ ...current, notes: e.target.value }))} />
            {saleStatus ? <div className="rounded-2xl border border-white/8 bg-black/30 px-4 py-3 text-sm text-[#d4dbe7]">{saleStatus}</div> : null}
            <Button loading={submittingSale} loadingText="Submitting sale..." onClick={submitManualSale}>
              Submit Affiliate Sale
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
