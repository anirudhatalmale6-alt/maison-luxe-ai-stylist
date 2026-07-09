"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { ChatMessage } from "@/types";

interface AssistantState {
  messages: ChatMessage[];
  isOpen: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  voiceEnabled: boolean;
  isHandoffActive: boolean;
  isTyping: boolean;
  escalationId: string | null;
}

interface AssistantContextType extends AssistantState {
  addMessage: (msg: ChatMessage) => void;
  setIsOpen: (v: boolean) => void;
  setIsListening: (v: boolean) => void;
  setIsSpeaking: (v: boolean) => void;
  toggleVoice: () => void;
  setIsTyping: (v: boolean) => void;
  triggerHandoff: (escalationId: string) => void;
  resolveHandoff: () => void;
  clearMessages: () => void;
}

const AssistantContext = createContext<AssistantContextType | null>(null);

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isHandoffActive, setIsHandoffActive] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [escalationId, setEscalationId] = useState<string | null>(null);

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const toggleVoice = useCallback(() => {
    setVoiceEnabled((prev) => !prev);
  }, []);

  const triggerHandoff = useCallback((id: string) => {
    setIsHandoffActive(true);
    setEscalationId(id);
  }, []);

  const resolveHandoff = useCallback(() => {
    setIsHandoffActive(false);
    setEscalationId(null);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setIsHandoffActive(false);
    setEscalationId(null);
    setIsTyping(false);
  }, []);

  return (
    <AssistantContext.Provider
      value={{
        messages,
        isOpen,
        isListening,
        isSpeaking,
        voiceEnabled,
        isHandoffActive,
        isTyping,
        escalationId,
        addMessage,
        setIsOpen,
        setIsListening,
        setIsSpeaking,
        toggleVoice,
        setIsTyping,
        triggerHandoff,
        resolveHandoff,
        clearMessages,
      }}
    >
      {children}
    </AssistantContext.Provider>
  );
}

export function useAssistant() {
  const context = useContext(AssistantContext);
  if (!context) {
    throw new Error("useAssistant must be used within an AssistantProvider");
  }
  return context;
}
