from app.db.supabase import insert, select, update
from app.services.receipt_service import create_official_receipt
from app.utils.helpers import utcnow_iso


def preview_pending_payouts() -> dict[str, object]:
    items = select('payouts', {'status': 'eq.pending', 'select': '*', 'order': 'created_at.desc'})
    total = sum(float(item.get('amount_kes') or 0) for item in items)
    return {'items': items, 'total': total, 'recipients': len(items)}


def confirm_pending_payouts() -> dict[str, object]:
    preview = preview_pending_payouts()
    batch = insert('sweep_batches', {
        'total_kes': preview['total'],
        'recipients': preview['recipients'],
        'status': 'completed',
        'confirmed_at': utcnow_iso(),
    })
    paid_at = utcnow_iso()
    for item in preview['items']:
        update('payouts', {'status': 'paid', 'paid_at': paid_at}, {'id': f"eq.{item['id']}"})
        create_official_receipt(
            receipt_type='payout',
            recipient_id=item['affiliate_id'],
            amount_kes=float(item.get('amount_kes') or 0),
            mpesa_reference=f"PAYOUT-{str(item['id'])[:8].upper()}",
        )
    return {'batch': batch[0] if isinstance(batch, list) and batch else None, **preview}
