import { ArrowDown, ArrowUp, Check, Trash2 } from 'lucide-react'
import { publicAssetUrl } from '../lib/catalog'

type PhotoListEditorProps = {
  photos: string[]
  label: string
  onChange: (photos: string[]) => void
}

export default function PhotoListEditor({ photos, label, onChange }: PhotoListEditorProps) {
  function movePhoto(from: number, to: number) {
    if (to < 0 || to >= photos.length) return
    const reordered = [...photos]
    const [photo] = reordered.splice(from, 1)
    reordered.splice(to, 0, photo)
    onChange(reordered)
  }

  return <div className="image-preview-list">
    {photos.map((photo, index) => <div
      className="image-preview-item"
      key={`${photo}-${index}`}
      draggable
      onDragStart={(event) => event.dataTransfer.setData('text/plain', String(index))}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault()
        const from = Number(event.dataTransfer.getData('text/plain'))
        if (Number.isInteger(from)) movePhoto(from, index)
      }}
    >
      <img className="admin-image-preview" src={publicAssetUrl(photo)} alt={`${label} ${index + 1}`} />
      <div className="photo-controls">
        {index === 0
          ? <span className="photo-cover"><Check size={12} /> Cover</span>
          : <button type="button" className="icon-button" title="Set as cover" onClick={() => movePhoto(index, 0)}>Set cover</button>}
        <button type="button" className="icon-button" aria-label="Move photo earlier" disabled={index === 0} onClick={() => movePhoto(index, index - 1)}><ArrowUp size={13} /></button>
        <button type="button" className="icon-button" aria-label="Move photo later" disabled={index === photos.length - 1} onClick={() => movePhoto(index, index + 1)}><ArrowDown size={13} /></button>
        <button type="button" className="icon-button danger-button" aria-label={`Remove ${label}`} onClick={() => onChange(photos.filter((_, photoIndex) => photoIndex !== index))}><Trash2 size={13} /></button>
      </div>
    </div>)}
  </div>
}
