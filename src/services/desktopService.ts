import { StudioDatabase } from '../types';
import { INITIAL_DATABASE } from '../data/initialData';

const STORAGE_KEY = 'mizzy_studio_v3';
const SCHEMA_VERSION = 3;

const VALID_STATUS = ['raw_waiting', 'cutting', 'finishing', 'review', 'approved', 'delivered'];

function normalizeDb(raw: any): StudioDatabase | null {
  if (!raw || typeof raw !== 'object') return null;
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const now = Date.now();

  const settings = {
    ...INITIAL_DATABASE.settings,
    ...(raw.settings || {}),
    defaultTasks: Array.isArray(raw.settings?.defaultTasks) && raw.settings.defaultTasks.length > 0
      ? raw.settings.defaultTasks
      : INITIAL_DATABASE.settings.defaultTasks,
    mediaTypes: Array.isArray(raw.settings?.mediaTypes) && raw.settings.mediaTypes.length > 0
      ? raw.settings.mediaTypes
      : INITIAL_DATABASE.settings.mediaTypes,
    projectLanes: Array.isArray(raw.settings?.projectLanes) && raw.settings.projectLanes.length > 0
      ? raw.settings.projectLanes
      : (INITIAL_DATABASE.settings.projectLanes || []),
    videoLanes: Array.isArray(raw.settings?.videoLanes) && raw.settings.videoLanes.length > 0
      ? raw.settings.videoLanes
      : INITIAL_DATABASE.settings.videoLanes,
    showCountdownInOverview: typeof raw.settings?.showCountdownInOverview === 'boolean'
      ? raw.settings.showCountdownInOverview
      : true,
  };

  const projects = (Array.isArray(raw.projects) ? raw.projects : []).map((p: any) => ({
    ...p,
    status: p.status || 'cutting',
    startDate: p.startDate || p.createdAt || '2026-11-12',
    tasks: Array.isArray(p.tasks) ? p.tasks : [],
    notes: Array.isArray(p.notes) ? p.notes : [],
    trackedSeconds: Number(p.trackedSeconds) || 0,
  }));

  const archivedProjects = (Array.isArray(raw.archivedProjects) ? raw.archivedProjects : (INITIAL_DATABASE.archivedProjects || [])).map((p: any) => ({
    ...p,
    startDate: p.startDate || p.createdAt || '2026-11-01',
    tasks: Array.isArray(p.tasks) ? p.tasks : [],
    notes: Array.isArray(p.notes) ? p.notes : [],
    trackedSeconds: Number(p.trackedSeconds) || 0,
    archived: true,
  }));

  const trashedProjects = (Array.isArray(raw.trashedProjects) ? raw.trashedProjects : [])
    .filter((p: any) => {
      if (!p.deletedAt) return false;
      const d = new Date(p.deletedAt).getTime();
      return now - d < thirtyDaysMs; 
    });

  const videos = (Array.isArray(raw.videos) ? raw.videos : INITIAL_DATABASE.videos).map((v: any) => ({
    ...v,
    laneId: v.laneId || 'lane-todo',
  }));

  return {
    settings,
    clients: Array.isArray(raw.clients) ? raw.clients : INITIAL_DATABASE.clients,
    videos,
    projects: projects.length > 0 ? projects : INITIAL_DATABASE.projects,
    archivedProjects,
    trashedProjects,
    customEvents: Array.isArray(raw.customEvents) ? raw.customEvents : INITIAL_DATABASE.customEvents,
  };
}

export async function loadStudioDatabase(): Promise<StudioDatabase> {
  try {
    const res = await fetch('/api/desktop/db');
    if (res.ok) {
      const json = await res.json();
      const db = json.ok ? normalizeDb(json.data) : null;
      if (db) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...db, schemaVersion: SCHEMA_VERSION }));
        return db;
      }
    }
  } catch {
    
  }

  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    const db = cached ? normalizeDb(JSON.parse(cached)) : null;
    if (db) return db;
  } catch {
    
  }

  await saveStudioDatabase(INITIAL_DATABASE);
  return INITIAL_DATABASE;
}

export async function saveStudioDatabase(db: StudioDatabase): Promise<void> {
  const payload = { ...db, schemaVersion: SCHEMA_VERSION };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    
  }

  try {
    await fetch('/api/desktop/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: payload }),
    });
  } catch {
    
  }
}

export async function scaffoldProjectFoldersOnDisk(params: {
  folderPath: string;
  projectSlug: string;
  title: string;
  clientName: string;
  format: string;
  deliveryDate: string;
}): Promise<{ ok: boolean; createdPath: string; subfolders: string[]; error?: string }> {
  try {
    const res = await fetch('/api/desktop/scaffold-folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (data.ok) {
      return data;
    }
    return { ok: false, createdPath: params.folderPath, subfolders: [], error: data.error };
  } catch (err: any) {
    return {
      ok: false,
      createdPath: params.folderPath,
      subfolders: [],
      error: err?.message || 'Erro ao criar pastas no disco.',
    };
  }
}

