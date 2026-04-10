import { createContext, useContext, useState, useCallback, useRef } from "react";

const ConfirmCtx = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const resolveRef = useRef(null);

  const confirm = useCallback((msg, opts = {}) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({ msg, ...opts });
    });
  }, []);

  const prompt = useCallback((msg, opts = {}) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({ msg, isPrompt: true, ...opts });
    });
  }, []);

  function handleClose(result) {
    resolveRef.current?.(result);
    resolveRef.current = null;
    setState(null);
  }

  return (
    <ConfirmCtx.Provider value={{ confirm, prompt }}>
      {children}
      {state && <ConfirmModal state={state} onClose={handleClose} />}
    </ConfirmCtx.Provider>
  );
}

export function useConfirm() {
  return useContext(ConfirmCtx);
}

/* ── modal visual ── */

function ConfirmModal({ state, onClose }) {
  const [inputValue, setInputValue] = useState("");
  const isDanger = state.danger !== false;

  return (
    <>
      <style>{`
        @keyframes confirmFadeIn   { from { opacity:0; } to { opacity:1; } }
        @keyframes confirmSlideUp  { from { opacity:0; transform:translateY(16px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
      `}</style>

      {/* backdrop */}
      <div
        onClick={() => onClose(state.isPrompt ? null : false)}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.35)",
          zIndex: 99998,
          animation: "confirmFadeIn 0.15s ease-out",
        }}
      />

      {/* dialog */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 99999,
          background: "#fff",
          borderRadius: 14,
          padding: 28,
          width: "100%",
          maxWidth: 400,
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
          animation: "confirmSlideUp 0.2s ease-out",
        }}
      >
        {/* icon */}
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: 44,
              color: isDanger ? "#ef4444" : "#3b82f6",
              fontVariationSettings: "'FILL' 1",
            }}
          >
            {isDanger ? "warning" : "help"}
          </span>
        </div>

        {/* title */}
        {state.title && (
          <h3 style={{
            fontSize: 16, fontWeight: 700, textAlign: "center",
            color: "#1e293b", margin: "0 0 8px",
          }}>
            {state.title}
          </h3>
        )}

        {/* message */}
        <p style={{
          fontSize: 14, color: "#475569", textAlign: "center",
          lineHeight: 1.5, margin: "0 0 20px", whiteSpace: "pre-line",
        }}>
          {state.msg}
        </p>

        {/* prompt input */}
        {state.isPrompt && (
          <input
            autoFocus
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={state.placeholder || ""}
            style={{
              width: "100%",
              padding: "10px 14px",
              border: "1px solid #d1d5db",
              borderRadius: 8,
              fontSize: 14,
              outline: "none",
              marginBottom: 20,
              boxSizing: "border-box",
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") onClose(inputValue);
            }}
          />
        )}

        {/* buttons */}
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button
            onClick={() => onClose(state.isPrompt ? null : false)}
            style={{
              flex: 1,
              padding: "10px 16px",
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              background: "#fff",
              color: "#64748b",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.12s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#f8fafc"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; }}
          >
            {state.cancelText || "Cancelar"}
          </button>
          <button
            autoFocus={!state.isPrompt}
            onClick={() => onClose(state.isPrompt ? inputValue : true)}
            style={{
              flex: 1,
              padding: "10px 16px",
              borderRadius: 8,
              border: "none",
              background: isDanger ? "#ef4444" : "rgb(22,134,78)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.12s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
          >
            {state.confirmText || "Confirmar"}
          </button>
        </div>
      </div>
    </>
  );
}
