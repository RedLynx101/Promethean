import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  ChevronRight,
  Command,
  FileUp,
  Layers3,
  Library,
  Menu,
  Moon,
  Plus,
  Search,
  Sun,
  X,
  Check,
} from 'lucide-react';
import type { Evidence, RunMode, Workspace } from '@promethean/core';
import { api } from './api';
import {
  Empty,
  ErrorMessage,
  EvidenceDialog,
  Level,
  Loading,
  Modal,
  Status,
  Torch,
  money,
  names,
  relativeDate,
} from './components';
import { WorkflowPage } from './WorkflowPage';

function useRoute() {
  const [route, setRoute] = useState(() => location.hash.slice(1) || '/');
  useEffect(() => {
    const update = () => setRoute(location.hash.slice(1) || '/');
    addEventListener('hashchange', update);
    return () => removeEventListener('hashchange', update);
  }, []);
  return route;
}
export function App() {
  const route = useRoute();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<'new' | 'search' | 'about' | null>(null);
  const [toast, setToast] = useState('');
  const [mobileNav, setMobileNav] = useState(false);
  const [narrow, setNarrow] = useState(() => matchMedia('(max-width: 760px)').matches);
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const media = matchMedia('(max-width: 760px)');
    const update = () => setNarrow(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (mobileNav && narrow) navRef.current?.querySelector<HTMLAnchorElement>('a')?.focus();
  }, [mobileNav, narrow]);
  const [dark, setDark] = useState(() => localStorage.getItem('promethean-theme') === 'dark');
  const [source, setSource] = useState<Evidence | null>(null);
  const [query, setQuery] = useState('');
  const importRef = useRef<HTMLInputElement>(null);
  const notify = useCallback((message: string) => setToast(message), []);
  const refresh = useCallback(async () => {
    try {
      setWorkspace(await api.workspace());
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    localStorage.setItem('promethean-theme', dark ? 'dark' : 'light');
  }, [dark]);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  useEffect(() => {
    setMobileNav(false);
    window.scrollTo(0, 0);
  }, [route]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setModal('search');
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);
  const workflowId = route.match(/^\/workflow\/([^/]+)/)?.[1];
  const active = workflowId
    ? 'Workflow'
    : route === '/library'
      ? 'Library'
      : route === '/evidence'
        ? 'Evidence'
        : 'Studio';
  async function create(description: string, mode: RunMode, exampleId?: string) {
    const workflow = await api.create({ description, mode, exampleId });
    await refresh();
    setModal(null);
    location.hash = `/workflow/${workflow.id}/brief`;
  }
  async function importFile(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > 128_000) throw new Error('Choose a workflow package smaller than 128 KB.');
      const result = await api.import(JSON.parse(await file.text()));
      await refresh();
      location.hash = `/workflow/${result.id}/brief`;
      notify('Workflow package validated and imported.');
    } catch (e) {
      notify((e as Error).message);
    }
    if (importRef.current) importRef.current.value = '';
  }
  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('main-content')?.focus();
        }}
      >
        Skip to workspace
      </a>
      {mobileNav && (
        <button
          className="nav-scrim"
          aria-label="Close navigation"
          onClick={() => setMobileNav(false)}
        />
      )}
      <aside
        ref={navRef}
        inert={narrow && !mobileNav}
        aria-hidden={narrow && !mobileNav}
        className={`sidebar ${mobileNav ? 'open' : ''}`}
        onKeyDown={(e) => {
          if (!narrow || !mobileNav) return;
          if (e.key === 'Escape') {
            setMobileNav(false);
            document.querySelector<HTMLButtonElement>('[aria-label="Open navigation"]')?.focus();
          }
          if (e.key === 'Tab') {
            const items = Array.from(
              navRef.current?.querySelectorAll<HTMLElement>('a,button') ?? [],
            );
            const first = items[0],
              last = items.at(-1);
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last?.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <a href="#/" className="brand" aria-label="Promethean home">
          <Torch />
          <span>
            Promethean<small>WORKFLOW STUDIO</small>
          </span>
        </a>
        <button className="button primary new-button" onClick={() => setModal('new')}>
          <Plus size={16} />
          New workflow
        </button>
        <div className="nav-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          <a href="#/" className={active === 'Studio' || active === 'Workflow' ? 'active' : ''}>
            <Layers3 size={17} />
            Studio<span className="nav-count">{workspace?.workflows.length ?? '—'}</span>
          </a>
          <a href="#/library" className={active === 'Library' ? 'active' : ''}>
            <Library size={17} />
            Library
          </a>
          <a href="#/evidence" className={active === 'Evidence' ? 'active' : ''}>
            <BookOpen size={17} />
            Evidence
          </a>
        </nav>
        <div className="sidebar-note">
          <div className="greek-rule" />
          <p>
            The simplest system
            <br />
            that does the work.
          </p>
        </div>
        <div className="sidebar-bottom">
          <button className="sidebar-link" onClick={() => importRef.current?.click()}>
            <FileUp size={16} />
            Import workflow
          </button>
          <input
            type="file"
            hidden
            ref={importRef}
            accept=".json,application/json"
            onChange={(e) => void importFile(e.target.files?.[0])}
          />
          <div className="local-status">
            <span className="status-dot" />
            <div>
              Local workspace
              <small>
                {workspace?.liveAvailable ? 'Live models configured' : 'No API key needed'}
              </small>
            </div>
            <button
              className="icon-button"
              aria-label={dark ? 'Use light theme' : 'Use dark theme'}
              onClick={() => setDark(!dark)}
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
          <button className="version-link" onClick={() => setModal('about')}>
            Promethean 2.0 <ArrowUpRight size={12} />
          </button>
        </div>
      </aside>
      <div className="main-shell" inert={narrow && mobileNav}>
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="icon-button mobile-only"
              onClick={() => setMobileNav(true)}
              aria-label="Open navigation"
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>{active}</strong>
          </div>
          <button
            className="search-button"
            aria-label="Find a workflow"
            onClick={() => setModal('search')}
          >
            <Search size={15} />
            <span>Find a workflow</span>
            <kbd>
              <Command size={10} /> K
            </kbd>
          </button>
        </header>
        <main id="main-content" tabIndex={-1}>
          {error ? (
            <ErrorMessage message={error} retry={() => void refresh()} />
          ) : !workspace ? (
            <Loading />
          ) : workflowId ? (
            <WorkflowPage
              id={workflowId}
              route={route}
              workspace={workspace}
              refreshWorkspace={refresh}
              notify={notify}
              onEvidence={setSource}
            />
          ) : route === '/library' ? (
            <LibraryPage workspace={workspace} create={create} />
          ) : route === '/evidence' ? (
            <EvidencePage evidence={workspace.evidence} onSelect={setSource} />
          ) : (
            <Studio workspace={workspace} create={create} />
          )}
        </main>
      </div>
      {modal === 'new' && (
        <Modal title="Diagnose a workflow" onClose={() => setModal(null)}>
          <p className="muted modal-intro">
            Describe the process, what goes in, and what a good result looks like.
          </p>
          <Intake liveAvailable={workspace?.liveAvailable ?? false} create={create} compact />
        </Modal>
      )}
      {modal === 'search' && (
        <Modal
          title="Find a workflow"
          onClose={() => {
            setModal(null);
            setQuery('');
          }}
        >
          <div className="search-field">
            <Search size={18} />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or description"
              aria-label="Search workflows"
            />
          </div>
          <div className="command-results">
            {workspace?.workflows
              .filter((w) =>
                `${w.name} ${w.description}`.toLowerCase().includes(query.toLowerCase()),
              )
              .map((w) => (
                <a key={w.id} href={`#/workflow/${w.id}/brief`} onClick={() => setModal(null)}>
                  <Layers3 size={17} />
                  <span>
                    {w.name}
                    <small>
                      {w.nodes.length} steps · revision {w.revision}
                    </small>
                  </span>
                  <ArrowRight size={16} />
                </a>
              ))}
            {workspace &&
              !workspace.workflows.some((w) =>
                `${w.name} ${w.description}`.toLowerCase().includes(query.toLowerCase()),
              ) && <p className="muted">No matching workflow.</p>}
          </div>
        </Modal>
      )}
      {modal === 'about' && (
        <Modal title="Your local studio" onClose={() => setModal(null)}>
          <p>
            Promethean helps you diagnose a process, compare approaches, and test a workflow before
            enabling it.
          </p>
          <dl className="facts">
            <div>
              <dt>Workspace</dt>
              <dd>Stored on this device</dd>
            </div>
            <div>
              <dt>Model access</dt>
              <dd>
                {workspace?.liveAvailable ? 'Configured · Luna by default' : 'Not configured'}
              </dd>
            </div>
            <div>
              <dt>API test budget</dt>
              <dd>
                {money(workspace?.budget.spentUsd ?? 0)} used of{' '}
                {money(workspace?.budget.limitUsd ?? 5)}
              </dd>
            </div>
          </dl>
          <p className="muted">
            Local mode uses rules. Live mode sends the required workflow inputs to OpenAI. Outbox
            actions save locally; they do not send messages.
          </p>
        </Modal>
      )}
      {source && <EvidenceDialog evidence={source} onClose={() => setSource(null)} />}
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          <span>{toast}</span>
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setToast('')}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

function Intake({
  liveAvailable,
  create,
  compact = false,
}: {
  liveAvailable: boolean;
  create: (description: string, mode: RunMode, exampleId?: string) => Promise<void>;
  compact?: boolean;
}) {
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState<RunMode>('local');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!description.trim()) {
      setError('Describe the workflow first.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await create(description, mode);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={(e) => void submit(e)} className={`intake ${compact ? 'compact' : ''}`}>
      <label htmlFor={compact ? 'dialog-description' : 'workflow-description'} className="sr-only">
        Describe your workflow
      </label>
      <textarea
        id={compact ? 'dialog-description' : 'workflow-description'}
        placeholder="We receive customer requests by email. I want to route them to the right person and draft a reply for review…"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        maxLength={10000}
        rows={compact ? 5 : 3}
        disabled={busy}
      />
      <div className="intake-footer">
        <label className="mode-select">
          <span className="status-dot" />
          <select
            aria-label="Diagnosis mode"
            value={mode}
            onChange={(e) => setMode(e.target.value as RunMode)}
            disabled={busy}
          >
            <option value="local">Local diagnosis</option>
            <option value="live" disabled={!liveAvailable}>
              Live with Luna{!liveAvailable ? ' · key needed' : ''}
            </option>
          </select>
        </label>
        <button className="button primary" disabled={busy || !description.trim()} type="submit">
          {busy ? 'Diagnosing…' : 'Find the simplest solution'}
          <ArrowRight size={16} />
        </button>
      </div>
      {error && <ErrorMessage message={error} />}
      <p className="input-hint">
        {mode === 'local'
          ? 'A structured starting point. No model calls.'
          : 'Uses your configured OpenAI key and test budget.'}
      </p>
    </form>
  );
}
function Studio({
  workspace,
  create,
}: {
  workspace: Workspace;
  create: (description: string, mode: RunMode, exampleId?: string) => Promise<void>;
}) {
  return (
    <div className="page studio-page">
      <section className="studio-intro">
        <div>
          <div className="eyebrow">A WORKFLOW, WELL CONSIDERED</div>
          <h1>
            What are you trying
            <br className="desktop-break" /> to improve?
          </h1>
          <p>Start with the work. Find the simplest system that fits.</p>
        </div>
        <div className="principle-art" aria-hidden="true">
          <svg viewBox="0 0 210 210" fill="none">
            <circle cx="105" cy="95" r="76" stroke="currentColor" strokeWidth=".6" />
            <circle
              cx="105"
              cy="95"
              r="59"
              stroke="currentColor"
              strokeWidth=".5"
              strokeDasharray="1 5"
            />
            <path
              d="M61 156H151M69 165H143M76 149V88M92 149V88M108 149V88M124 149V88M140 149V88M67 79H148M63 72L106 53L150 72M80 90H136"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M100 54C85 43 91 31 99 27C95 36 104 34 109 14C123 35 121 46 111 53"
              fill="currentColor"
            />
            <path d="M29 185H184M21 192H193" stroke="currentColor" strokeWidth=".5" />
          </svg>
        </div>
      </section>
      <Intake liveAvailable={workspace.liveAvailable} create={create} />
      <section className="workflow-section">
        <div className="section-heading">
          <h2>
            Your workflows <span>{workspace.workflows.length.toString().padStart(2, '0')}</span>
          </h2>
          <a href="#/library">
            Explore the library
            <ArrowUpRight size={15} />
          </a>
        </div>
        {workspace.workflows.length ? (
          <div className="workflow-table">
            <div className="table-heading">
              <span>WORKFLOW</span>
              <span>APPROACH</span>
              <span>STATUS</span>
              <span>UPDATED</span>
            </div>
            {workspace.workflows.map((workflow, index) => (
              <a
                className="workflow-row"
                key={workflow.id}
                href={`#/workflow/${workflow.id}/brief`}
              >
                <div className="workflow-name">
                  <span className="row-number">{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <strong>{workflow.name}</strong>
                    <small>
                      {workflow.exampleId ? 'Example workflow' : 'Your workflow'} ·{' '}
                      {workflow.nodes.length} steps
                    </small>
                  </div>
                </div>
                <span className="approach-label">
                  <Level
                    archetype={
                      workflow.candidates.find((c) => c.id === workflow.decision.candidateId)
                        ?.archetype ?? 'rules'
                    }
                  />
                  {
                    names[
                      workflow.candidates.find((c) => c.id === workflow.decision.candidateId)
                        ?.archetype ?? 'rules'
                    ]
                  }
                </span>
                <Status value={workflow.status} />
                <div className="row-date">
                  {relativeDate(workflow.updatedAt)}
                  <ArrowUpRight size={16} />
                </div>
              </a>
            ))}
          </div>
        ) : (
          <Empty title="A clean starting point">Describe your first process above.</Empty>
        )}
      </section>
      <section className="studio-footer">
        <div>
          <span className="footer-symbol">↳</span>
          <p>
            <strong>Complexity should earn its place.</strong>
            <br />
            Compare approaches, inspect decisions, and test what works.
          </p>
        </div>
        <a href="#/evidence">
          Explore the methodology
          <ArrowRight size={15} />
        </a>
      </section>
    </div>
  );
}
function LibraryPage({
  workspace,
  create,
}: {
  workspace: Workspace;
  create: (description: string, mode: RunMode, exampleId?: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  return (
    <div className="page">
      <div className="eyebrow">START WITH SOMETHING CONCRETE</div>
      <h1>Workflow library</h1>
      <p className="page-lede">Three working examples, from simple rules to grounded AI.</p>
      {error && <ErrorMessage message={error} />}
      <div className="library-list">
        {workspace.examples.map((example, index) => (
          <article key={example.id} className="library-item">
            <div className="library-number">0{index + 1}</div>
            <div className="library-content">
              <div className="inline-note">
                <Level archetype={example.archetype} />
                {names[example.archetype]}
              </div>
              <h2>{example.name}</h2>
              <p>{example.description}</p>
              <div className="library-meta">
                {example.stepCount} steps <span>·</span> {example.inputDescription}
              </div>
            </div>
            <button
              className="button secondary"
              disabled={Boolean(busy)}
              onClick={async () => {
                setBusy(example.id);
                setError('');
                try {
                  await create(example.description, 'local', example.id);
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy('');
                }
              }}
            >
              {busy === example.id ? 'Creating…' : 'Use workflow'}
              <ArrowUpRight size={16} />
            </button>
          </article>
        ))}
      </div>
      <div className="quiet-callout">
        <BookOpen size={19} />
        <p>
          Examples use curated sample data. Their tests and decision records are included, so you
          can inspect the assumptions before adapting them.
        </p>
      </div>
    </div>
  );
}
function EvidencePage({
  evidence,
  onSelect,
}: {
  evidence: Evidence[];
  onSelect: (item: Evidence) => void;
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const filtered = evidence.filter(
    (item) =>
      (category === 'all' || item.category === category) &&
      `${item.title} ${item.excerpt}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="page">
      <div className="eyebrow">THE REASONS BEHIND THE SYSTEM</div>
      <h1>Evidence & methodology</h1>
      <p className="page-lede">
        A source trail for decisions. Historical examples keep their original context.
      </p>
      <div className="filter-bar">
        <div className="search-field">
          <Search size={17} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the evidence"
            aria-label="Search evidence"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Evidence category"
        >
          <option value="all">All sources</option>
          <option value="methodology">Methodology</option>
          <option value="example">Examples</option>
          <option value="failure">Failures</option>
          <option value="evaluation">Evaluations</option>
        </select>
      </div>
      <div className="evidence-list">
        {filtered.map((item) => (
          <button key={item.id} className="evidence-row" onClick={() => onSelect(item)}>
            <BookOpen size={20} />
            <div>
              <div className="section-label">
                {item.category} · {item.verified ? 'Verified source' : 'Historical / illustrative'}
              </div>
              <h3>{item.title}</h3>
              <p>{item.excerpt}</p>
            </div>
            <ArrowUpRight size={17} />
          </button>
        ))}
        {!filtered.length && (
          <Empty title="No matching sources">Try another phrase or category.</Empty>
        )}
      </div>
    </div>
  );
}
