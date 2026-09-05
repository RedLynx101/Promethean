import { useEffect, useRef, type ReactNode } from 'react';
import { X, ArrowUpRight, AlertCircle, LoaderCircle, ChevronRight, Flame } from 'lucide-react';
import type { Archetype, Evidence, Provenance } from '@promethean/core';

export const names: Record<Archetype, string> = {
  manual: 'Human process',
  rules: 'Deterministic',
  'model-task': 'Model task',
  assistant: 'Assistant',
  'ai-workflow': 'AI workflow',
  'tool-agent': 'Tool agent',
  'multi-agent': 'Multi-agent',
};
export const levels: Record<Archetype, string> = {
  manual: 'H',
  rules: 'L0',
  'model-task': 'L1',
  assistant: 'L2',
  'ai-workflow': 'L3',
  'tool-agent': 'L4',
  'multi-agent': 'L5',
};
export const money = (value: number) =>
  value === 0 ? '$0.00' : value < 0.01 ? `$${value.toFixed(4)}` : `$${value.toFixed(2)}`;
export const duration = (ms: number) =>
  ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`;
export function relativeDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
export function Torch({ small = false }: { small?: boolean }) {
  return (
    <svg
      className={small ? 'torch small' : 'torch'}
      viewBox="0 0 36 48"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M18 2C20 11 30 13 27 23C26 29 20 32 14 29C6 25 7 17 13 11C12 18 17 19 18 2Z"
        fill="currentColor"
      />
      <path
        d="M12 34H25M14 38H23M16 42H21M18.5 38V47"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
export function Status({ value }: { value: string }) {
  return (
    <span className={`status status-${value}`}>
      <span />
      {value.replaceAll('-', ' ')}
    </span>
  );
}
export function Level({ archetype }: { archetype: Archetype }) {
  return (
    <span className={`level level-${archetype}`} title={names[archetype]}>
      {levels[archetype]}
    </span>
  );
}
export function Empty({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <Flame size={28} strokeWidth={1.2} />
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function Loading({ children = 'Opening your workspace…' }: { children?: ReactNode }) {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" size={22} />
      {children}
    </div>
  );
}
export function ErrorMessage({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="error-message" role="alert">
      <AlertCircle size={18} />
      <span>{message}</span>
      {retry && <button onClick={retry}>Try again</button>}
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    return () => {
      dialog?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? 'wide' : ''}`}
      aria-label={title}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-header">
        <h2>{title}</h2>
        <button className="icon-button" onClick={onClose} aria-label="Close dialog">
          <X size={20} />
        </button>
      </div>
      <div className="modal-body">{children}</div>
    </dialog>
  );
}
export function ProvenancePanel({
  provenance,
  evidence,
  onEvidence,
}: {
  provenance: Provenance;
  evidence: Evidence[];
  onEvidence?: (item: Evidence) => void;
}) {
  return (
    <div className="provenance">
      <div className="section-label">
        DECISION RECORD <Status value={provenance.status} />
      </div>
      <h4>Why this approach</h4>
      <p>{provenance.rationale}</p>
      <h4>Requirement</h4>
      <p>{provenance.requirement}</p>
      <h4>Evidence</h4>
      {provenance.evidenceIds.length ? (
        provenance.evidenceIds.map((id) => {
          const item = evidence.find((e) => e.id === id);
          return (
            <button
              className="evidence-link"
              key={id}
              onClick={() => item && onEvidence?.(item)}
              disabled={!item}
            >
              <span>{item?.title ?? id}</span>
              <ArrowUpRight size={14} />
            </button>
          );
        })
      ) : (
        <p className="muted">No supporting source yet.</p>
      )}
      <h4>Alternatives considered</h4>
      <ul className="quiet-list">
        {provenance.alternatives.map((text, index) => (
          <li key={index}>
            <ChevronRight size={13} />
            {text}
          </li>
        ))}
      </ul>
      <h4>Validation</h4>
      {provenance.testedBy.length ? (
        <p className="inline-note">
          Acceptance case references: {provenance.testedBy.join(', ')}. See recorded results to
          establish whether they passed.
        </p>
      ) : (
        <p className="muted">This decision has not been tested yet.</p>
      )}
      <p className="metadata">Rubric {provenance.rubricVersion}</p>
    </div>
  );
}
export function EvidenceDialog({ evidence, onClose }: { evidence: Evidence; onClose: () => void }) {
  return (
    <Modal title="Source evidence" onClose={onClose}>
      <div className="section-label">
        {evidence.category} · {evidence.verified ? 'Verified source' : 'Historical / illustrative'}
      </div>
      <h3 className="source-title">{evidence.title}</h3>
      <blockquote>{evidence.excerpt}</blockquote>
      <dl className="facts">
        <div>
          <dt>Source</dt>
          <dd className="break-word">{evidence.source}</dd>
        </div>
        <div>
          <dt>Revision</dt>
          <dd>{evidence.revision}</dd>
        </div>
      </dl>
    </Modal>
  );
}
