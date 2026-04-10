import { createContext, useContext, useState, useCallback, useRef } from "react";

const ToastCtx = createContext(null);

let _id = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((msg, type = "info", duration = 3500) => {
    const id = ++_id;
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
  }, []);

  const toast = useCallback(
    (msg) => addToast(msg, "info"),
    [addToast]
  );
  toast.success = useCallback((msg) => addToast(msg, "success"), [addToast]);
  toast.error = useCallback((msg) => addToast(msg, "error"), [addToast]);
  toast.warn = useCallback((msg) => addToast(msg, "warn"), [addToast]);

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} setToasts={setToasts} />
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}

/* ── visual ── */

const ICONS = {
  success: "check_circle",
  error: "error",
  warn: "warning",
  info: "info",
};

const COLORS = {
  success: { bg: "#f0fdf4", border: "#86efac", text: "#166534", icon: "#22c55e" },
  error: { bg: "#fef2f2", border: "#fecaca", text: "#991b1b", icon: "#ef4444" },
  warn: { bg: "#fffbeb", border: "#fde68a", text: "#92400e", icon: "#f59e0b" },
  info: { bg: "#eff6ff", border: "#bfdbfe", text: "#1e40af", icon: "#3b82f6" },
};

function ToastContainer({ toasts, setToasts }) {
  if (toasts.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes toastIn  { from { opacity:0; transform:translateX(40px); } to { opacity:1; transform:translateX(0); } }
      `}</style>
      <div
        style={{
          position: "fixed",
          top: 20,
          right: 20,
          zIndex: 99999,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          pointerEvents: "none",
        }}
      >
        {toasts.map((t) => {
          const c = COLORS[t.type] || COLORS.info;
          return (
            <div
              key={t.id}
              style={{
                pointerEvents: "auto",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 18px",
                borderRadius: 10,
                background: c.bg,
                border: `1px solid ${c.border}`,
                color: c.text,
                fontSize: 13,
                fontWeight: 500,
                boxShadow: "0 4px 20px rgba(0,0,0,0.10)",
                animation: "toastIn 0.25s ease-out",
                maxWidth: 380,
                lineHeight: 1.4,
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 20, color: c.icon, flexShrink: 0 }}
              >
                {ICONS[t.type] || ICONS.info}
              </span>
              <span style={{ flex: 1 }}>{t.msg}</span>
              <button
                onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: c.text,
                  opacity: 0.5,
                  padding: 2,
                  fontSize: 16,
                  lineHeight: 1,
                  flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
