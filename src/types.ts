export type ProjectStatus =
  | 'raw_waiting'
  | 'cutting'
  | 'finishing'
  | 'review'
  | 'approved'
  | 'delivered';

export type PaymentStatus = 'pending' | 'deposit_50' | 'paid' | 'overdue';

export type VideoFormat =
  | '9:16 (Vertical / Reels / TikTok)'
  | '16:9 (Horizontal / YouTube)'
  | '16:9 & 9:16 (VSL / Anúncios)'
  | '1:1 / 4:5 (Quadrado / Feed)';

export interface ProjectTask {
  id: string;
  label: string;
  done: boolean;
}

export interface TimecodeNote {
  id: string;
  timecode: string; 
  version: 'V1' | 'V2' | 'V3' | 'Final';
  comment: string;
  resolved: boolean;
}

export interface Project {
  id: string;
  code: string; 
  title: string;
  clientId: string;
  clientName: string;
  status: ProjectStatus | string;
  format: VideoFormat;
  mediaType?: string; 
  resolution: string; 
  startDate: string;    
  deliveryDate: string; 
  paymentDate: string;  
  price: number;
  amountPaid: number;
  paymentStatus: PaymentStatus;
  revisionCount: number;
  maxRevisions: number;
  localFolderPath: string;
  foldersCreated: boolean;
  driveUrl: string;
  trackedSeconds: number;
  tasks: ProjectTask[];
  notes: TimecodeNote[];
  briefing: string;
  createdAt: string;
  archived?: boolean; 
  deletedAt?: string; 
}

export interface ProjectLane {
  id: string;
  title: string;
  color?: string;
}

export interface VideoLane {
  id: string;
  title: string;
  color?: string;
}

export interface IndexedVideo {
  id: string;
  projectId: string;
  projectTitle: string;
  clientId: string;
  clientName: string;
  title: string;
  version: 'V1' | 'V2' | 'V3' | 'Final';
  category: string; 
  format: string;
  resolution: string;
  duration: string;
  fileSize: string;
  localFilePath: string;
  exportedAt: string;
  laneId: string; 
}

export interface Client {
  id: string;
  name: string;
  companyOrChannel: string;
  whatsapp: string;
  email: string;
  driveFolder: string;
  notes: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; 
  type: 'production' | 'delivery' | 'payment' | 'custom';
  projectId?: string;
  notes?: string;
}

export interface StudioSettings {
  studioName: string;
  ownerName: string;
  pixKey: string;
  whatsapp: string;
  defaultBaseFolder: string;
  defaultTasks: string[];
  mediaTypes: string[];
  projectLanes: ProjectLane[];
  videoLanes: VideoLane[];
  showCountdownInOverview: boolean;
  motivationalQuote?: string;
}

export interface StudioDatabase {
  projects: Project[];
  archivedProjects: Project[];
  trashedProjects: Project[];
  videos: IndexedVideo[];
  clients: Client[];
  customEvents: CalendarEvent[];
  settings: StudioSettings;
}
