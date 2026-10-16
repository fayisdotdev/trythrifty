import { useState } from 'react'
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react'
import type { CartItem } from '../types'

type CartDrawerProps = {
  open: boolean
  items: CartItem[]
  whatsappNumber: string
  onClose: () => void
  onQuantity: (index: number, change: number) => void
  onRemove: (index: number) => void
  formatPrice: (value: number) => string
}

export default function CartDrawer({ open, items, whatsappNumber, onClose, onQuantity, onRemove, formatPrice }: CartDrawerProps) {
  const [number, setNumber] = useState(whatsappNumber)
  const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const count = items.reduce((sum, item) => sum + item.quantity, 0)

  function shareBag() {
    const destination = (whatsappNumber || number).replace(/\D/g, '')
    const lines = items.map(({ product, quantity, size, color }) =>
      `• ${product.name} — ${quantity} × ${formatPrice(product.price)}${size ? ` | Size: ${size}` : ''}${color ? ` | Colour: ${color}` : ''}`,
    )
    const text = `Hi! I'd like to enquire about these trythrifty finds:\n\n${lines.join('\n')}\n\nTotal: ${formatPrice(total)}`
    const url = `https://wa.me/${destination}?text=${encodeURIComponent(text)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <>
      {open && <button className="drawer-scrim" aria-label="Close bag" onClick={onClose} />}
      <aside className={`cart-drawer ${open ? 'is-open' : ''}`} aria-label="Shopping bag" aria-hidden={!open}>
        <div className="drawer-heading">
          <div><span className="eyebrow">YOUR GOOD FINDS</span><h2><ShoppingBag size={19} /> Your bag <small>{count}</small></h2></div>
          <button className="icon-button" aria-label="Close bag" onClick={onClose}><X size={19} /></button>
        </div>
        <div className="cart-items">
          {items.length === 0 ? <div className="empty-bag"><ShoppingBag size={32} /><h3>Your bag is waiting.</h3><p>When a piece catches your eye, it will be here.</p></div> : items.map((item, index) => (
            <article className="cart-item" key={`${item.product.id}-${item.size}-${item.color}`}>
              <img src={item.product.image_url} alt="" />
              <div className="cart-item-details">
                <h3>{item.product.name}</h3>
                <p>{[item.size, item.color].filter(Boolean).join(' · ')}</p>
                <strong>{formatPrice(item.product.price * item.quantity)}</strong>
                <div className="quantity-control">
                  <button aria-label="Decrease quantity" onClick={() => onQuantity(index, -1)}><Minus size={13} /></button>
                  <span>{item.quantity}</span>
                  <button aria-label="Increase quantity" onClick={() => onQuantity(index, 1)}><Plus size={13} /></button>
                  <button className="remove-item" aria-label="Remove item" onClick={() => onRemove(index)}><Trash2 size={14} /></button>
                </div>
              </div>
            </article>
          ))}
        </div>
        <div className="drawer-footer">
          <div className="subtotal-line"><span>Bag total</span><strong>{formatPrice(total)}</strong></div>
          <p className="muted">Shipping and availability confirmed with the seller.</p>
          {!whatsappNumber && items.length > 0 && <label className="whatsapp-field">Store WhatsApp number<input inputMode="tel" placeholder="91XXXXXXXXXX" value={number} onChange={(event) => setNumber(event.target.value)} /></label>}
          <button className="button button-whatsapp button-wide" disabled={items.length === 0 || !(whatsappNumber || number).replace(/\D/g, '')} onClick={shareBag}>
            Share bag on WhatsApp <span>↗</span>
          </button>
          <p className="fine-print">Your selected pieces, quantities and total will be included in the message.</p>
        </div>
      </aside>
    </>
  )
}
