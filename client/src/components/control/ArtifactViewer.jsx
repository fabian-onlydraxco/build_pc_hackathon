import { useEffect, useState } from 'react'
import { marked } from 'marked'

// Escape raw HTML tags before markdown parsing — artifact prose renders,
// markup inside it doesn't execute. The html format goes to a sandboxed iframe.
const renderMarkdown = (content) =>
  marked.parse(String(content || '').replace(/<(?=[a-zA-Z/!])/g, '&lt;'))

export default function ArtifactViewer({ artifact, onClose }) {
  const [full, setFull] = useState(false)

  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-veil" onClick={onClose}>
      <div className={`modal ${full ? 'modal--full' : ''}`} onClick={(event) => event.stopPropagation()}>
        <div className="modal__head">
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="modal__title">{artifact.title}</div>
            <div className="label">{artifact.chiefTitle}</div>
          </div>
          {artifact.format === 'html' && (
            <button className="btn btn--ghost btn--sm" onClick={() => setFull((value) => !value)}>
              {full ? 'Shrink' : 'Full size'}
            </button>
          )}
          <button className="inspector__close" onClick={onClose} aria-label="Close artifact">
            ×
          </button>
        </div>

        {artifact.format === 'html' ? (
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
