import { create } from "zustand";

export type RecordingStatus = "idle" | "recording" | "stopped";

export interface PracticeState {
  currentSetId: string | null;
  currentQuestionIndex: number;
  questionIds: string[];
  audioBlob: Blob | null;
  recordingStatus: RecordingStatus;
  taskId: string | null;
  result: unknown | null;
  loading: boolean;
}

export interface PracticeActions {
  setCurrentSet: (setId: string | null, questionIds: string[]) => void;
  setQuestionIndex: (index: number) => void;
  setAudioBlob: (blob: Blob | null) => void;
  setRecordingStatus: (status: RecordingStatus) => void;
  setTaskId: (taskId: string | null) => void;
  setResult: (result: unknown | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

const initialState: PracticeState = {
  currentSetId: null,
  currentQuestionIndex: 0,
  questionIds: [],
  audioBlob: null,
  recordingStatus: "idle",
  taskId: null,
  result: null,
  loading: false,
};

export const usePracticeStore = create<PracticeState & PracticeActions>(
  (set) => ({
    ...initialState,
    setCurrentSet: (setId, questionIds) =>
      set({
        currentSetId: setId,
        questionIds,
        currentQuestionIndex: 0,
        result: null,
        taskId: null,
      }),
    setQuestionIndex: (index) => set({ currentQuestionIndex: index }),
    setAudioBlob: (blob) => set({ audioBlob: blob }),
    setRecordingStatus: (status) => set({ recordingStatus: status }),
    setTaskId: (taskId) => set({ taskId }),
    setResult: (result) => set({ result, loading: false }),
    setLoading: (loading) => set({ loading }),
    reset: () => set(initialState),
  }),
);
