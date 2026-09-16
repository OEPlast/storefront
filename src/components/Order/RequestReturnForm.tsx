'use client';

import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import * as Icon from '@phosphor-icons/react/dist/ssr';
import type { EnrichedOrder } from '@/types/order';
import { RETURN_REASON_LABELS, type ReturnReason } from '@/types/return';
import { useRequestReturn } from '@/hooks/mutations/useReturnMutations';
import { uploadImage } from '@/libs/uploadImage';
import { getCdnUrl } from '@/libs/cdn-url';

const MAX_PHOTOS = 4;

interface LineState {
  selected: boolean;
  qty: number;
  reason: ReturnReason | '';
  reasonDetails: string;
  images: string[];
  uploading: boolean;
}

interface RequestReturnFormProps {
  order: EnrichedOrder;
  /** Units already included in other returns on this order, keyed by product id. */
  alreadyReturned: Record<string, number>;
  onClose: () => void;
  onSubmitted: () => void;
}

/**
 * Whether an order can still be returned, and why not when it cannot. `windowDays` comes from
 * the store branding (Main-server config/storePolicies.ts), which also enforces it on submit.
 */
export function returnEligibility(order: EnrichedOrder, windowDays: number): { eligible: boolean; reason?: string } {
  if (order.status !== 'Completed') return { eligible: false, reason: 'Returns open once the order is delivered.' };
  if (!order.isPaid) return { eligible: false, reason: 'Only paid orders can be returned.' };
  const deliveredAt = order.deliveredAt ?? order.shipment?.deliveredOn;
  if (!deliveredAt) return { eligible: true };
  const closes = new Date(deliveredAt).getTime() + windowDays * 24 * 60 * 60 * 1000;
  if (Date.now() > closes) {
    return { eligible: false, reason: `The ${windowDays}-day return window closed on ${new Date(closes).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}.` };
  }
  return { eligible: true };
}

/**
 * Pick the items to send back, say why, add photos, submit. One request per order at a time;
 * quantities already in another return are not offered again.
 */
