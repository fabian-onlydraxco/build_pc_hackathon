import { useEffect, useState } from 'react'
import { marked } from 'marked'

// Escape raw HTML tags before markdown parsing — artifact prose renders,
// markup inside it doesn't execute. The html format goes to a sandboxed iframe.
const renderMarkdown = (content) =>
  marked.parse(String(content || '').replace(/<(?=[a-zA-Z/!])/g, '&lt;'))

// Trust the declared format, but also recognize a webpage when a chief ships
// one without labeling it (models sometimes do).
const looksLikeHtml = (artifact) =>
  artifact.format === 'html' || /^\s*(<!doctype|<html)/i.test(artifact.content || '')

const slug = (title) =>
  String(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'artifact'

export default function ArtifactViewer({ artifact, onClose }) {
  const [full, setFull] = useState(false)
  const isHtml = looksLikeHtml(artifact)

  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const download = () => {
    const blob = new Blob([artifact.content], { type: isHtml ? 'text/html' : 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${slug(artifact.title)}.${isHtml ? 'html' : 'md'}`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }

  const openInTab = () => {
    const blob = new Blob([artifact.content], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  return (
    <div className="modal-veil" onClick={onClose}>
      <div className={`modal ${full ? 'modal--full' : ''}`} onClick={(event) => event.stopPropagation()}>
        <div className="modal__head">
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="modal__title">{artifact.title}</div>
            <div className="label">{artifact.chiefTitle}</div>
          </div>
          {isHtml && (
            <button className="btn btn--ghost btn--sm" onClick={openInTab}>
              Open in tab
            </button>
          )}
          <button className="btn btn--ghost btn--sm" onClick={download}>
            Download
          </button>
          {isHtml && (
            <button className="btn btn--ghost btn--sm" onClick={() => setFull((value) => !value)}>
              {full ? 'Shrink' : 'Full size'}
            </button>
          )}
          <button className="inspector__close" onClick={onClose} aria-label="Close artifact">
            ×
          </button>
        </div>

        {isHtml ? (
          <iframe className="modal__frame" title={artifact.title} sandbox="" srcDoc={artifact.content} />
        ) : (
          <div className="modal__body">
            <div className="md" dangerouslySetInnerHTML={{ __html: renderMarkdown(artifact.content) }} />
          </div>
        )}
      </div>
    </div>
  )
}
