import { Conversation, ChatMessage } from "@/lib/shared/types";

export type ID = string;

export interface BaseEntity {
  id: ID;
  createdAt: number;
  updatedAt: number;
  trashed?: boolean;
  trashedAt?: number | null;
  starred?: boolean;
  projectId?: string | null;
  folderId?: string | null;
}

export interface Project extends BaseEntity {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface Folder extends BaseEntity {
  name: string;
  parentId: string | null;
  color?: string;
}

export interface WorkspaceFile extends BaseEntity {
  name: string;
  mime: string;
  size: number;
  kind: "document" | "image" | "csv" | "json" | "text" | "pdf" | "other";
  textContent?: string; // extracted searchable text
  dataUrl?: string; // for images/small previews
  originalName: string;
  starred?: boolean;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  title: string;
  content: string;
  createdAt: number;
  label?: string;
}

export interface DocumentEntity extends BaseEntity {
  title: string;
  content: string; // markdown
  contentPlain?: string;
  wordCount?: number;
  versions?: DocumentVersion[];
}

export interface SheetCell {
  value: string;
  formula?: string;
  style?: { bold?: boolean; italic?: boolean; color?: string; bg?: string };
}

export interface Sheet {
  id: string;
  title: string;
  rows: number;
  cols: number;
  cells: Record<string, SheetCell>; // key like "0:0" or "A1"
  frozenHeader?: boolean;
}

export interface Spreadsheet extends BaseEntity {
  title: string;
  sheets: Sheet[];
  csvImported?: boolean;
}

export interface NoteCheckItem {
  id: string;
  text: string;
  checked: boolean;
}

export interface Note extends BaseEntity {
  title: string;
  content: string;
  checklist?: NoteCheckItem[];
  labels: string[];
  color: string; // tailwind/hex or preset
  pinned: boolean;
  archived: boolean;
}

export interface Task extends BaseEntity {
  title: string;
  description?: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
  dueAt?: number | null;
  list?: string;
  subtasks?: { id: string; title: string; completed: boolean }[];
}

export interface EmailDraft extends BaseEntity {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  labels: string[];
  archived?: boolean;
}

export interface CalendarEvent extends BaseEntity {
  title: string;
  description?: string;
  start: number;
  end: number;
  location?: string;
  color?: string;
  reminderMinutes?: number;
  recurrence?: string | null;
}

export interface PromptTemplate extends BaseEntity {
  title: string;
  content: string;
  variables: string[];
  toolId?: string;
}

export interface WorkspaceMemory {
  id: string;
  key: string;
  value: string;
  scope: "user" | "project";
  projectId?: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  createdAt: number;
  read: boolean;
}

// Re-export conversation for workspace
export type { Conversation, ChatMessage };

export interface WorkspaceState {
  version: number;
  projects: Project[];
  folders: Folder[];
  files: WorkspaceFile[];
  documents: DocumentEntity[];
  spreadsheets: Spreadsheet[];
  notes: Note[];
  tasks: Task[];
  emailDrafts: EmailDraft[];
  calendarEvents: CalendarEvent[];
  conversations: Conversation[];
  promptTemplates: PromptTemplate[];
  memories: WorkspaceMemory[];
  notifications: AppNotification[];
  // ui
  activeProjectId: string | null;
}

export const WORKSPACE_VERSION = 2;

export type SearchableType =
  | "chat"
  | "document"
  | "file"
  | "sheet"
  | "note"
  | "task"
  | "email"
  | "event"
  | "project"
  | "folder";

export interface SearchItem {
  id: string;
  type: SearchableType;
  title: string;
  content: string;
  snippet?: string;
  createdAt: number;
  updatedAt: number;
  location?: string;
  metadata?: Record<string, unknown>;
  starred?: boolean;
}

export type AIToolId =
  | "chat"
  | "document.summarize"
  | "document.rewrite"
  | "document.expand"
  | "document.shorten"
  | "document.grammar"
  | "document.tone"
  | "document.continue"
  | "document.outline"
  | "document.title"
  | "sheet.analyze"
  | "sheet.clean"
  | "sheet.trends"
  | "note.organize"
  | "note.summarize"
  | "task.breakdown"
  | "email.draft"
  | "email.rewrite"
  | "general";

export type AIPermission = "READ" | "SUGGEST" | "MODIFY" | "CREATE" | "DELETE";

export interface AIContext {
  workspaceId?: string;
  currentView: string;
  projectId?: string | null;
  selectedDocument?: DocumentEntity | null;
  selectedFiles?: WorkspaceFile[];
  selectedRows?: unknown;
  selectedMessages?: ChatMessage[];
  selectedTasks?: Task[];
  selectedEvents?: CalendarEvent[];
  selectedNote?: Note | null;
  selectedSpreadsheet?: Spreadsheet | null;
  selectedSheetId?: string | null;
}

export interface IntegrationStatus {
  id: "drive" | "docs" | "sheets" | "gmail" | "calendar";
  status: "not_connected" | "connected" | "unavailable";
  label: string;
  description: string;
}
