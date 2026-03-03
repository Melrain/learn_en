import { create } from "zustand";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatState {
  messages: ChatMessage[];
  loading: boolean;
}

interface ChatActions {
  addMessage: (msg: Omit<ChatMessage, "id">) => void;
  appendToLastMessage: (content: string) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const initialState: ChatState = {
  messages: [],
  loading: false,
};

export const useChatStore = create<ChatState & ChatActions>((set) => ({
  ...initialState,
  addMessage: (msg) =>
    set((s) => ({
      messages: [...s.messages, { ...msg, id: genId() }],
    })),
  appendToLastMessage: (content) =>
    set((s) => {
      const last = s.messages[s.messages.length - 1];
      if (!last || last.role !== "assistant") return s;
      return {
        messages: [
          ...s.messages.slice(0, -1),
          { ...last, content: last.content + content },
        ],
      };
    }),
  setLoading: (loading) => set({ loading }),
  reset: () => set(initialState),
}));