export default function RequestReturnForm({ order, alreadyReturned, onClose, onSubmitted }: RequestReturnFormProps) {
  const requestReturn = useRequestReturn();
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const returnableLines = useMemo(
    () =>
      order.products
        .map((p) => ({ ...p, remaining: p.quantity - (alreadyReturned[p._id] ?? 0) }))
        .filter((p) => p.remaining > 0),
    [order.products, alreadyReturned]
  );

  const [lines, setLines] = useState<Record<string, LineState>>(() =>
    Object.fromEntries(
      returnableLines.map((p) => [p._id, { selected: false, qty: 1, reason: '', reasonDetails: '', images: [], uploading: false }])
    )
  );

  const update = (productId: string, patch: Partial<LineState>) =>
    setLines((prev) => ({ ...prev, [productId]: { ...prev[productId], ...patch } }));

  const addPhotos = async (productId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const current = lines[productId];
    const room = MAX_PHOTOS - current.images.length;
    if (room <= 0) {
      toast.error(`Up to ${MAX_PHOTOS} photos per item`);
      return;
    }
    update(productId, { uploading: true });
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files).slice(0, room)) {
        const result = await uploadImage(file, 'return');
        uploaded.push(result.path);
      }
      update(productId, { images: [...current.images, ...uploaded], uploading: false });
    } catch (err) {
      update(productId, { uploading: false });
      toast.error((err as Error).message || 'Photo upload failed');
    }
  };

  const selected = returnableLines.filter((p) => lines[p._id]?.selected);
  const anyUploading = Object.values(lines).some((l) => l.uploading);

  const submit = async () => {
    setError(null);
    if (selected.length === 0) {
      setError('Select at least one item to return.');
      return;
    }
    const missingReason = selected.find((p) => !lines[p._id].reason);
    if (missingReason) {
      setError(`Choose a reason for ${missingReason.name}.`);
      return;
    }
    try {
      const result = await requestReturn.mutateAsync({
        orderId: order._id,
        type: 'refund',
        customerNotes: notes.trim() || undefined,
        items: selected.map((p) => {
          const line = lines[p._id];
          return {
            product: p._id,
            qty: line.qty,
            reason: line.reason as ReturnReason,
            reasonDetails: line.reasonDetails.trim() || undefined,
            images: line.images.length ? line.images : undefined,
          };
        }),
      });
      toast.success(result.message || 'Return request sent');
      onSubmitted();
    } catch (err) {
      setError((err as Error).message || 'Could not send the return request');
    }
  };

  if (returnableLines.length === 0) {
    return (
      <div className="rounded-xl border border-line p-6">
        <p className="text-secondary">Every item on this order is already in a return request.</p>
        <button type="button" onClick={onClose} className="button-main mt-4">Close</button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-line p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h6 className="heading6">Request a return</h6>
          <p className="mt-1 text-sm text-secondary">
            Choose the items, tell us what went wrong, and add photos if it helps. We reply within 1–2 business days;
            don&apos;t send anything back until we confirm where.
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="text-secondary hover:text-black">
          <Icon.X size={22} />
        </button>
      </div>

      <div className="mt-5 space-y-4">
        {returnableLines.map((p) => {
          const line = lines[p._id];
          return (
            <div key={p._id} className={`rounded-lg border p-4 ${line.selected ? 'border-black' : 'border-line'}`}>
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={line.selected}
                  onChange={(e) => update(p._id, { selected: e.target.checked })}
                  className="mt-1 h-4 w-4"
                />
                {p.image && <img src={getCdnUrl(p.image)} alt="" className="h-14 w-14 rounded-md object-cover" />}
                <div className="min-w-0 flex-1">
                  <div className="text-title font-medium">{p.name}</div>
                  <div className="caption1 text-secondary">
                    {p.attributes?.map((a) => `${a.name}: ${a.value}`).join(' · ')}
                    {p.remaining < p.quantity ? ` · ${p.remaining} of ${p.quantity} can still be returned` : ''}
                  </div>
                </div>
              </label>

              {line.selected && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="text-sm">
                    <span className="mb-1 block font-medium text-title">Quantity</span>
                    <select
                      value={line.qty}
                      onChange={(e) => update(p._id, { qty: Number(e.target.value) })}
                      className="w-full rounded-lg border border-line px-3 py-2"
                    >
                      {Array.from({ length: p.remaining }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block font-medium text-title">Reason</span>
                    <select
                      value={line.reason}
                      onChange={(e) => update(p._id, { reason: e.target.value as ReturnReason })}
                      className="w-full rounded-lg border border-line px-3 py-2"
                    >
                      <option value="">Choose a reason</option>
                      {(Object.keys(RETURN_REASON_LABELS) as ReturnReason[]).map((key) => (
                        <option key={key} value={key}>{RETURN_REASON_LABELS[key]}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm sm:col-span-2">
                    <span className="mb-1 block font-medium text-title">Details (optional)</span>
                    <textarea
                      value={line.reasonDetails}
                      onChange={(e) => update(p._id, { reasonDetails: e.target.value })}
                      maxLength={500}
                      rows={2}
                      placeholder="What exactly is wrong?"
                      className="w-full resize-none rounded-lg border border-line px-3 py-2"
                    />
                  </label>
                  <div className="text-sm sm:col-span-2">
                    <span className="mb-1 block font-medium text-title">Photos (optional, up to {MAX_PHOTOS})</span>
                    <div className="flex flex-wrap items-center gap-2">
                      {line.images.map((img) => (
                        <div key={img} className="relative">
                          <img src={getCdnUrl(img)} alt="" className="h-16 w-16 rounded-md border border-line object-cover" />
                          <button
                            type="button"
                            aria-label="Remove photo"
                            onClick={() => update(p._id, { images: line.images.filter((i) => i !== img) })}
                            className="absolute -right-1.5 -top-1.5 rounded-full bg-black p-0.5 text-white"
                          >
                            <Icon.X size={12} weight="bold" />
                          </button>
                        </div>
                      ))}
                      {line.images.length < MAX_PHOTOS && (
                        <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-md border border-dashed border-line text-secondary hover:border-black hover:text-black">
                          {line.uploading ? <Icon.CircleNotch className="animate-spin" size={20} /> : <Icon.Camera size={20} />}
                          <input type="file" accept="image/*" multiple className="hidden" disabled={line.uploading} onChange={(e) => addPhotos(p._id, e.target.files)} />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <label className="mt-4 block text-sm">
        <span className="mb-1 block font-medium text-title">Anything else we should know? (optional)</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={500}
          rows={2}
          className="w-full resize-none rounded-lg border border-line px-3 py-2"
        />
      </label>

      {error && <p className="mt-3 rounded-lg border border-red bg-red/10 px-3 py-2 text-sm text-red">{error}</p>}

      <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
        <button type="button" onClick={onClose} className="rounded-lg border border-line px-5 py-2.5 text-sm font-semibold">
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={requestReturn.isPending || anyUploading}
          className="button-main disabled:cursor-not-allowed disabled:opacity-50"
        >
          {requestReturn.isPending ? 'Sending…' : 'Send return request'}
        </button>
      </div>
    </div>
  );
}
