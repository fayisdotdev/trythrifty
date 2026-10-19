import { useState, type FormEvent } from 'react'
import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from 'lucide-react'
import type { ProductFieldDefinition, ProductFieldType, ProductType } from '../types'

type ProductTypesPanelProps = {
  productTypes: ProductType[]
  productCounts: Record<string, number>
  onSave: (productType: ProductType) => Promise<void>
  onDelete: (typeId: string) => Promise<void>
}

type FieldDraft = ProductFieldDefinition

function keyFromLabel(label: string): string {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

export default function ProductTypesPanel({ productTypes, productCounts, onSave, onDelete }: ProductTypesPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [fields, setFields] = useState<FieldDraft[]>([])
  const [newFieldLabel, setNewFieldLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  function beginEdit(productType: ProductType) {
    setEditingId(productType.id)
    setName(productType.name)
    setFields(productType.fields.map((field) => ({ ...field })))
    setError('')
    setSuccess('')
  }

  function reset() {
    setEditingId(null)
    setName('')
    setFields([])
    setNewFieldLabel('')
  }

  function addField() {
    const label = newFieldLabel.trim()
    if (!label) return
    const baseKey = keyFromLabel(label)
    if (!baseKey) {
      setError('Use at least one English letter or number in the field label to generate its key.')
      return
    }
    let key = baseKey
    let suffix = 2
    while (fields.some((field) => field.key === key)) key = `${baseKey}_${suffix++}`
    setFields((current) => [...current, { key, label, type: 'text', required: false }])
    setNewFieldLabel('')
  }

  function updateField(index: number, changes: Partial<FieldDraft>) {
    setFields((current) => current.map((field, fieldIndex) => fieldIndex === index ? { ...field, ...changes } : field))
  }

  function moveField(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= fields.length) return
    setFields((current) => {
      const reordered = [...current]
      ;[reordered[index], reordered[target]] = [reordered[target], reordered[index]]
      return reordered
    })
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim()) {
      setError('Enter a product type name.')
      return
    }
    const productType = productTypes.find((type) => type.id === editingId)
    const hasProducts = Boolean(editingId && productCounts[editingId])
    if (hasProducts && productType) {
      const originalKeys = productType.fields.map((field) => field.key)
      const nextKeys = fields.map((field) => field.key)
      if (originalKeys.some((key) => !nextKeys.includes(key))) {
        setError('Fields used by products cannot be deleted. Hide the field instead.')
        return
      }
    }
    if (fields.some((field) => !field.label.trim() || !field.key)) {
      setError('Every field needs a label.')
      return
    }
    if (fields.some((field) => field.type === 'select' && !(field.options ?? []).some((option) => option.trim()))) {
      setError('Select fields need at least one option.')
      return
    }
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      await onSave({
        id: editingId ?? crypto.randomUUID(),
        name: name.trim(),
        fields: fields.map((field) => ({
          ...field,
          label: field.label.trim(),
          options: field.type === 'select' ? (field.options ?? []).filter((option) => option.trim()) : undefined,
          unit: field.unit?.trim() || undefined,
        })),
      })
      setSuccess(editingId ? 'Product type updated.' : 'Product type created.')
      reset()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save product type.')
    } finally {
      setBusy(false)
    }
  }

  async function removeType(productType: ProductType) {
    if (productCounts[productType.id]) return
    if (!window.confirm(`Delete the "${productType.name}" product type?`)) return
    setError('')
    setSuccess('')
    try {
      await onDelete(productType.id)
      if (editingId === productType.id) reset()
      setSuccess('Product type deleted.')
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not delete product type.')
    }
  }

  const activeType = productTypes.find((productType) => productType.id === editingId)
  const locked = Boolean(activeType && productCounts[activeType.id])

  return (
    <>
      <div className="admin-title-row">
        <div><span className="eyebrow">CATALOG STRUCTURE</span><h1>Product Types</h1><p className="muted">Define the fields shown for each kind of product.</p></div>
      </div>
      {error && <div className="admin-alert error" role="alert">{error}</div>}
      {success && <div className="admin-alert success" role="status">{success}</div>}
      <div className="admin-grid">
        <form className="admin-card stack-form" onSubmit={(event) => void submit(event)}>
          <div className="card-title"><h2>{editingId ? `Edit ${activeType?.name ?? 'type'}` : 'Create a type'}</h2></div>
          <label>Type name<input required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} /></label>
          <div className="product-type-fields">
            {fields.map((field, index) => (
              <fieldset className="product-type-field" key={`${field.key}-${index}`}>
                <legend>{field.label || field.key}</legend>
                <div className="form-row">
                  <label>Field label<input required value={field.label} onChange={(event) => updateField(index, { label: event.target.value })} /></label>
                  <label>Key<input value={field.key} readOnly aria-label={`${field.label} key`} /></label>
                </div>
                <div className="form-row">
                  <label>Field type<select disabled={locked} value={field.type} onChange={(event) => updateField(index, { type: event.target.value as ProductFieldType, options: event.target.value === 'select' ? field.options ?? [''] : undefined })}>
                    {(['text', 'number', 'boolean', 'select', 'color'] as ProductFieldType[]).map((type) => <option key={type} value={type}>{type}</option>)}
                  </select></label>
                  <label>Unit (optional)<input disabled={locked} value={field.unit ?? ''} onChange={(event) => updateField(index, { unit: event.target.value })} /></label>
                </div>
                {field.type === 'select' && <label>Options <span className="label-hint">one option per line</span><textarea disabled={locked} rows={3} value={(field.options ?? []).join('\n')} onChange={(event) => updateField(index, { options: event.target.value.split('\n') })} /></label>}
                <div className="field-controls">
                  <label className="inline-toggle"><input type="checkbox" disabled={locked} checked={field.required} onChange={(event) => updateField(index, { required: event.target.checked })} /> Required</label>
                  <label className="inline-toggle"><input type="checkbox" checked={Boolean(field.hidden)} onChange={(event) => updateField(index, { hidden: event.target.checked })} /> Hidden</label>
                  <button type="button" className="icon-button" aria-label="Move field up" disabled={index === 0} onClick={() => moveField(index, -1)}><ArrowUp size={14} /></button>
                  <button type="button" className="icon-button" aria-label="Move field down" disabled={index === fields.length - 1} onClick={() => moveField(index, 1)}><ArrowDown size={14} /></button>
                  <button type="button" className="icon-button danger-button" aria-label={`Remove ${field.label}`} disabled={locked} onClick={() => setFields((current) => current.filter((_, fieldIndex) => fieldIndex !== index))}><Trash2 size={14} /></button>
                </div>
              </fieldset>
            ))}
          </div>
          <div className="form-row">
            <label>New field label<input value={newFieldLabel} onChange={(event) => setNewFieldLabel(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addField() } }} /></label>
            <button type="button" className="button button-quiet" disabled={!newFieldLabel.trim()} onClick={addField}><Plus size={15} /> Add field</button>
          </div>
          {locked && <p className="muted">This type has products. Field keys and validation structure are locked; labels and visibility may still change.</p>}
          <div className="form-actions">
            <button className="button button-primary" disabled={busy}>{busy ? 'Saving…' : <><Save size={15} /> {editingId ? 'Save type' : 'Create type'}</>}</button>
            {editingId && <button type="button" className="button button-quiet" onClick={reset}>Cancel</button>}
          </div>
        </form>
        <section className="admin-card inventory-card">
          <div className="card-title"><h2>Existing types</h2><span>{productTypes.length}</span></div>
          <div className="product-type-list">
            {productTypes.map((productType) => {
              const count = productCounts[productType.id] ?? 0
              return <article className="product-type-row" key={productType.id}>
                <div><strong>{productType.name}</strong><span>{count} products · {productType.fields.length} fields</span></div>
                <button type="button" className="icon-button" onClick={() => beginEdit(productType)}>Edit</button>
                <button type="button" className="icon-button danger-button" disabled={Boolean(count)} title={count ? 'A type with products cannot be deleted' : 'Delete type'} onClick={() => void removeType(productType)}><Trash2 size={14} /></button>
              </article>
            })}
          </div>
        </section>
      </div>
    </>
  )
}
