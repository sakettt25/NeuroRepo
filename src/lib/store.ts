import { create } from "zustand";
import type { AnalyzeResponse, FileNode, AnalysisResult, DiagramSet, SandboxUrls, TourStep, ChatResponse } from "./api";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  references?: { filePath: string; functionName?: string; lineStart?: number }[];
  timestamp: Date;
}

interface AppState {
  // Session
  sessionId: string | null;
  repoUrl: string;
  isLoading: boolean;
  error: string | null;

  // Data
  repo: AnalyzeResponse["repo"] | null;
  analysis: AnalysisResult | null;
  fileTree: FileNode[];
  diagrams: DiagramSet | null;
  sandboxUrls: SandboxUrls | null;
  tour: TourStep[];

  // UI State
  activeFile: string | null;
  activeFileContent: string;
  activeFileLanguage: string;
  openFiles: { path: string; name: string }[];
  chatMessages: ChatMessage[];
  activePanel: "chat" | "insights" | "tour";
  activeDiagram: "architecture" | "dependencies" | "dataFlow";
  activeView: "code" | "diagrams" | "dashboard" | "preview";

  // Actions
  setSession: (data: AnalyzeResponse) => void;
  setActiveFile: (path: string, content: string, language: string) => void;
  closeFile: (path: string) => void;
  addChatMessage: (msg: ChatMessage) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setRepoUrl: (url: string) => void;
  setActivePanel: (panel: "chat" | "insights" | "tour") => void;
  setActiveDiagram: (type: "architecture" | "dependencies" | "dataFlow") => void;
  setActiveView: (view: "code" | "diagrams" | "dashboard" | "preview") => void;
  reset: () => void;
}

const initialState = {
  sessionId: null,
  repoUrl: "",
  isLoading: false,
  error: null,
  repo: null,
  analysis: null,
  fileTree: [],
  diagrams: null,
  sandboxUrls: null,
  tour: [],
  activeFile: null,
  activeFileContent: "",
  activeFileLanguage: "plaintext",
  openFiles: [],
  chatMessages: [],
  activePanel: "insights" as const,
  activeDiagram: "architecture" as const,
  activeView: "code" as const,
};

export const useStore = create<AppState>((set) => ({
  ...initialState,

  setSession: (data) =>
    set({
      sessionId: data.id,
      repo: data.repo,
      analysis: data.analysis,
      fileTree: data.fileTree,
      diagrams: data.diagrams,
      sandboxUrls: data.sandboxUrls,
      tour: data.tour,
      isLoading: false,
      error: null,
    }),

  setActiveFile: (path, content, language) =>
    set((state) => {
      const name = path.split("/").pop() || path;
      const alreadyOpen = state.openFiles.some((f) => f.path === path);
      return {
        activeFile: path,
        activeFileContent: content,
        activeFileLanguage: language,
        openFiles: alreadyOpen ? state.openFiles : [...state.openFiles, { path, name }],
      };
    }),

  closeFile: (path) =>
    set((state) => {
      const remaining = state.openFiles.filter((f) => f.path !== path);
      const newActive = state.activeFile === path
        ? remaining[remaining.length - 1]?.path || null
        : state.activeFile;
      return { openFiles: remaining, activeFile: newActive };
    }),

  addChatMessage: (msg) =>
    set((state) => ({ chatMessages: [...state.chatMessages, msg] })),

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),
  setRepoUrl: (repoUrl) => set({ repoUrl }),
  setActivePanel: (activePanel) => set({ activePanel }),
  setActiveDiagram: (activeDiagram) => set({ activeDiagram }),
  setActiveView: (activeView) => set({ activeView }),
  reset: () => set(initialState),
}));
