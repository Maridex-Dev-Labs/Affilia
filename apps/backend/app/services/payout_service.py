from app.db.supabase import insert, select, update
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
    for item in preview['items']:
        update('payouts', {'status': 'paid', 'paid_at': utcnow_iso()}, {'id': f"eq.{item['id']}"})
    return {'batch': batch[0] if isinstance(batch, list) and batch else None, **preview}
