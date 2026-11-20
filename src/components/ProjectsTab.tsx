import React, { useState, useEffect } from 'react';
import {
  LayoutGrid,
  List,
  Search,
  FolderOpen,
  FolderPlus,
  Plus,
  Trash2,
  X,
  Film,
  CheckCircle2,
  Circle,
  Archive,
  RotateCcw,
  AlertTriangle,
  HelpCircle,
  Clock,
  Eye,
  FolderSearch,
  Edit2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  Project,
  Client,
  ProjectStatus,
  ProjectTask,
  TimecodeNote,
  IndexedVideo,
  ProjectLane,
} from '../types';
import { STATUS_CONFIG, DEFAULT_PROJECT_LANES } from '../data/initialData';
import {
  formatBRL,
  formatDateBR,
  formatSecondsToHuman,
  getDeadlineBadge,
  getTrashCountdown,
  pickDesktopFolder,
  getMediaTypeColor,
} from '../services/desktopService';

interface ProjectsTabProps {
  projects: Project[];
  archivedProjects?: Project[];
  trashedProjects?: Project[];
  videos?: IndexedVideo[];
  clients: Client[];
  selectedProject: Project | null;
  defaultBaseFolder?: string;
  lanes?: ProjectLane[];
  onUpdateLanes?: (lanes: ProjectLane[]) => void;
  onSelectProject: (project: Project | null) => void;
  onOpenNewProject: () => void;
  onUpdateProject: (updated: Project) => void;
  onDeleteProject: (projectId: string) => void; 
  onRestoreProject?: (projectId: string) => void;
  onPermanentDeleteProject?: (projectId: string) => void;
  onEmptyTrash?: () => void;
  onClearArchived?: () => void;
  onArchiveProject?: (projectId: string) => void;
  onUnarchiveProject?: (projectId: string) => void;
  onScaffoldFolder: (project: Project) => void;
  onOpenExplorer: (path: string) => void;
  onOpenIndexVideoForProject: (project: Project) => void;
  onNavigateTab?: (tab: any) => void;
  onSetDefaultBaseFolder?: (path: string) => void;
}

type ProjectSubView = 'active' | 'archived' | 'trash';