export async function openFolderInWindowsExplorer(folderPath: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('/api/desktop/open-explorer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderPath }),
    });
    return await res.json();
  } catch (err: any) {
    return { ok: false, error: err?.message };
  }
}

export async function scanLocalFolderForVideos(folderPath: string): Promise<{
  ok: boolean;
  files?: Array<{ fileName: string; fullPath: string; sizeMB: string; updatedAt: string }>;
  error?: string;
}> {
  try {
    const res = await fetch('/api/desktop/scan-videos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderPath }),
    });
    return await res.json();
  } catch (err: any) {
    return { ok: false, error: err?.message };
  }
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
}

export function formatDateBR(isoDate: string): string {
  if (!isoDate) return '—';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function formatSecondsToTimer(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return [hrs, mins, secs].map((v) => String(v).padStart(2, '0')).join(':');
}

export function formatSecondsToHuman(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs === 0 && mins === 0) return '0m';
  if (hrs === 0) return `${mins}min`;
  return `${hrs}h ${String(mins).padStart(2, '0')}m`;
}

export function getDeadlineBadge(isoDate: string, isDelivered: boolean): {
  label: string;
  tone: 'emerald' | 'amber' | 'rose' | 'zinc';
} {
  if (isDelivered) {
    return { label: 'Entregue no Prazo', tone: 'emerald' };
  }
  if (!isoDate) return { label: 'Sem data', tone: 'zinc' };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${isoDate}T00:00:00`);
  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { label: `Atrasado ${Math.abs(diffDays)}d`, tone: 'rose' };
  }
  if (diffDays === 0) {
    return { label: 'Hoje', tone: 'rose' };
  }
  if (diffDays === 1) {
    return { label: 'Amanhã', tone: 'amber' };
  }
  if (diffDays === 2) {
    return { label: 'Em 2 dias', tone: 'amber' };
  }
  return { label: `Em ${diffDays} dias`, tone: 'zinc' };
}

export async function getFileInfo(filePath: string): Promise<{
  exists: boolean;
  sizeFormatted?: string;
  sizeBytes?: number;
  modifiedAt?: string;
}> {
  try {
    const res = await fetch('/api/desktop/file-info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath }),
    });
    return await res.json();
  } catch {
    return { exists: false };
  }
}

export function getTrashCountdown(deletedAt: string): {
  daysAgo: number;
  daysRemaining: number;
  label: string;
} {
  const deletedTime = new Date(deletedAt).getTime();
  const now = Date.now();
  const diffDays = Math.floor((now - deletedTime) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, 30 - diffDays);
  return {
    daysAgo: diffDays,
    daysRemaining,
    label: `Excluído há ${diffDays === 0 ? 'pouco' : `${diffDays}d`} · Expira em ${daysRemaining} dias`,
  };
}

export async function pickDesktopFolder(initialPath?: string): Promise<{
  ok: boolean;
  path: string | null;
  canceled?: boolean;
}> {
  try {
    const res = await fetch('/api/desktop/pick-folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initialPath }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    
  }
  return { ok: false, path: null };
}

export async function checkFolder(folderPath: string): Promise<{
  ok: boolean;
  exists: boolean;
  isDir?: boolean;
  subCount?: number;
}> {
  try {
    const res = await fetch('/api/desktop/check-folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderPath }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    
  }
  return { ok: false, exists: false };
}

export function getMediaTypeColor(mediaType?: string): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  const m = (mediaType || '').toLowerCase();
  if (m.includes('youtube') || m.includes('16:9')) {
    return {
      bg: 'bg-red-500/10',
      text: 'text-red-400',
      border: 'border-red-500/30',
      dot: '#EF4444',
    };
  }
  if (m.includes('reels') || m.includes('shorts') || m.includes('9:16') || m.includes('tiktok')) {
    return {
      bg: 'bg-purple-500/10',
      text: 'text-purple-400',
      border: 'border-purple-500/30',
      dot: '#A855F7',
    };
  }
  if (m.includes('vsl') || m.includes('comercial')) {
    return {
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/30',
      dot: '#F59E0B',
    };
  }
  if (m.includes('podcast')) {
    return {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30',
      dot: '#10B981',
    };
  }
  if (m.includes('curso') || m.includes('aula')) {
    return {
      bg: 'bg-sky-500/10',
      text: 'text-sky-400',
      border: 'border-sky-500/30',
      dot: '#38BDF8',
    };
  }
  return {
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-400',
    border: 'border-indigo-500/30',
    dot: '#6366F1',
  };
}
