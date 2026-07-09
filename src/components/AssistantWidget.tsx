"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAssistant } from "@/context/AssistantContext";
import { useStore } from "@/context/StoreContext";
import { ChatMessage } from "@/types";
import { ChatMessage as ChatMessageComponent } from "./ChatMessage";
import { SuggestionPills } from "./SuggestionPills";
import { HandoffBanner } from "./HandoffBanner";
import { TypingIndicator } from "./TypingIndicator";
import { VoiceButton } from "./VoiceButton";
import {
  createSpeechRecognition,
  speakText,
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
} from "@/lib/speech-utils";

export function AssistantWidget() {
  const {
    messages,
    isOpen,
    isHandoffActive,
    isTyping,
    isListening,
    setIsListening,
    isSpeaking,
    setIsSpeaking,
    voiceEnabled,
    toggleVoice,
    addMessage,
    setIsOpen,
    setIsTyping,
    triggerHandoff,
    clearMessages,
  } = useAssistant();

  const { cart, lastViewed, currentPath } = useStore();

  const [input, setInput] = useState("");
  const [hasShownWelcome, setHasShownWelcome] = useState(false);
  const [sttSupported, setSttSupported] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<ReturnType<typeof createSpeechRecognition> | null>(
    null
  );
  const transcriptRef = useRef("");

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  useEffect(() => {
    if (isOpen && !hasShownWelcome) {
      setHasShownWelcome(true);
    }
  }, [isOpen, hasShownWelcome]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Detect browser speech support on mount
  useEffect(() => {
    setSttSupported(isSpeechRecognitionSupported());
    setTtsSupported(isSpeechSynthesisSupported());
  }, []);

  // Clean up speech when the widget closes
  useEffect(() => {
    if (!isOpen) {
      recognitionRef.current?.stop();
      setIsListening(false);
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    }
  }, [isOpen, setIsListening]);

  // Final cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    };
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isHandoffActive) return;

      // Stop any in-progress speech before sending a new turn
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();

      const userMessage: ChatMessage = {
        id: `user_${Date.now()}`,
        role: "user",
        content: trimmed,
        timestamp: Date.now(),
      };

      addMessage(userMessage);
      setInput("");
      transcriptRef.current = "";
      setIsTyping(true);

      try {
        const response = await fetch("/api/assistant", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: trimmed,
            sessionState: { cart, currentPath, lastViewed },
            voice: voiceEnabled,
            history: messages
              .filter((m) => m.role === "user" || m.role === "assistant")
              .slice(-8)
              .map((m) => ({ role: m.role, content: m.content })),
          }),
        });

        const data = await response.json();

        const assistantMessage: ChatMessage = {
          id: `assistant_${Date.now()}`,
          role: "assistant",
          content: data.response,
          timestamp: Date.now(),
          products: data.products,
        };

        addMessage(assistantMessage);

        // Speak the reply if voice (TTS) is enabled
        if (voiceEnabled && data.response) {
          setIsSpeaking(true);
          speakText(data.response, true);
          setIsSpeaking(false);
        }

        if (data.handoff && data.escalationId) {
          triggerHandoff(data.escalationId);
        }
      } catch {
        const errorMessage: ChatMessage = {
          id: `error_${Date.now()}`,
          role: "assistant",
          content:
            "I apologize, but I'm having trouble connecting. Please try again in a moment.",
          timestamp: Date.now(),
        };
        addMessage(errorMessage);
      } finally {
        setIsTyping(false);
      }
    },
    [
      addMessage,
      setIsTyping,
      setIsSpeaking,
      triggerHandoff,
      messages,
      cart,
      currentPath,
      lastViewed,
      isHandoffActive,
      voiceEnabled,
    ]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleSuggestionSelect = (text: string) => {
    sendMessage(text);
  };

  const handleReset = () => {
    clearMessages();
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
  };

  // ── Voice (STT) ──────────────────────────────────────────────
  const startListening = useCallback(() => {
    const rec = createSpeechRecognition();
    if (!rec) return;
    recognitionRef.current = rec;
    transcriptRef.current = "";

    rec.onresult = (event: any) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      transcriptRef.current = transcript;
      setInput(transcript);
    };
    rec.onerror = () => {
      setIsListening(false);
    };
    rec.onend = () => {
      setIsListening(false);
      const text = transcriptRef.current.trim();
      if (text && !isHandoffActive) {
        sendMessage(text);
      }
    };

    try {
      rec.start();
      setIsListening(true);
    } catch {
      setIsListening(false);
    }
  }, [sendMessage, setIsListening, isHandoffActive]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, [setIsListening]);

  const toggleListening = useCallback(() => {
    if (isListening) stopListening();
    else startListening();
  }, [isListening, startListening, stopListening]);

  return (
    <>
      {/* FAB Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-luxe-ink hover:bg-luxe-gold text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center z-50 group"
          aria-label="Open stylist"
        >
          <svg
            className="w-6 h-6 group-hover:scale-110 transition-transform"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed inset-0 bg-white sm:inset-auto sm:bottom-0 sm:right-0 sm:w-full sm:max-w-full sm:h-[calc(100vh-0px)] flex flex-col z-50 overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <svg
                className="w-7 h-7"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M16 2L18.5 12L28 14L18.5 16.5L16 26L13.5 16.5L4 14L13.5 12L16 2Z"
                  fill="url(#ai-gradient)"
                />
                <defs>
                  <linearGradient
                    id="ai-gradient"
                    x1="4"
                    y1="2"
                    x2="28"
                    y2="26"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#FF6B6B" />
                    <stop offset="0.5" stopColor="#E21836" />
                    <stop offset="1" stopColor="#9B4DCA" />
                  </linearGradient>
                </defs>
              </svg>
              <h2 className="text-xl font-serif text-gray-900">Maison Luxe Stylist</h2>
              <span className="text-[10px] font-semibold tracking-wide text-gray-500 uppercase px-1.5 py-0.5 rounded bg-gray-100">
                AI
              </span>
            </div>
            <div className="flex items-center gap-1 text-gray-500">
              {ttsSupported && (
                <button
                  onClick={toggleVoice}
                  className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
                    voiceEnabled
                      ? "bg-brand-red/10 text-brand-red"
                      : "hover:bg-gray-100 text-gray-500"
                  }`}
                  aria-label={voiceEnabled ? "Turn voice replies off" : "Turn voice replies on"}
                  title={voiceEnabled ? "Voice replies on" : "Voice replies off"}
                >
                  {voiceEnabled ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5L6 9H2v6h4l5 4V5z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5L6 9H2v6h4l5 4V5z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M23 9l-6 6M17 9l6 6" />
                    </svg>
                  )}
                </button>
              )}
              <button
                onClick={handleReset}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Reset conversation"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Close assistant"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Handoff Banner */}
          <HandoffBanner />

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6 sm:px-10 lg:px-16 py-6">
            {/* Disclaimer */}
            <p className="text-[13px] text-gray-500 leading-relaxed mb-10">
              The Maison Luxe Stylist is an AI personal shopper and is still
              learning—thank you for your patience. This chat uses third-party
              technology and is recorded for quality purposes. Please do not send
              sensitive personal information. Your data is collected and stored per our{" "}
              <span className="underline cursor-pointer">Privacy Policy</span>.
              By sending a message, you also agree to our{" "}
              <span className="underline cursor-pointer">
                Terms &amp; Conditions
              </span>
              .
            </p>

            {/* Welcome / Empty State */}
            {messages.length === 0 && !isTyping && (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-3">
                  <h1 className="text-4xl sm:text-5xl font-serif text-gray-900 leading-tight">
                    What are you dressing for?
                  </h1>
                  <p className="text-base sm:text-lg text-gray-600">
                    Tell me the occasion and I&apos;ll style a complete look.
                  </p>
                </div>
                <SuggestionPills onSelect={handleSuggestionSelect} />
              </div>
            )}

            {/* Messages */}
            <div className="space-y-4">
              {messages.map((msg) => (
                <ChatMessageComponent key={msg.id} message={msg} />
              ))}
              {isTyping && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Bar */}
          <div className="px-6 sm:px-10 lg:px-16 py-5 border-t border-gray-100">
            <div className="flex items-center gap-3 bg-white rounded-full border border-gray-300 px-5 py-3 focus-within:border-gray-400 focus-within:ring-1 focus-within:ring-gray-200 transition-all">
              {sttSupported && (
                <VoiceButton
                  isListening={isListening}
                  onClick={toggleListening}
                  disabled={isHandoffActive}
                />
              )}
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isListening ? "Listening..." : "Ask me anything..."
                }
                className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none"
                disabled={isHandoffActive}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isHandoffActive}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                  input.trim() && !isHandoffActive
                    ? "bg-gray-200 text-gray-600 hover:bg-gray-300"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
                aria-label="Send message"
              >
                <svg
                  className="w-4 h-4 -rotate-90"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            {sttSupported && (
              <p className="mt-2 text-xs text-gray-400 px-2">
                {isListening
                  ? "Listening… tap the mic again to stop."
                  : "Tip: tap the mic to talk instead of type."}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
