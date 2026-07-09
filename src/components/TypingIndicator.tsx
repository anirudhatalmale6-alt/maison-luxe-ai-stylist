"use client";

export function TypingIndicator() {
  return (
    <div className="flex justify-start animate-fade-in">
      <div className="w-8 h-8 rounded-full bg-brand-red flex items-center justify-center mr-2 flex-shrink-0">
        <span className="text-white text-xs font-bold">AI</span>
      </div>
      <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
        <div className="flex space-x-1.5">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-typing-dots" style={{ animationDelay: "0ms" }} />
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-typing-dots" style={{ animationDelay: "200ms" }} />
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-typing-dots" style={{ animationDelay: "400ms" }} />
        </div>
      </div>
    </div>
  );
}
