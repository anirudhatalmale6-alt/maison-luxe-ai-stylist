"use client";

import { useState, useEffect, useCallback } from "react";

interface Escalation {
  agent_escalation: boolean;
  customer_name: string;
  customer_id: string;
  transcript_history: string[];
  active_session: { cart: string[]; currentPath: string; lastViewed: string | null };
  escalation_id: string;
  timestamp: number;
}

export function AdminChatPanel() {
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [selectedEscalation, setSelectedEscalation] = useState<Escalation | null>(null);
  const [reply, setReply] = useState("");

  const fetchEscalations = useCallback(async () => {
    try {
      const res = await fetch("/api/webhook/escalation");
      const data = await res.json();
      setEscalations(data.escalations || []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchEscalations();
    const interval = setInterval(fetchEscalations, 3000);
    return () => clearInterval(interval);
  }, [fetchEscalations]);

  const sendReply = async () => {
    if (!reply.trim() || !selectedEscalation) return;

    alert(
      `Reply sent to ${selectedEscalation.customer_name}:\n\n"${reply}"\n\n(In a real system, this would be delivered via WebSocket or polling to the user's chat widget.)`
    );
    setReply("");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Panel</h1>
        <p className="text-gray-500 mb-8">
          Live agent escalation queue. Customer requests appear here when the AI
          cannot resolve their issue.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Escalation List */}
          <div className="md:col-span-1">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
              Escalation Queue ({escalations.length})
            </h2>
            <div className="space-y-2">
              {escalations.length === 0 && (
                <p className="text-sm text-gray-400 italic">
                  No escalations yet. Ask the AI to &quot;connect me to a human&quot; in the
                  chat widget.
                </p>
              )}
              {escalations.map((esc) => (
                <button
                  key={esc.escalation_id}
                  onClick={() => setSelectedEscalation(esc)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedEscalation?.escalation_id === esc.escalation_id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900 text-sm">
                      {esc.customer_name}
                    </span>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {esc.transcript_history[esc.transcript_history.length - 1]}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Detail View */}
          <div className="md:col-span-2">
            {selectedEscalation ? (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">
                    {selectedEscalation.customer_name}
                  </h3>
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                    Pending
                  </span>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                      Customer Message
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-3">
                      {selectedEscalation.transcript_history.map((msg, i) => (
                        <p key={i} className="text-sm text-gray-700">
                          {msg}
                        </p>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                      Session Context
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 space-y-1">
                      <p>
                        <strong>Cart:</strong>{" "}
                        {selectedEscalation.active_session.cart.length > 0
                          ? selectedEscalation.active_session.cart.join(", ")
                          : "Empty"}
                      </p>
                      <p>
                        <strong>Page:</strong>{" "}
                        {selectedEscalation.active_session.currentPath}
                      </p>
                      <p>
                        <strong>Last Viewed:</strong>{" "}
                        {selectedEscalation.active_session.lastViewed || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                    Agent Reply
                  </h4>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendReply()}
                      placeholder="Type your response..."
                      className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={sendReply}
                      disabled={!reply.trim()}
                      className="px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <svg
                  className="w-12 h-12 text-gray-300 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <p className="text-gray-400 text-sm">
                  Select an escalation to view details and respond
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
