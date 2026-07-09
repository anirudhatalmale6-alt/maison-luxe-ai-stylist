"use client";

interface VoiceButtonProps {
  isListening: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export function VoiceButton({ isListening, onClick, disabled }: VoiceButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
        isListening
          ? "bg-red-500 text-white animate-pulse-glow"
          : "bg-gray-100 hover:bg-gray-200 text-gray-600"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      aria-label={isListening ? "Stop listening" : "Start voice input"}
    >
      {isListening && (
        <span className="absolute inset-0 rounded-full bg-red-400 opacity-30 animate-ping" />
      )}
      <svg
        className="w-5 h-5 relative z-10"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        {isListening ? (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
          />
        ) : (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
          />
        )}
      </svg>
    </button>
  );
}