export const ProjectsTab: React.FC<ProjectsTabProps> = ({
  projects,
  archivedProjects = [],
  trashedProjects = [],
  videos = [],
  clients,
  selectedProject,
  defaultBaseFolder = '',
  lanes = DEFAULT_PROJECT_LANES,
  onUpdateLanes,
  onSelectProject,
  onOpenNewProject,
  onUpdateProject,
  onDeleteProject,
  onRestoreProject,
  onPermanentDeleteProject,
  onEmptyTrash,
  onClearArchived,
  onArchiveProject,
  onUnarchiveProject,
  onScaffoldFolder,
  onOpenExplorer,
  onOpenIndexVideoForProject,
  onNavigateTab,
  onSetDefaultBaseFolder,
}) => {
  const [subView, setSubView] = useState<ProjectSubView>('active');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState('all');

  const [editingLaneId, setEditingLaneId] = useState<string | null>(null);
  const [editingLaneTitle, setEditingLaneTitle] = useState('');
  const [showAddLaneModal, setShowAddLaneModal] = useState(false);
  const [newLaneTitle, setNewLaneTitle] = useState('');
  const [newLanePosition, setNewLanePosition] = useState<'end' | 'start'>('end');

  const currentLanes = lanes && lanes.length > 0 ? lanes : DEFAULT_PROJECT_LANES;

  const handleSaveLaneTitle = (laneId: string) => {
    if (!editingLaneTitle.trim() || !onUpdateLanes) return;
    const updated = currentLanes.map((l) =>
      l.id === laneId ? { ...l, title: editingLaneTitle.trim() } : l
    );
    onUpdateLanes(updated);
    setEditingLaneId(null);
  };

  const handleMoveLane = (index: number, direction: 'left' | 'right') => {
    if (!onUpdateLanes) return;
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentLanes.length) return;
    const updated = [...currentLanes];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    onUpdateLanes(updated);
  };

  const handleDeleteLane = (laneId: string) => {
    if (currentLanes.length <= 1) {
      alert('Você precisa ter pelo menos uma raia.');
      return;
    }
    if (confirm('Deseja excluir esta raia? Os projetos nela serão movidos para a primeira raia.')) {
      if (onUpdateLanes) {
        const remainingLanes = currentLanes.filter((l) => l.id !== laneId);
        onUpdateLanes(remainingLanes);

        const fallbackLaneId = remainingLanes[0].id;
        projects.forEach((p) => {
          if (p.status === laneId) {
            onUpdateProject({ ...p, status: fallbackLaneId as any });
          }
        });
      }
    }
  };

  const handleCreateLane = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLaneTitle.trim() || !onUpdateLanes) return;
    const newLane: ProjectLane = {
      id: 'lane-proj-' + Date.now(),
      title: newLaneTitle.trim(),
      color: '#6366F1',
    };
    if (newLanePosition === 'start') {
      onUpdateLanes([newLane, ...currentLanes]);
    } else {
      onUpdateLanes([...currentLanes, newLane]);
    }
    setNewLaneTitle('');
    setShowAddLaneModal(false);
  };

  const handleMoveProjectLane = (project: Project, direction: 'prev' | 'next') => {
    const currentIndex = currentLanes.findIndex((l) => l.id === project.status);
    if (currentIndex === -1) {
      onUpdateProject({ ...project, status: currentLanes[0].id as any });
      return;
    }
    const targetIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= currentLanes.length) return;
    const targetLane = currentLanes[targetIndex];
    onUpdateProject({ ...project, status: targetLane.id as any });
  };

  const [newTaskLabel, setNewTaskLabel] = useState('');
  const [newNoteTimecode, setNewNoteTimecode] = useState('00:15');
  const [newNoteComment, setNewNoteComment] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedProject) {
        onSelectProject(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedProject, onSelectProject]);

  const handlePickFolderForProject = async () => {
    if (!selectedProject) return;
    const res = await pickDesktopFolder(selectedProject.localFolderPath);
    if (res.ok && res.path) {
      const upd = { ...selectedProject, localFolderPath: res.path };
      onUpdateProject(upd);
      onSelectProject(upd);
    }
  };

  const displayedList =
    subView === 'active'
      ? projects
      : subView === 'archived'
      ? archivedProjects
      : trashedProjects;

  const filtered = displayedList.filter((p) => {
    const q = search.toLowerCase();
    const matchQuery =
      p.title.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      p.clientName.toLowerCase().includes(q);
    const matchClient = clientFilter === 'all' || p.clientId === clientFilter;
    return matchQuery && matchClient;
  });

  const statusOrder: ProjectStatus[] = [
    'raw_waiting',
    'cutting',
    'finishing',
    'review',
    'approved',
    'delivered',
  ];

  const handleToggleTask = (taskIndex: number) => {
    if (!selectedProject) return;
    const updatedTasks = selectedProject.tasks.map((t, idx) =>
      idx === taskIndex ? { ...t, done: !t.done } : t
    );
    const updated = { ...selectedProject, tasks: updatedTasks };
    onUpdateProject(updated);
    onSelectProject(updated);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !newTaskLabel.trim()) return;
    const newTask: ProjectTask = {
      id: 'task-' + Date.now(),
      label: newTaskLabel.trim(),
      done: false,
    };
    const updated = { ...selectedProject, tasks: [...selectedProject.tasks, newTask] };
    onUpdateProject(updated);
    onSelectProject(updated);
    setNewTaskLabel('');
  };

  const handleDeleteTask = (taskIndex: number) => {
    if (!selectedProject) return;
    const updatedTasks = selectedProject.tasks.filter((_, idx) => idx !== taskIndex);
    const updated = { ...selectedProject, tasks: updatedTasks };
    onUpdateProject(updated);
    onSelectProject(updated);
  };

  const handleAddTimecodeNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !newNoteComment.trim()) return;
    const newNote: TimecodeNote = {
      id: 'note-' + Date.now(),
      timecode: newNoteTimecode || '00:00',
      version: 'V1',
      comment: newNoteComment.trim(),
      resolved: false,
    };
    const updated = { ...selectedProject, notes: [newNote, ...selectedProject.notes] };
    onUpdateProject(updated);
    onSelectProject(updated);
    setNewNoteComment('');
  };

  const handleToggleNote = (noteId: string) => {
    if (!selectedProject) return;
    const updatedNotes = selectedProject.notes.map((n) =>
      n.id === noteId ? { ...n, resolved: !n.resolved } : n
    );
    const updated = { ...selectedProject, notes: updatedNotes };
    onUpdateProject(updated);
    onSelectProject(updated);
  };

  const projectVideos = selectedProject
    ? videos.filter((v) => v.projectId === selectedProject.id)
    : [];

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-16 pt-4">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary">
            Projetos
          </h1>
          <p className="mt-0.5 text-xs text-text-secondary">
            Gerencie o pipeline de edição, acesse pastas no computador e registre entregáveis de vídeo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          
          <div className="flex rounded-lg border border-border bg-bg-card p-1 text-xs">
            <button
              onClick={() => setSubView('active')}
              className={`px-3 py-1 rounded-md transition-colors ${
                subView === 'active'
                  ? 'bg-accent text-accent-fg font-semibold'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Em Andamento ({projects.length})
            </button>
            <button
              onClick={() => setSubView('archived')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
                subView === 'archived'
                  ? 'bg-accent text-accent-fg font-semibold'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Archive className="size-3" />
              <span>Arquivados ({archivedProjects.length})</span>
            </button>
            <button
              onClick={() => setSubView('trash')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                subView === 'trash'
                  ? 'bg-danger text-accent-fg font-semibold'
                  : 'text-text-muted hover:text-text-primary'
              }`}
              title="Lixeira com retenção de 30 dias"
            >
              <Trash2 className="size-3" />
              <span>Lixeira ({trashedProjects.length})</span>
            </button>
          </div>

          {subView !== 'trash' && (
            <button onClick={onOpenNewProject} className="btn-neon flex items-center gap-1.5 h-9">
              <Plus className="size-3.5" />
              <span>Novo Projeto</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2 max-w-md">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por código, título ou cliente..."
              className="field pl-9"
            />
          </div>

          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="h-9 rounded-lg border border-border bg-bg-card px-2.5 text-xs text-text-secondary focus:outline-none focus:border-accent"
          >
            <option value="all">Todos os Clientes</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {subView !== 'trash' ? (
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-border bg-bg-card p-0.5 text-xs">
              <button
                onClick={() => setViewMode('kanban')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                  viewMode === 'kanban'
                    ? 'bg-accent text-accent-fg font-medium'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <LayoutGrid className="size-3.5" />
                <span>Kanban</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                  viewMode === 'list'
                    ? 'bg-accent text-accent-fg font-medium'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <List className="size-3.5" />
                <span>Lista</span>
              </button>
            </div>

            {viewMode === 'kanban' && onUpdateLanes && (
              <button
                onClick={() => setShowAddLaneModal(true)}
                className="btn-ghost flex items-center gap-1.5 h-8 px-2.5 text-xs text-text-secondary hover:text-text-primary"
                title="Criar nova raia de projetos"
              >
                <Plus className="size-3.5" />
                <span>Nova Raia</span>
              </button>
            )}
          </div>
        ) : (
          trashedProjects.length > 0 && onEmptyTrash && (
            <button
              onClick={() => {
                if (window.confirm('Esvaziar toda a lixeira definitivamente? Essa ação não pode ser desfeita.')) {
                  onEmptyTrash();
                }
              }}
              className="btn-ghost text-xs text-danger hover:border-danger/50"
            >
              <Trash2 className="size-3.5" />
              <span>Esvaziar Lixeira Agora</span>
            </button>
          )
        )}
      </div>

      {subView === 'archived' ? (
        <div className="space-y-3">
          <div className="p-3.5 rounded-lg border border-border bg-bg-subtle text-xs text-text-secondary flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Archive className="size-4 text-accent shrink-0" />
              <span>
                <strong>Projetos Arquivados:</strong> Histórico de trabalhos entregues com dados de tempo, valor e rendimento da hora.
              </span>
            </div>
            {archivedProjects.length > 0 && onClearArchived && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Mover todos os projetos arquivados para a lixeira?')) {
                    onClearArchived();
                  }
                }}
                className="btn-ghost h-7 px-2.5 text-[11px] text-danger hover:border-danger/40 self-end sm:self-auto shrink-0 flex items-center gap-1"
                title="Mover todo o histórico arquivado para a lixeira"
              >
                <Trash2 className="size-3" />
                <span>Limpar Arquivados</span>
              </button>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="card p-12 text-center text-text-muted text-xs space-y-2">
              <Archive className="size-8 mx-auto text-text-muted/40" />
              <p className="font-medium text-text-secondary">Nenhum projeto arquivado encontrado.</p>
              <p className="text-[11px] text-text-muted">Projetos finalizados que você arquivar aparecerão aqui com todo o histórico de rendimento.</p>
            </div>
          ) : (
            <div className="card divide-y divide-border overflow-hidden">
              {filtered.map((p) => {
                const seconds = p.trackedSeconds || 0;
                const hours = seconds / 3600;
                const hourlyYield = hours >= 0.1 ? Math.round((p.price || 0) / hours) : null;
                const formatLabel = p.format ? p.format.split(' ')[0] : (p.mediaType || 'Vídeo');

                return (
                  <div
                    key={p.id}
                    className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs hover:bg-bg-hover/30 transition-colors"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-accent">{p.code || 'MZ'}</span>
                        <span className="font-semibold text-text-primary text-sm">{p.title}</span>
                      </div>
                      <div className="text-text-muted flex flex-wrap items-center gap-3 text-[11px]">
                        <span><strong>Cliente:</strong> {p.clientName || 'Cliente'}</span>
                        <span>•</span>
                        <span><strong>Formato:</strong> {formatLabel}</span>
                        <span>•</span>
                        <span><strong>Período:</strong> {formatDateBR(p.startDate)} a {formatDateBR(p.deliveryDate)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 shrink-0 text-xs">
                      
                      <div className="text-right">
                        <div className="font-bold text-text-primary text-sm">
                          {formatBRL(p.price)}
                        </div>
                        <div className="text-[10px] text-text-muted font-medium">
                          {p.paymentStatus === 'paid' ? 'Pago' : 'Pendente'}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-mono font-bold text-text-primary text-sm">
                          {formatSecondsToTimer(seconds)}
                        </div>
                        <div className="text-[10px] text-text-muted">
                          {seconds > 0 ? formatSecondsToHuman(seconds) : 'Sem tempo'}
                        </div>
                      </div>

                      <div className="text-right w-24">
                        <div className="font-mono font-bold text-success text-sm">
                          {hourlyYield ? `${formatBRL(hourlyYield)}/h` : '—'}
                        </div>
                        <div className="text-[10px] text-text-muted">
                          rendimento/h
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onOpenExplorer(p.localFolderPath)}
                          className="btn-ghost h-8 px-2.5 text-xs text-text-muted hover:text-text-primary flex items-center gap-1"
                          title="Abrir pasta no Windows Explorer"
                        >
                          <FolderOpen className="size-3.5 text-warning" />
                          <span>Pasta</span>
                        </button>

                        {onUnarchiveProject && (
                          <button
                            type="button"
                            onClick={() => onUnarchiveProject(p.id)}
                            className="btn-ghost h-8 px-2.5 text-xs text-accent hover:bg-accent/15 flex items-center gap-1"
                            title="Desarquivar e mover para Em Andamento"
                          >
                            <RotateCcw className="size-3.5" />
                            <span>Desarquivar</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Mover "${p.title}" para a lixeira?`)) {
                              onDeleteProject(p.id);
                            }
                          }}
                          className="btn-ghost h-8 px-2 text-xs text-text-muted hover:text-danger"
                          title="Mover para a lixeira"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : subView === 'trash' ? (
        <div className="space-y-3">
          <div className="p-3.5 rounded-lg border border-border bg-bg-subtle text-xs text-text-secondary flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-warning" />
              <span>
                Projetos na lixeira permanecem disponíveis por <strong>30 dias</strong> para restauração antes de serem removidos definitivamente do banco.
              </span>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="card p-12 text-center text-text-muted text-xs">
              A lixeira está vazia. Nenhum projeto excluído recentemente.
            </div>
          ) : (
            <div className="card divide-y divide-border overflow-hidden">
              {filtered.map((p) => {
                const countdown = getTrashCountdown(p.deletedAt || p.createdAt);
                return (
                  <div key={p.id} className="p-4 flex items-center justify-between gap-4 text-xs">
                    <div>
                      <div className="font-semibold text-text-primary text-sm">{p.title}</div>
                      <div className="text-text-muted mt-0.5 font-mono">
                        {p.code} · {p.clientName} · {formatBRL(p.price)}
                      </div>
                      <div className="mt-1 text-[11px] text-warning flex items-center gap-1">
                        <Clock className="size-3" />
                        <span>{countdown.label}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {onRestoreProject && (
                        <button
                          onClick={() => onRestoreProject(p.id)}
                          className="btn-primary text-xs h-8 px-3"
                        >
                          <RotateCcw className="size-3.5" />
                          <span>Restaurar Projeto</span>
                        </button>
                      )}
                      {onPermanentDeleteProject && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Excluir "${p.title}" definitivamente agora?`)) {
                              onPermanentDeleteProject(p.id);
                            }
                          }}
                          className="btn-ghost text-xs h-8 text-danger hover:border-danger/50"
                          title="Excluir de vez"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : viewMode === 'kanban' ? (
        
        <div className="flex gap-4 overflow-x-auto pb-6 pt-1 items-start select-none scrollbar-thin">
          {currentLanes.map((lane, laneIdx) => {
            const colProjects = filtered.filter(
              (p) => (p.status || currentLanes[0].id) === lane.id
            );
            const cfg = STATUS_CONFIG[lane.id as ProjectStatus] || {
              label: lane.title,
              dotColor: lane.color || '#6366F1',
              badgeClass: 'bg-accent/10 text-accent',
            };

            return (
              <div
                key={lane.id}
                className="w-[320px] min-w-[320px] max-w-[320px] shrink-0 card p-3 flex flex-col min-h-[500px] bg-bg-card/80 border-border shadow-xs"
              >
                
                <div className="flex items-center justify-between pb-2.5 border-b border-border mb-3 px-1">
                  {editingLaneId === lane.id ? (
                    <div className="flex items-center gap-1 flex-1 mr-1">
                      <input
                        type="text"
                        value={editingLaneTitle}
                        onChange={(e) => setEditingLaneTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveLaneTitle(lane.id);
                          if (e.key === 'Escape') setEditingLaneId(null);
                        }}
                        autoFocus
                        className="field h-7 text-xs px-2"
                      />
                      <button
                        onClick={() => handleSaveLaneTitle(lane.id)}
                        className="btn-primary h-7 px-2 text-[10px]"
                      >
                        Salvar
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      
                      <div className="flex items-center">
                        <button
                          onClick={() => handleMoveLane(laneIdx, 'left')}
                          disabled={laneIdx === 0}
                          className="text-text-muted hover:text-text-primary disabled:opacity-20 p-0.5 transition-opacity"
                          title="Mover raia para a esquerda"
                        >
                          <ChevronLeft className="size-3" />
                        </button>
                        <button
                          onClick={() => handleMoveLane(laneIdx, 'right')}
                          disabled={laneIdx === currentLanes.length - 1}
                          className="text-text-muted hover:text-text-primary disabled:opacity-20 p-0.5 transition-opacity"
                          title="Mover raia para a direita"
                        >
                          <ChevronRight className="size-3" />
                        </button>
                      </div>

                      <span
                        className="size-2 rounded-full shrink-0"
                        style={{ backgroundColor: cfg.dotColor }}
                      />
                      <h3 className="text-xs font-bold text-text-primary truncate">
                        {lane.title}
                      </h3>
                      <button
                        onClick={() => {
                          setEditingLaneId(lane.id);
                          setEditingLaneTitle(lane.title);
                        }}
                        className="text-text-muted hover:text-text-primary p-0.5"
                        title="Editar nome da raia"
                      >
                        <Edit2 className="size-2.5" />
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-1 shrink-0">
                    <span className="font-mono text-[11px] text-text-muted px-1.5 py-0.5 rounded bg-bg-subtle border border-border">
                      {colProjects.length}
                    </span>

                    {currentLanes.length > 1 && onUpdateLanes && (
                      <button
                        onClick={() => handleDeleteLane(lane.id)}
                        className="p-1 text-text-muted hover:text-danger transition-colors"
                        title="Excluir esta raia"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[640px] pr-1">
                  {colProjects.length === 0 ? (
                    <div className="p-8 text-center text-[11px] text-text-muted/60 border border-dashed border-border/60 rounded-lg">
                      Nenhum projeto nesta raia
                    </div>
                  ) : (
                    colProjects.map((project) => {
                      const completedTasks = project.tasks.filter((t) => t.done).length;
                      const dl = getDeadlineBadge(project.deliveryDate, project.status === 'delivered');
                      const mediaColor = getMediaTypeColor(project.mediaType || project.format);
                      const mediaLabel = project.mediaType || project.format.split(' ')[0];

                      return (
                        <div
                          key={project.id}
                          onClick={() => onSelectProject(project)}
                          className="group cursor-pointer rounded-lg border border-border bg-bg-card p-3 hover:border-border-strong transition-all shadow-xs space-y-2"
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-mono text-accent font-semibold">{project.code}</span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${mediaColor.bg} ${mediaColor.text} ${mediaColor.border}`}
                            >
                              {mediaLabel}
                            </span>
                          </div>

                          <h4 className="text-xs font-semibold text-text-primary leading-snug line-clamp-2 group-hover:text-accent transition-colors">
                            {project.title}
                          </h4>

                          <div className="text-[11px] text-text-secondary truncate">
                            {project.clientName}
                          </div>

                          {project.tasks.length > 0 && (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[10px] text-text-muted">
                                <span>Etapas</span>
                                <span className="font-mono">
                                  {completedTasks}/{project.tasks.length}
                                </span>
                              </div>
                              <div className="w-full h-1 bg-bg-subtle rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-accent rounded-full transition-all"
                                  style={{
                                    width: `${(completedTasks / (project.tasks.length || 1)) * 100}%`,
                                  }}
                                />
                              </div>
                            </div>
                          )}

                          <div className="pt-2 border-t border-border flex items-center justify-between text-[11px]">
                            <span
                              className={
                                dl.tone === 'rose'
                                  ? 'text-danger font-medium'
                                  : dl.tone === 'amber'
                                  ? 'text-warning font-medium'
                                  : 'text-text-muted'
                              }
                            >
                              {formatDateBR(project.deliveryDate)}
                            </span>

                            <span className="font-medium text-text-primary font-mono text-[11px]">
                              {formatBRL(project.price)}
                            </span>
                          </div>

                          <div
                            className="pt-2 border-t border-border/60 flex items-center justify-between text-[10px] text-text-muted"
                            onClick={(e) => e.stopPropagation()}
                          >
                            
                            <div className="flex items-center gap-0.5">
                              <button
                                onClick={() => handleMoveProjectLane(project, 'prev')}
                                disabled={laneIdx === 0}
                                className="p-1 rounded btn-ghost disabled:opacity-20 disabled:pointer-events-none text-text-muted hover:text-accent font-bold"
                                title="Mover projeto para raia anterior"
                              >
                                <ChevronLeft className="size-3.5" />
                              </button>
                              <button
                                onClick={() => handleMoveProjectLane(project, 'next')}
                                disabled={laneIdx === currentLanes.length - 1}
                                className="p-1 rounded btn-ghost disabled:opacity-20 disabled:pointer-events-none text-text-muted hover:text-accent font-bold"
                                title="Mover projeto para próxima raia"
                              >
                                <ChevronRight className="size-3.5" />
                              </button>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => onOpenExplorer(project.localFolderPath)}
                                className="inline-flex items-center gap-1 hover:text-text-primary transition-colors text-[10px]"
                                title="Abrir pasta no Windows Explorer"
                              >
                                <FolderOpen className="size-3 text-warning" />
                                <span>Pasta</span>
                              </button>

                              <button
                                onClick={() => onOpenIndexVideoForProject(project)}
                                className="inline-flex items-center gap-1 text-accent hover:underline text-[10px]"
                                title="Indexar vídeo deste projeto"
                              >
                                <Film className="size-3" />
                                <span>+ Render</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        
        <div className="card overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-bg-subtle text-text-muted font-medium">
              <tr>
                <th className="px-4 py-3">Projeto</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Início</th>
                <th className="px-4 py-3">Entrega</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((project) => {
                const statusCfg = STATUS_CONFIG[project.status];
                return (
                  <tr
                    key={project.id}
                    onClick={() => onSelectProject(project)}
                    className="cursor-pointer hover:bg-bg-hover transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-text-primary">{project.title}</div>
                      <div className="text-[11px] font-mono text-text-muted">
                        {project.code} · {project.format}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{project.clientName}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[11px] ${statusCfg.badgeClass}`}>
                        {statusCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {formatDateBR(project.startDate || project.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {formatDateBR(project.deliveryDate)}
                    </td>
                    <td className="px-4 py-3 font-medium text-text-primary">
                      {formatBRL(project.price)}
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onOpenExplorer(project.localFolderPath)}
                          className="btn-ghost h-7 px-2 text-[11px]"
                          title="Abrir pasta no Windows Explorer"
                        >
                          <FolderOpen className="size-3 text-warning" />
                          <span>Pasta</span>
                        </button>
                        <button
                          onClick={() => onOpenIndexVideoForProject(project)}
                          className="btn-ghost h-7 px-2 text-[11px] text-accent"
                          title="Indexar render deste projeto"
                        >
                          <Film className="size-3" />
                          <span>+ Vídeo</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedProject && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity"
          onClick={() => onSelectProject(null)}
        >
          <div
            className="w-full max-w-xl h-full max-h-screen bg-bg-card border-l border-border flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-bg-card shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-xs font-mono text-accent bg-accent/15 px-2 py-0.5 rounded border border-accent/30 font-semibold">
                  {selectedProject.code}
                </span>
                <h3 className="text-sm font-bold text-text-primary truncate max-w-[280px]">
                  {selectedProject.title}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => onSelectProject(null)}
                className="btn-ghost h-8 px-2.5 text-xs flex items-center gap-1.5 font-medium hover:border-border-strong"
                title="Fechar gaveta (Esc)"
              >
                <X className="size-4" />
                <span>Fechar</span>
                <kbd className="text-[10px] bg-bg-subtle px-1 py-0.2 rounded border border-border text-text-muted">
                  ESC
                </kbd>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 rounded-lg border border-border bg-bg-subtle">
                <div>
                  <label className="text-[10px] font-medium text-text-muted block mb-1">Status</label>
                  <select
                    value={selectedProject.status}
                    onChange={(e) => {
                      const upd = { ...selectedProject, status: e.target.value as ProjectStatus };
                      onUpdateProject(upd);
                      onSelectProject(upd);
                    }}
                    className="h-8 w-full rounded border border-border bg-bg-card px-2 text-xs text-text-primary focus:outline-none focus:border-accent"
                  >
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-medium text-text-muted block mb-1">Início da Edição</label>
                  <input
                    type="date"
                    value={selectedProject.startDate || selectedProject.createdAt}
                    onChange={(e) => {
                      const upd = { ...selectedProject, startDate: e.target.value };
                      onUpdateProject(upd);
                      onSelectProject(upd);
                    }}
                    className="h-8 w-full rounded border border-border bg-bg-card px-2 text-xs text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-medium text-text-muted block mb-1">Prazo de Entrega</label>
                  <input
                    type="date"
                    value={selectedProject.deliveryDate}
                    onChange={(e) => {
                      const upd = { ...selectedProject, deliveryDate: e.target.value };
                      onUpdateProject(upd);
                      onSelectProject(upd);
                    }}
                    className="h-8 w-full rounded border border-border bg-bg-card px-2 text-xs text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-medium text-text-muted block mb-1">Data Pagamento</label>
                  <input
                    type="date"
                    value={selectedProject.paymentDate}
                    onChange={(e) => {
                      const upd = { ...selectedProject, paymentDate: e.target.value };
                      onUpdateProject(upd);
                      onSelectProject(upd);
                    }}
                    className="h-8 w-full rounded border border-border bg-bg-card px-2 text-xs text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-border bg-bg-subtle space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-text-primary text-xs">
                      Pasta do Projeto no Disco
                    </span>
                    <span className="block text-[11px] text-text-muted">
                      Você pode alterar o local onde a pasta deste projeto será criada no seu computador.
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={handlePickFolderForProject}
                      className="btn-ghost text-xs h-7 px-2 text-accent flex items-center gap-1"
                      title="Escolher uma pasta existente no computador"
                    >
                      <FolderSearch className="size-3" />
                      <span>Escolher Pasta...</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onScaffoldFolder(selectedProject)}
                      className="btn-primary text-xs h-7 px-2.5"
                      title="Criar a árvore de pastas no disco"
                    >
                      <FolderPlus className="size-3" />
                      <span>{selectedProject.foldersCreated ? 'Recriar Pastas' : 'Criar Pastas'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenExplorer(selectedProject.localFolderPath)}
                      className="btn-ghost text-xs h-7 px-2"
                      title="Abrir no Windows Explorer"
                    >
                      <FolderOpen className="size-3.5 text-warning" />
                      <span>Explorer</span>
                    </button>
                  </div>
                </div>

                <div>
                  <input
                    type="text"
                    value={selectedProject.localFolderPath}
                    onChange={(e) => {
                      const upd = { ...selectedProject, localFolderPath: e.target.value };
                      onUpdateProject(upd);
                      onSelectProject(upd);
                    }}
                    placeholder="Ex: D:\Edicoes\2026\ClienteX..."
                    className="field font-mono text-[11px]"
                  />
                </div>

                {onSetDefaultBaseFolder && (
                  <div className="flex items-center justify-between pt-1 border-t border-border/50 text-[10px]">
                    <span className="text-text-muted">
                      Deseja usar este diretório para novos projetos?
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const p = selectedProject.localFolderPath;
                        const lastSlash = Math.max(p.lastIndexOf('\\'), p.lastIndexOf('/'));
                        const parentDir = lastSlash > 3 ? p.substring(0, lastSlash) : p;
                        onSetDefaultBaseFolder(parentDir);
                      }}
                      className="text-accent font-semibold hover:underline"
                    >
                      Definir como pasta padrão do estúdio
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="group relative flex items-center gap-1.5">
                    <span className="font-semibold text-text-primary text-xs">Etapas de Produção</span>
                    <span className="cursor-help text-text-muted text-[11px] flex items-center gap-0.5 hover:text-accent">
                      <HelpCircle className="size-3" />
                    </span>
                    
                    <div className="pointer-events-none absolute left-0 bottom-full mb-1.5 hidden w-72 rounded-lg border border-border bg-bg-card p-2.5 text-[11px] text-text-secondary shadow-xl group-hover:block z-30">
                      💡 <strong>Dica:</strong> Você pode excluir qualquer etapa aqui no botão de lixeira. Para definir quais etapas vêm por padrão em todo projeto novo, vá na aba <strong>Configurações</strong>.
                    </div>
                  </div>
                  <span className="text-[11px] text-text-muted font-mono">
                    {selectedProject.tasks.filter((t) => t.done).length} de {selectedProject.tasks.length} concluídas
                  </span>
                </div>

                <div className="space-y-1.5">
                  {selectedProject.tasks.map((task, idx) => (
                    <div
                      key={task.id}
                      className="group flex items-center justify-between p-2 rounded-lg border border-border bg-bg-subtle hover:border-border-strong transition-colors"
                    >
                      <div
                        onClick={() => handleToggleTask(idx)}
                        className="flex items-center gap-2.5 flex-1 cursor-pointer select-none"
                      >
                        {task.done ? (
                          <CheckCircle2 className="size-4 text-success shrink-0" />
                        ) : (
                          <Circle className="size-4 text-text-muted shrink-0" />
                        )}
                        <span className={task.done ? 'line-through text-text-muted' : 'text-text-primary font-medium'}>
                          {task.label}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTask(idx);
                        }}
                        className="p-1 text-text-muted hover:text-danger opacity-60 group-hover:opacity-100 transition-opacity"
                        title="Excluir esta etapa do projeto"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddTask} className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={newTaskLabel}
                    onChange={(e) => setNewTaskLabel(e.target.value)}
                    placeholder="Adicionar etapa personalizada para este projeto..."
                    className="field flex-1 text-xs"
                  />
                  <button type="submit" className="btn-primary text-xs shrink-0">
                    + Adicionar
                  </button>
                </form>
              </div>

              <div className="p-3.5 rounded-lg border border-border bg-bg-subtle space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Film className="size-4 text-accent" />
                    <span className="font-semibold text-text-primary text-xs">
                      Vídeos / Renders Deste Projeto ({projectVideos.length})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenIndexVideoForProject(selectedProject)}
                    className="btn-primary text-xs h-7 px-2.5"
                  >
                    <Plus className="size-3" />
                    <span>Indexar Vídeo</span>
                  </button>
                </div>

                {projectVideos.length === 0 ? (
                  <p className="text-[11px] text-text-muted">
                    Nenhum arquivo de vídeo (.mp4/.mov) indexado neste projeto ainda.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {projectVideos.map((v) => (
                      <div
                        key={v.id}
                        className="p-2.5 rounded-lg border border-border bg-bg-card flex items-center justify-between text-xs"
                      >
                        <div className="truncate pr-2">
                          <div className="font-semibold text-text-primary truncate">{v.title}</div>
                          <div className="text-[10px] text-text-muted font-mono mt-0.5">
                            {v.version} · {v.fileSize} · {v.format} · {v.duration}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => onOpenExplorer(v.localFilePath)}
                          className="btn-ghost h-7 px-2 text-[10px] shrink-0"
                          title="Abrir arquivo no Explorer"
                        >
                          <FolderOpen className="size-3 text-warning" />
                          <span>Pasta</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <span className="font-semibold text-text-primary text-xs block">
                  Anotações de Ajustes (Timecode)
                </span>
                <form onSubmit={handleAddTimecodeNote} className="flex gap-2">
                  <input
                    type="text"
                    value={newNoteTimecode}
                    onChange={(e) => setNewNoteTimecode(e.target.value)}
                    placeholder="00:15"
                    className="w-16 h-8 text-center rounded border border-border bg-bg-subtle text-xs font-mono text-text-primary focus:outline-none focus:border-accent"
                  />
                  <input
                    type="text"
                    value={newNoteComment}
                    onChange={(e) => setNewNoteComment(e.target.value)}
                    placeholder="Ex: Baixar 2dB da música neste ponto..."
                    className="field flex-1 text-xs"
                  />
                  <button type="submit" className="btn-ghost h-9 px-3 text-xs">
                    Salvar
                  </button>
                </form>

                <div className="space-y-1.5 pt-1">
                  {selectedProject.notes.map((note) => (
                    <div
                      key={note.id}
                      onClick={() => handleToggleNote(note.id)}
                      className={`flex items-center justify-between p-2 rounded-lg border border-border bg-bg-subtle cursor-pointer ${
                        note.resolved ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium text-accent">{note.timecode}</span>
                        <span className={note.resolved ? 'line-through text-text-muted' : 'text-text-primary'}>
                          {note.comment}
                        </span>
                      </div>
                      <span className="text-[10px] text-text-muted font-mono">
                        {note.resolved ? '✓ Resolvido' : 'Pendente'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="font-semibold text-text-primary text-xs block">Briefing & Notas</span>
                <textarea
                  rows={2}
                  value={selectedProject.briefing}
                  onChange={(e) => {
                    const upd = { ...selectedProject, briefing: e.target.value };
                    onUpdateProject(upd);
                    onSelectProject(upd);
                  }}
                  className="w-full rounded-lg border border-border bg-bg-subtle p-2.5 text-xs text-text-primary focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-border flex justify-between items-center bg-bg-card shrink-0">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (
                      window.confirm(
                        `Mover o projeto "${selectedProject.title}" para a Lixeira? Ele ficará salvo por 30 dias caso queira restaurar.`
                      )
                    ) {
                      onDeleteProject(selectedProject.id);
                      onSelectProject(null);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 text-danger hover:underline text-xs"
                >
                  <Trash2 className="size-3.5" />
                  <span>Mover para Lixeira</span>
                </button>

                {onArchiveProject && (
                  <button
                    type="button"
                    onClick={() => {
                      onArchiveProject(selectedProject.id);
                      onSelectProject(null);
                    }}
                    className="inline-flex items-center gap-1.5 text-accent hover:underline text-xs font-medium"
                    title="Mover projeto para a aba de Arquivados"
                  >
                    <Archive className="size-3.5" />
                    <span>Arquivar</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => onSelectProject(null)}
                className="btn-ghost text-xs h-8 px-4"
              >
                Concluído / Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddLaneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-bg-card p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-semibold text-sm text-text-primary">Criar Nova Raia de Projetos</h3>
              <button
                onClick={() => setShowAddLaneModal(false)}
                className="text-text-muted hover:text-text-primary"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleCreateLane} className="space-y-3 text-xs">
              <div>
                <label className="block text-text-muted mb-1">Nome da Raia *</label>
                <input
                  required
                  value={newLaneTitle}
                  onChange={(e) => setNewLaneTitle(e.target.value)}
                  placeholder="Ex: Animação & Motion, Aprovação Final..."
                  className="field h-8"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-text-muted mb-1">Posição no Quadro</label>
                <select
                  value={newLanePosition}
                  onChange={(e) => setNewLanePosition(e.target.value as 'end' | 'start')}
                  className="field h-8"
                >
                  <option value="end">No final (última coluna)</option>
                  <option value="start">No início (primeira coluna)</option>
                </select>
                <span className="mt-1 block text-[10px] text-text-muted">
                  Você também pode reordenar qualquer raia a qualquer momento usando as setas ← e → no topo de cada coluna.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAddLaneModal(false)}
                  className="btn-ghost h-8 px-3 text-xs"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary h-8 px-3.5 text-xs">
                  Criar Raia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
