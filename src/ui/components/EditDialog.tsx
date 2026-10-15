import { useEffect, useRef } from 'react';
import type { HypothesisItem } from '../../questions/generators';
import type { AppApi } from '../useApp';
import { QuestionForm } from './QuestionForm';

/** Permite volver atrás y corregir cualquier respuesta. Todo el análisis se recalcula desde cero. */
export function EditDialog({ app, questionId, onClose }: { app: AppApi; questionId: string; onClose: () => void }) {
  const rec = app.state!.answers[questionId];
  const stored = (rec?.value as { items?: HypothesisItem[] } | undefined)?.items;
  const q = app.step!.ctx.registry.get(questionId, stored);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  if (!rec || !q) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal panel" role="dialog" aria-modal="true" aria-label="Corregir respuesta" ref={ref}>
        <p className="eyebrow" style={{ marginBottom: 12 }}>Corregir respuesta · las conclusiones se recalculan</p>
        <QuestionForm
          key={questionId}
          question={q}
          initial={rec.skipped ? undefined : rec.value}
          hypotheses={stored}
          submitLabel="Guardar corrección"
          onSubmit={(v) => { app.editAnswer(questionId, v); onClose(); }}
          onSkip={q.optional ? () => { app.editAnswer(questionId, null, true); onClose(); } : undefined}
          onCancel={onClose}
        />
      </div>
    </div>
  );
}
