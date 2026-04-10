import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { PassThrough } from "node:stream";
import { createReadableStreamFromReadable } from "@react-router/node";
import { ServerRouter, UNSAFE_withComponentProps, Outlet, UNSAFE_withErrorBoundaryProps, Meta, Links, ScrollRestoration, Scripts, useNavigate, useLocation, NavLink } from "react-router";
import { isbot } from "isbot";
import { renderToPipeableStream } from "react-dom/server";
import { useEffect, useState, useCallback, createContext, useContext, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
const streamTimeout = 5e3;
function handleRequest(request, responseStatusCode, responseHeaders, routerContext, loadContext) {
  if (request.method.toUpperCase() === "HEAD") {
    return new Response(null, {
      status: responseStatusCode,
      headers: responseHeaders
    });
  }
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    let userAgent = request.headers.get("user-agent");
    let readyOption = userAgent && isbot(userAgent) || routerContext.isSpaMode ? "onAllReady" : "onShellReady";
    let timeoutId = setTimeout(
      () => abort(),
      streamTimeout + 1e3
    );
    const { pipe, abort } = renderToPipeableStream(
      /* @__PURE__ */ jsx(ServerRouter, { context: routerContext, url: request.url }),
      {
        [readyOption]() {
          shellRendered = true;
          const body = new PassThrough({
            final(callback) {
              clearTimeout(timeoutId);
              timeoutId = void 0;
              callback();
            }
          });
          const stream = createReadableStreamFromReadable(body);
          responseHeaders.set("Content-Type", "text/html");
          pipe(body);
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode
            })
          );
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          if (shellRendered) {
            console.error(error);
          }
        }
      }
    );
  });
}
const entryServer = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: handleRequest,
  streamTimeout
}, Symbol.toStringTag, { value: "Module" }));
function loader$1() {
  return {
    ENV: {
      SUPABASE_URL: process.env.SUPABASE_URL || "",
      SUPABASE_KEY: process.env.SUPABASE_KEY || ""
    }
  };
}
function Layout({
  children
}) {
  return /* @__PURE__ */ jsxs("html", {
    lang: "pt-BR",
    children: [/* @__PURE__ */ jsxs("head", {
      children: [/* @__PURE__ */ jsx("meta", {
        charSet: "utf-8"
      }), /* @__PURE__ */ jsx("meta", {
        name: "viewport",
        content: "width=device-width, initial-scale=1"
      }), /* @__PURE__ */ jsx("link", {
        rel: "icon",
        type: "image/svg+xml",
        href: "/favicon.svg"
      }), /* @__PURE__ */ jsx("title", {
        children: "RH Cygnuss"
      }), /* @__PURE__ */ jsx(Meta, {}), /* @__PURE__ */ jsx(Links, {}), /* @__PURE__ */ jsx("style", {
        children: `
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          html, body { height: 100%; }
          body {
            font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #f1f5f9;
            color: #1e293b;
            line-height: 1.5;
          }
          a { color: inherit; text-decoration: none; }
        `
      })]
    }), /* @__PURE__ */ jsxs("body", {
      children: [children, /* @__PURE__ */ jsx(ScrollRestoration, {}), /* @__PURE__ */ jsx(Scripts, {})]
    })]
  });
}
const root = UNSAFE_withComponentProps(function App({
  loaderData
}) {
  return /* @__PURE__ */ jsxs(Fragment, {
    children: [/* @__PURE__ */ jsx("script", {
      dangerouslySetInnerHTML: {
        __html: `window.ENV = ${JSON.stringify(loaderData.ENV)}`
      }
    }), /* @__PURE__ */ jsx(Outlet, {})]
  });
});
const ErrorBoundary = UNSAFE_withErrorBoundaryProps(function ErrorBoundary2({
  error
}) {
  return /* @__PURE__ */ jsxs("div", {
    style: {
      padding: 40,
      textAlign: "center"
    },
    children: [/* @__PURE__ */ jsx("h1", {
      style: {
        fontSize: 24,
        marginBottom: 12
      },
      children: "Erro inesperado"
    }), /* @__PURE__ */ jsx("p", {
      style: {
        color: "#64748b"
      },
      children: (error == null ? void 0 : error.message) || "Algo deu errado. Tente novamente."
    })]
  });
});
const route0 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ErrorBoundary,
  Layout,
  default: root,
  loader: loader$1
}, Symbol.toStringTag, { value: "Module" }));
const redirectLogin = UNSAFE_withComponentProps(function RedirectLogin() {
  const navigate = useNavigate();
  useEffect(() => {
    const stored = localStorage.getItem("rh_operator");
    if (stored) {
      navigate("/standalone", {
        replace: true
      });
    } else {
      navigate("/standalone/entrar", {
        replace: true
      });
    }
  }, [navigate]);
  return null;
});
const route1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: redirectLogin
}, Symbol.toStringTag, { value: "Module" }));
const TEAMLOGGER_BASE = "https://api2.teamlogger.com/api";
async function loader({
  request,
  params
}) {
  const apiKey = process.env.TEAMLOGGER_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({
      error: "TEAMLOGGER_API_KEY não configurada"
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
  const subpath = params["*"] || "";
  const url = new URL(request.url);
  const queryString = url.search;
  const endpointMap = {
    "list_users": "/integration/list_users",
    "punch_report": "/company_punch_in_out_report",
    "summary_report": "/employee_summary_report",
    "timesheet": "/timesheet_data",
    "list_teams": "/integration/list_teams",
    "manual_entries": "/integration/manual_entries"
  };
  const basePath = subpath.split("?")[0];
  const endpoint = endpointMap[basePath] || `/${basePath}`;
  try {
    const res = await fetch(`${TEAMLOGGER_BASE}${endpoint}${queryString}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      }
    });
    const data = await res.text();
    return new Response(data, {
      status: res.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate"
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({
      error: err.message
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
}
const route2 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  loader
}, Symbol.toStringTag, { value: "Module" }));
function useAuth() {
  const [operator, setOperator] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  useEffect(() => {
    try {
      const stored = localStorage.getItem("rh_operator");
      if (stored) {
        setOperator(JSON.parse(stored));
      }
    } catch {
      localStorage.removeItem("rh_operator");
    }
    setLoading(false);
  }, []);
  const login = useCallback((userData) => {
    const data = {
      id: userData.id,
      nome: userData.nome,
      email: userData.email,
      cargo: userData.cargo || "colaborador",
      avatar_url: userData.avatar_url || null,
      teamlogger_email: userData.teamlogger_email || null
    };
    localStorage.setItem("rh_operator", JSON.stringify(data));
    setOperator(data);
  }, []);
  const logout = useCallback(() => {
    localStorage.removeItem("rh_operator");
    setOperator(null);
    navigate("/standalone/entrar");
  }, [navigate]);
  return { operator, loading, login, logout };
}
let _supabase = null;
function getSupabase() {
  var _a, _b;
  if (_supabase) return _supabase;
  const url = typeof window !== "undefined" ? (_a = window.ENV) == null ? void 0 : _a.SUPABASE_URL : process.env.SUPABASE_URL;
  const key = typeof window !== "undefined" ? (_b = window.ENV) == null ? void 0 : _b.SUPABASE_KEY : process.env.SUPABASE_KEY;
  if (!url || !key) {
    console.warn("Supabase: SUPABASE_URL ou SUPABASE_KEY não configuradas.");
    return null;
  }
  _supabase = createClient(url, key);
  return _supabase;
}
const supabase = new Proxy({}, {
  get(_, prop) {
    const client = getSupabase();
    if (!client) {
      if (prop === "from") return () => ({ select: () => ({ data: [], error: null }), insert: () => ({ error: null }), update: () => ({ error: null }), delete: () => ({ error: null }) });
      return () => {
      };
    }
    const val = client[prop];
    return typeof val === "function" ? val.bind(client) : val;
  }
});
const ToastCtx = createContext(null);
let _id = 0;
function ToastProvider({ children }) {
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
  return /* @__PURE__ */ jsxs(ToastCtx.Provider, { value: toast, children: [
    children,
    /* @__PURE__ */ jsx(ToastContainer, { toasts, setToasts })
  ] });
}
function useToast() {
  return useContext(ToastCtx);
}
const ICONS = {
  success: "check_circle",
  error: "error",
  warn: "warning",
  info: "info"
};
const COLORS$1 = {
  success: { bg: "#f0fdf4", border: "#86efac", text: "#166534", icon: "#22c55e" },
  error: { bg: "#fef2f2", border: "#fecaca", text: "#991b1b", icon: "#ef4444" },
  warn: { bg: "#fffbeb", border: "#fde68a", text: "#92400e", icon: "#f59e0b" },
  info: { bg: "#eff6ff", border: "#bfdbfe", text: "#1e40af", icon: "#3b82f6" }
};
function ToastContainer({ toasts, setToasts }) {
  if (toasts.length === 0) return null;
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("style", { children: `
        @keyframes toastIn  { from { opacity:0; transform:translateX(40px); } to { opacity:1; transform:translateX(0); } }
      ` }),
    /* @__PURE__ */ jsx(
      "div",
      {
        style: {
          position: "fixed",
          top: 20,
          right: 20,
          zIndex: 99999,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          pointerEvents: "none"
        },
        children: toasts.map((t) => {
          const c = COLORS$1[t.type] || COLORS$1.info;
          return /* @__PURE__ */ jsxs(
            "div",
            {
              style: {
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
                lineHeight: 1.4
              },
              children: [
                /* @__PURE__ */ jsx(
                  "span",
                  {
                    className: "material-symbols-outlined",
                    style: { fontSize: 20, color: c.icon, flexShrink: 0 },
                    children: ICONS[t.type] || ICONS.info
                  }
                ),
                /* @__PURE__ */ jsx("span", { style: { flex: 1 }, children: t.msg }),
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    onClick: () => setToasts((prev) => prev.filter((x) => x.id !== t.id)),
                    style: {
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: c.text,
                      opacity: 0.5,
                      padding: 2,
                      fontSize: 16,
                      lineHeight: 1,
                      flexShrink: 0
                    },
                    children: "✕"
                  }
                )
              ]
            },
            t.id
          );
        })
      }
    )
  ] });
}
const ConfirmCtx = createContext(null);
function ConfirmProvider({ children }) {
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
    var _a;
    (_a = resolveRef.current) == null ? void 0 : _a.call(resolveRef, result);
    resolveRef.current = null;
    setState(null);
  }
  return /* @__PURE__ */ jsxs(ConfirmCtx.Provider, { value: { confirm, prompt }, children: [
    children,
    state && /* @__PURE__ */ jsx(ConfirmModal, { state, onClose: handleClose })
  ] });
}
function useConfirm() {
  return useContext(ConfirmCtx);
}
function ConfirmModal({ state, onClose }) {
  const [inputValue, setInputValue] = useState("");
  const isDanger = state.danger !== false;
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("style", { children: `
        @keyframes confirmFadeIn   { from { opacity:0; } to { opacity:1; } }
        @keyframes confirmSlideUp  { from { opacity:0; transform:translateY(16px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
      ` }),
    /* @__PURE__ */ jsx(
      "div",
      {
        onClick: () => onClose(state.isPrompt ? null : false),
        style: {
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.35)",
          zIndex: 99998,
          animation: "confirmFadeIn 0.15s ease-out"
        }
      }
    ),
    /* @__PURE__ */ jsxs(
      "div",
      {
        style: {
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
          animation: "confirmSlideUp 0.2s ease-out"
        },
        children: [
          /* @__PURE__ */ jsx("div", { style: { textAlign: "center", marginBottom: 16 }, children: /* @__PURE__ */ jsx(
            "span",
            {
              className: "material-symbols-outlined",
              style: {
                fontSize: 44,
                color: isDanger ? "#ef4444" : "#3b82f6",
                fontVariationSettings: "'FILL' 1"
              },
              children: isDanger ? "warning" : "help"
            }
          ) }),
          state.title && /* @__PURE__ */ jsx("h3", { style: {
            fontSize: 16,
            fontWeight: 700,
            textAlign: "center",
            color: "#1e293b",
            margin: "0 0 8px"
          }, children: state.title }),
          /* @__PURE__ */ jsx("p", { style: {
            fontSize: 14,
            color: "#475569",
            textAlign: "center",
            lineHeight: 1.5,
            margin: "0 0 20px",
            whiteSpace: "pre-line"
          }, children: state.msg }),
          state.isPrompt && /* @__PURE__ */ jsx(
            "input",
            {
              autoFocus: true,
              value: inputValue,
              onChange: (e) => setInputValue(e.target.value),
              placeholder: state.placeholder || "",
              style: {
                width: "100%",
                padding: "10px 14px",
                border: "1px solid #d1d5db",
                borderRadius: 8,
                fontSize: 14,
                outline: "none",
                marginBottom: 20,
                boxSizing: "border-box"
              },
              onKeyDown: (e) => {
                if (e.key === "Enter") onClose(inputValue);
              }
            }
          ),
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 10, justifyContent: "center" }, children: [
            /* @__PURE__ */ jsx(
              "button",
              {
                onClick: () => onClose(state.isPrompt ? null : false),
                style: {
                  flex: 1,
                  padding: "10px 16px",
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  background: "#fff",
                  color: "#64748b",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.12s"
                },
                onMouseEnter: (e) => {
                  e.currentTarget.style.background = "#f8fafc";
                },
                onMouseLeave: (e) => {
                  e.currentTarget.style.background = "#fff";
                },
                children: state.cancelText || "Cancelar"
              }
            ),
            /* @__PURE__ */ jsx(
              "button",
              {
                autoFocus: !state.isPrompt,
                onClick: () => onClose(state.isPrompt ? inputValue : true),
                style: {
                  flex: 1,
                  padding: "10px 16px",
                  borderRadius: 8,
                  border: "none",
                  background: isDanger ? "#ef4444" : "rgb(22,134,78)",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.12s"
                },
                onMouseEnter: (e) => {
                  e.currentTarget.style.opacity = "0.9";
                },
                onMouseLeave: (e) => {
                  e.currentTarget.style.opacity = "1";
                },
                children: state.confirmText || "Confirmar"
              }
            )
          ] })
        ]
      }
    )
  ] });
}
function MI({
  name,
  size = 20,
  style = {}
}) {
  return /* @__PURE__ */ jsx("span", {
    className: "material-symbols-outlined",
    style: {
      fontSize: size,
      lineHeight: 1,
      ...style
    },
    children: name
  });
}
const ADMIN_LINKS = [{
  to: "/standalone",
  label: "Dashboard",
  icon: "dashboard",
  badge: "pendentes"
}, {
  to: "/standalone/mural",
  label: "Mural",
  icon: "chat_bubble_outline",
  badge: "mural"
}, {
  to: "/standalone/home-office",
  label: "Home Office",
  icon: "home_work"
}, {
  to: "/standalone/ponto",
  label: "Métricas Home",
  icon: "bar_chart"
}, {
  to: "/standalone/funcionarios",
  label: "Funcionários",
  icon: "group"
}, {
  sep: true
}, {
  to: "/standalone/ferias",
  label: "Férias",
  icon: "event_available"
}, {
  to: "/standalone/folha",
  label: "Folha Salarial",
  icon: "payments"
}, {
  to: "/standalone/timeline",
  label: "Timeline",
  icon: "timeline"
}, {
  to: "/standalone/relatorios",
  label: "Relatórios",
  icon: "assessment"
}, {
  sep: true
}, {
  to: "/standalone/tropa",
  label: "Tropa da CYG",
  icon: "diversity_3"
}];
const GESTOR_LINKS = [{
  to: "/standalone",
  label: "Dashboard",
  icon: "dashboard"
}, {
  to: "/standalone/mural",
  label: "Mural",
  icon: "chat_bubble_outline",
  badge: "mural"
}, {
  to: "/standalone/home-office",
  label: "Home Office",
  icon: "home_work"
}, {
  to: "/standalone/ponto",
  label: "Métricas Home",
  icon: "bar_chart"
}, {
  to: "/standalone/ferias",
  label: "Férias",
  icon: "event_available"
}, {
  to: "/standalone/timeline",
  label: "Timeline",
  icon: "timeline"
}, {
  sep: true
}, {
  to: "/standalone/tropa",
  label: "Tropa da CYG",
  icon: "diversity_3"
}];
const FUNC_LINKS = [{
  to: "/standalone/mural",
  label: "Mural",
  icon: "chat_bubble_outline",
  badge: "mural"
}, {
  to: "/standalone/home-office",
  label: "Home Office",
  icon: "home_work"
}, {
  to: "/standalone/ferias",
  label: "Férias",
  icon: "event_available"
}, {
  to: "/standalone/tropa",
  label: "Tropa da CYG",
  icon: "diversity_3"
}];
function isAdminCargo(cargo) {
  return cargo === "admin" || cargo === "rh";
}
function isGestorCargo(cargo) {
  return cargo === "gestor";
}
const C = {
  bg: "#0a0a0a",
  surface: "#1e1e1e",
  active: "rgba(22,134,78,0.12)",
  border: "#1a1a1a",
  borderDropdown: "#2a2a2a",
  textPrimary: "#e2e8f0",
  textSecondary: "#ccc",
  textMuted: "#888",
  textDimmed: "#666",
  textFaint: "#555",
  green: "rgb(22,134,78)",
  greenLight: "#34C759",
  pink: "#D4789C"
};
const SISTEMAS = [{
  label: "RH Cygnuss",
  icon: "badge",
  href: null,
  active: true
}, {
  label: "Suporte",
  icon: "headset_mic",
  href: "https://suporte-cygnuss-production.up.railway.app/standalone/entrar"
}, {
  label: "Financeiro",
  icon: "attach_money",
  href: "https://financeiro-cygnuss-production-550d.up.railway.app/standalone-login"
}, {
  label: "Studio",
  icon: "palette",
  href: "https://cygnuss-studio-production.up.railway.app/catalogo"
}, {
  label: "Logistica",
  icon: "local_shipping",
  href: "https://logistica-cygnuss-production.up.railway.app/painel"
}];
const standalone = UNSAFE_withComponentProps(function StandaloneLayout() {
  const [pinned, setPinned] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [pendentes, setPendentes] = useState(0);
  const [naoLidos, setNaoLidos] = useState(0);
  const [sistemasOpen, setSistemasOpen] = useState(false);
  const [bannerUrgente, setBannerUrgente] = useState(null);
  const {
    operator,
    loading,
    logout
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isEntrar = location.pathname.includes("/entrar");
  const expanded = pinned || hovered;
  const sidebarWidth = expanded ? 220 : 64;
  useEffect(() => {
    if (!operator) return;
    async function buscarBadges() {
      if (isAdminCargo(operator.cargo)) {
        const {
          count
        } = await supabase.from("operadores").select("id", {
          count: "exact",
          head: true
        }).eq("status", "pendente");
        setPendentes(count || 0);
      }
      const {
        data: comunicados
      } = await supabase.from("comunicados").select("id, titulo, prioridade").eq("ativo", true);
      const {
        data: lidosData
      } = await supabase.from("comunicados_lidos").select("comunicado_id").eq("operator_id", operator.id);
      const lidosSet = new Set((lidosData || []).map((l) => l.comunicado_id));
      const naoLidosList = (comunicados || []).filter((c) => !lidosSet.has(c.id));
      setNaoLidos(naoLidosList.length);
      const urgente = naoLidosList.find((c) => c.prioridade === "urgente");
      setBannerUrgente(urgente || null);
    }
    buscarBadges();
    const interval = setInterval(buscarBadges, 3e4);
    return () => clearInterval(interval);
  }, [operator]);
  useEffect(() => {
    if (!loading && !operator && !isEntrar) navigate("/standalone/entrar", {
      replace: true
    });
  }, [loading, operator, isEntrar, navigate]);
  if (loading) {
    return /* @__PURE__ */ jsx("div", {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "#0a0a0a"
      },
      children: /* @__PURE__ */ jsx("p", {
        style: {
          color: C.textMuted
        },
        children: "Carregando..."
      })
    });
  }
  if (!operator) return /* @__PURE__ */ jsx(Outlet, {});
  const admin = isAdminCargo(operator.cargo);
  const gestor = isGestorCargo(operator.cargo);
  const NAV_LINKS = admin ? ADMIN_LINKS : gestor ? GESTOR_LINKS : FUNC_LINKS;
  function getBadgeCount(badge) {
    if (badge === "pendentes") return pendentes;
    if (badge === "mural") return naoLidos;
    return 0;
  }
  return /* @__PURE__ */ jsx(ToastProvider, {
    children: /* @__PURE__ */ jsx(ConfirmProvider, {
      children: /* @__PURE__ */ jsxs("div", {
        style: {
          display: "flex",
          minHeight: "100vh",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        },
        children: [/* @__PURE__ */ jsx("link", {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        }), /* @__PURE__ */ jsxs("aside", {
          translate: "no",
          className: "notranslate",
          onMouseEnter: () => !pinned && setHovered(true),
          onMouseLeave: () => setHovered(false),
          style: {
            width: sidebarWidth,
            background: C.bg,
            color: C.textPrimary,
            display: "flex",
            flexDirection: "column",
            transition: "width 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
            overflow: "hidden",
            position: "fixed",
            top: 0,
            left: 0,
            bottom: 0,
            zIndex: 1e3,
            boxShadow: !pinned && hovered ? "4px 0 24px rgba(0,0,0,0.3)" : "none"
          },
          children: [/* @__PURE__ */ jsx("div", {
            style: {
              padding: expanded ? "8px 14px" : "8px 18px",
              borderBottom: `1px solid ${C.border}`,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: expanded ? "space-between" : "center",
              minHeight: 56
            },
            children: expanded ? /* @__PURE__ */ jsxs(Fragment, {
              children: [/* @__PURE__ */ jsx("span", {
                style: {
                  fontWeight: 700,
                  fontSize: 16,
                  color: C.textPrimary,
                  whiteSpace: "nowrap",
                  cursor: "default",
                  letterSpacing: -0.3
                },
                children: "RH Cygnuss"
              }), /* @__PURE__ */ jsx("button", {
                onClick: () => setPinned(!pinned),
                title: pinned ? "Desafixar menu" : "Fixar menu",
                style: {
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 4,
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                  color: pinned ? C.green : C.textDimmed,
                  transition: "all 0.12s"
                },
                children: /* @__PURE__ */ jsx(MI, {
                  name: "push_pin",
                  size: 18,
                  style: {
                    fontVariationSettings: pinned ? "'FILL' 1" : "'FILL' 0"
                  }
                })
              })]
            }) : /* @__PURE__ */ jsx(MI, {
              name: "menu",
              size: 24,
              style: {
                color: "#9ca3af",
                cursor: "default"
              }
            })
          }), expanded && /* @__PURE__ */ jsxs("div", {
            style: {
              position: "relative",
              padding: "6px 14px 0"
            },
            children: [/* @__PURE__ */ jsxs("button", {
              onClick: () => setSistemasOpen(!sistemasOpen),
              style: {
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 6px",
                borderRadius: 6,
                border: "none",
                background: "transparent",
                color: C.textDimmed,
                fontSize: 11,
                fontWeight: 500,
                cursor: "pointer",
                transition: "background .12s"
              },
              onMouseEnter: (e) => e.currentTarget.style.background = "#141414",
              onMouseLeave: (e) => e.currentTarget.style.background = "transparent",
              children: [/* @__PURE__ */ jsxs("svg", {
                width: "13",
                height: "13",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "#555",
                strokeWidth: "2",
                children: [/* @__PURE__ */ jsx("rect", {
                  x: "3",
                  y: "3",
                  width: "7",
                  height: "7",
                  rx: "1.5"
                }), /* @__PURE__ */ jsx("rect", {
                  x: "14",
                  y: "3",
                  width: "7",
                  height: "7",
                  rx: "1.5"
                }), /* @__PURE__ */ jsx("rect", {
                  x: "3",
                  y: "14",
                  width: "7",
                  height: "7",
                  rx: "1.5"
                }), /* @__PURE__ */ jsx("rect", {
                  x: "14",
                  y: "14",
                  width: "7",
                  height: "7",
                  rx: "1.5"
                })]
              }), /* @__PURE__ */ jsx("span", {
                children: "Sistemas"
              }), /* @__PURE__ */ jsx("svg", {
                width: "8",
                height: "8",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "#555",
                strokeWidth: "3",
                style: {
                  marginLeft: "auto",
                  transition: "transform 0.2s ease",
                  transform: sistemasOpen ? "rotate(180deg)" : "rotate(0)"
                },
                children: /* @__PURE__ */ jsx("polyline", {
                  points: "6 9 12 15 18 9"
                })
              })]
            }), sistemasOpen && /* @__PURE__ */ jsx("div", {
              style: {
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 0,
                right: 0,
                background: "#141414",
                borderRadius: 10,
                padding: 4,
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                zIndex: 9999,
                border: `1px solid ${C.borderDropdown}`
              },
              children: SISTEMAS.map((s, i) => {
                if (s.active) {
                  return /* @__PURE__ */ jsxs("div", {
                    children: [/* @__PURE__ */ jsxs("div", {
                      style: {
                        padding: "7px 10px",
                        borderRadius: 7,
                        background: C.surface,
                        fontSize: 11,
                        fontWeight: 600,
                        color: C.textPrimary,
                        display: "flex",
                        alignItems: "center",
                        gap: 8
                      },
                      children: [/* @__PURE__ */ jsx(MI, {
                        name: s.icon,
                        size: 16,
                        style: {
                          color: C.pink
                        }
                      }), s.label, /* @__PURE__ */ jsx("span", {
                        style: {
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: "#22c55e",
                          marginLeft: "auto"
                        }
                      })]
                    }), /* @__PURE__ */ jsx("div", {
                      style: {
                        height: 1,
                        background: C.borderDropdown,
                        margin: "3px 6px"
                      }
                    })]
                  }, i);
                }
                return /* @__PURE__ */ jsxs("a", {
                  href: s.href,
                  target: "_blank",
                  rel: "noopener noreferrer",
                  style: {
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "7px 10px",
                    borderRadius: 7,
                    color: C.textMuted,
                    fontSize: 11,
                    fontWeight: 500,
                    textDecoration: "none",
                    transition: "all .12s"
                  },
                  onMouseEnter: (e) => {
                    e.currentTarget.style.background = C.surface;
                    e.currentTarget.style.color = C.textSecondary;
                  },
                  onMouseLeave: (e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = C.textMuted;
                  },
                  children: [/* @__PURE__ */ jsx(MI, {
                    name: s.icon,
                    size: 16
                  }), s.label, /* @__PURE__ */ jsxs("svg", {
                    width: "9",
                    height: "9",
                    viewBox: "0 0 24 24",
                    fill: "none",
                    stroke: "currentColor",
                    strokeWidth: "2",
                    style: {
                      marginLeft: "auto",
                      opacity: 0.3
                    },
                    children: [/* @__PURE__ */ jsx("path", {
                      d: "M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"
                    }), /* @__PURE__ */ jsx("polyline", {
                      points: "15 3 21 3 21 9"
                    }), /* @__PURE__ */ jsx("line", {
                      x1: "10",
                      y1: "14",
                      x2: "21",
                      y2: "3"
                    })]
                  })]
                }, i);
              })
            })]
          }), /* @__PURE__ */ jsxs("nav", {
            style: {
              flex: 1,
              overflowY: "auto",
              overflowX: "hidden",
              padding: "8px 0",
              scrollbarWidth: "none",
              msOverflowStyle: "none"
            },
            children: [/* @__PURE__ */ jsx("style", {
              children: `nav::-webkit-scrollbar { display: none; }`
            }), NAV_LINKS.map((link, i) => {
              if (link.sep) {
                return /* @__PURE__ */ jsx("div", {
                  style: {
                    height: 1,
                    background: C.border,
                    margin: "8px 12px"
                  }
                }, `sep-${i}`);
              }
              const badgeCount = link.badge ? getBadgeCount(link.badge) : 0;
              return /* @__PURE__ */ jsx(NavLink, {
                to: link.to,
                end: link.to === "/standalone",
                style: ({
                  isActive
                }) => ({
                  display: "flex",
                  alignItems: "center",
                  gap: expanded ? 12 : 0,
                  justifyContent: expanded ? "flex-start" : "center",
                  padding: expanded ? "10px 18px" : "10px 0",
                  margin: "2px 8px",
                  borderRadius: 8,
                  fontSize: 13,
                  whiteSpace: "nowrap",
                  transition: "all 0.15s ease",
                  textDecoration: "none",
                  position: "relative",
                  color: isActive ? C.green : C.textMuted,
                  fontWeight: isActive ? 600 : 400,
                  background: isActive ? C.active : "transparent"
                }),
                children: ({
                  isActive
                }) => /* @__PURE__ */ jsxs(Fragment, {
                  children: [isActive && /* @__PURE__ */ jsx("span", {
                    style: {
                      position: "absolute",
                      left: -8,
                      top: 6,
                      bottom: 6,
                      width: 3,
                      borderRadius: "0 3px 3px 0",
                      background: C.green
                    }
                  }), /* @__PURE__ */ jsxs("span", {
                    style: {
                      display: "flex",
                      alignItems: "center",
                      flexShrink: 0,
                      position: "relative"
                    },
                    children: [/* @__PURE__ */ jsx(MI, {
                      name: link.icon,
                      size: 20
                    }), !expanded && badgeCount > 0 && /* @__PURE__ */ jsx("span", {
                      style: {
                        position: "absolute",
                        top: -6,
                        right: -6,
                        background: link.badge === "mural" ? "#f59e0b" : "#ef4444",
                        color: "#fff",
                        fontSize: 8,
                        fontWeight: 700,
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: `2px solid ${C.bg}`
                      },
                      children: badgeCount
                    })]
                  }), expanded && /* @__PURE__ */ jsxs("span", {
                    style: {
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      flex: 1
                    },
                    children: [link.label, badgeCount > 0 && /* @__PURE__ */ jsx("span", {
                      style: {
                        marginLeft: "auto",
                        background: link.badge === "mural" ? "#f59e0b" : "#ef4444",
                        color: "#fff",
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "1px 6px",
                        borderRadius: 10,
                        lineHeight: "16px"
                      },
                      children: badgeCount
                    })]
                  })]
                })
              }, link.to);
            })]
          }), /* @__PURE__ */ jsxs("div", {
            style: {
              borderTop: `1px solid ${C.border}`,
              padding: expanded ? "12px 14px" : "12px 8px",
              flexShrink: 0
            },
            children: [/* @__PURE__ */ jsxs(NavLink, {
              to: "/standalone/minha-conta",
              style: {
                display: "flex",
                alignItems: "center",
                gap: expanded ? 10 : 0,
                justifyContent: expanded ? "flex-start" : "center",
                padding: "6px 4px",
                borderRadius: 8,
                textDecoration: "none",
                color: C.textPrimary,
                transition: "background 0.12s"
              },
              children: [/* @__PURE__ */ jsxs("div", {
                style: {
                  width: expanded ? 34 : 30,
                  height: expanded ? 34 : 30,
                  borderRadius: "50%",
                  flexShrink: 0,
                  background: operator.avatar_url ? "none" : C.surface,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  position: "relative"
                },
                children: [operator.avatar_url ? /* @__PURE__ */ jsx("img", {
                  src: operator.avatar_url,
                  alt: "",
                  style: {
                    width: "100%",
                    height: "100%",
                    objectFit: "cover"
                  },
                  loading: "lazy"
                }) : /* @__PURE__ */ jsx("span", {
                  style: {
                    fontSize: 14,
                    fontWeight: 600,
                    color: C.textMuted
                  },
                  children: (operator.nome || "?").charAt(0).toUpperCase()
                }), /* @__PURE__ */ jsx("span", {
                  style: {
                    position: "absolute",
                    bottom: expanded ? 0 : -1,
                    right: expanded ? 0 : -1,
                    width: expanded ? 8 : 7,
                    height: expanded ? 8 : 7,
                    borderRadius: "50%",
                    background: C.greenLight,
                    border: `2px solid ${C.bg}`
                  }
                })]
              }), expanded && /* @__PURE__ */ jsxs("div", {
                style: {
                  overflow: "hidden",
                  minWidth: 0
                },
                children: [/* @__PURE__ */ jsx("p", {
                  style: {
                    fontSize: 12,
                    fontWeight: 500,
                    color: C.textSecondary,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    margin: 0
                  },
                  children: operator.nome
                }), /* @__PURE__ */ jsx("p", {
                  style: {
                    fontSize: 10,
                    color: C.greenLight,
                    margin: 0
                  },
                  children: "Online"
                })]
              })]
            }), expanded && /* @__PURE__ */ jsxs("div", {
              style: {
                display: "flex",
                gap: 6,
                marginTop: 8
              },
              children: [/* @__PURE__ */ jsxs(NavLink, {
                to: "/standalone/minha-conta",
                style: {
                  flex: 1,
                  padding: "6px 0",
                  borderRadius: 6,
                  background: C.surface,
                  color: "#999",
                  fontSize: 10,
                  fontWeight: 500,
                  textAlign: "center",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  transition: "all 0.12s"
                },
                children: [/* @__PURE__ */ jsx(MI, {
                  name: "person",
                  size: 13
                }), " Conta"]
              }), /* @__PURE__ */ jsxs("button", {
                onClick: logout,
                style: {
                  padding: "6px 8px",
                  borderRadius: 6,
                  border: "none",
                  background: C.surface,
                  color: C.textFaint,
                  fontSize: 10,
                  fontWeight: 500,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  transition: "all 0.12s"
                },
                children: [/* @__PURE__ */ jsx(MI, {
                  name: "logout",
                  size: 13
                }), " Sair"]
              })]
            }), !expanded && /* @__PURE__ */ jsx("button", {
              onClick: logout,
              title: "Sair",
              style: {
                display: "flex",
                margin: "8px auto 0",
                background: "none",
                border: "none",
                color: C.textFaint,
                cursor: "pointer",
                padding: 4
              },
              children: /* @__PURE__ */ jsx(MI, {
                name: "logout",
                size: 18
              })
            })]
          })]
        }), /* @__PURE__ */ jsxs("main", {
          style: {
            flex: 1,
            marginLeft: pinned ? sidebarWidth : 64,
            transition: "margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
            minHeight: "100vh",
            position: "relative"
          },
          children: [bannerUrgente && !location.pathname.includes("/mural") && /* @__PURE__ */ jsxs("div", {
            onClick: () => navigate("/standalone/mural"),
            style: {
              background: "linear-gradient(90deg, #dc2626, #b91c1c)",
              color: "#fff",
              padding: "12px 24px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              animation: "bannerPulse 2s ease-in-out infinite"
            },
            children: [/* @__PURE__ */ jsx("span", {
              style: {
                fontSize: 18
              },
              children: "⚠️"
            }), /* @__PURE__ */ jsxs("span", {
              children: ["COMUNICADO URGENTE: ", bannerUrgente.titulo]
            }), /* @__PURE__ */ jsx("span", {
              style: {
                marginLeft: "auto",
                fontSize: 11,
                opacity: 0.8
              },
              children: "Clique para ver →"
            })]
          }), /* @__PURE__ */ jsx("style", {
            children: `@keyframes bannerPulse { 0%,100% { opacity:1; } 50% { opacity:0.85; } }`
          }), /* @__PURE__ */ jsx("div", {
            style: {
              padding: 24
            },
            children: /* @__PURE__ */ jsx(Outlet, {})
          })]
        })]
      })
    })
  });
});
const route3 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: standalone
}, Symbol.toStringTag, { value: "Module" }));
const MESES$1 = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
function isAdmin(cargo) {
  return cargo === "admin" || cargo === "rh" || cargo === "gestor";
}
function hojeStr() {
  const h = /* @__PURE__ */ new Date();
  return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}-${String(h.getDate()).padStart(2, "0")}`;
}
const cardBase = {
  background: "#fff",
  borderRadius: 12,
  padding: 24,
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
};
const standalone__index = UNSAFE_withComponentProps(function Dashboard() {
  const {
    operator
  } = useAuth();
  const admin = operator && isAdmin(operator.cargo);
  const [loading, setLoading] = useState(true);
  const [pendentes, setPendentes] = useState(0);
  const [hoHoje, setHoHoje] = useState(0);
  const [feriasAtivas, setFeriasAtivas] = useState(0);
  const [comunicadosNaoLidos, setComunicadosNaoLidos] = useState(0);
  const [aniversariantes, setAniversariantes] = useState([]);
  const [pessoasHO, setPessoasHO] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [muralStats, setMuralStats] = useState(null);
  useEffect(() => {
    if (operator) carregar();
  }, [operator]);
  async function carregar() {
    var _a, _b;
    setLoading(true);
    const hoje2 = hojeStr();
    const mesAtual2 = (/* @__PURE__ */ new Date()).getMonth() + 1;
    let countPendentes = 0;
    let countHO = 0;
    let countFerias = 0;
    let countComunicados = 0;
    let nomesPendentes = [];
    try {
      const {
        data: pendList,
        count
      } = await supabase.from("operadores").select("id, nome", {
        count: "exact"
      }).eq("status", "pendente");
      countPendentes = count || 0;
      nomesPendentes = (pendList || []).map((x) => x.nome);
    } catch {
    }
    try {
      const {
        count
      } = await supabase.from("home_office_schedule").select("id", {
        count: "exact",
        head: true
      }).eq("date", hoje2);
      countHO = count || 0;
    } catch {
    }
    try {
      const {
        count
      } = await supabase.from("leave_requests").select("id", {
        count: "exact",
        head: true
      }).eq("status", "approved").lte("start_date", hoje2).gte("end_date", hoje2);
      countFerias = count || 0;
    } catch {
    }
    try {
      const {
        count: totalAtivos
      } = await supabase.from("comunicados").select("id", {
        count: "exact",
        head: true
      }).eq("ativo", true);
      const {
        count: lidos
      } = await supabase.from("comunicados_lidos").select("id", {
        count: "exact",
        head: true
      }).eq("operador_id", operator.id);
      countComunicados = Math.max((totalAtivos || 0) - (lidos || 0), 0);
    } catch {
    }
    setPendentes(countPendentes);
    setHoHoje(countHO);
    setFeriasAtivas(countFerias);
    setComunicadosNaoLidos(countComunicados);
    try {
      const {
        data: perfis
      } = await supabase.from("perfil_social").select("operador_id, aniversario, operadores(nome, avatar_url)");
      const anivs = [];
      if (perfis) {
        for (const p of perfis) {
          if (!p.aniversario) continue;
          const d = /* @__PURE__ */ new Date(p.aniversario + "T12:00:00");
          if (d.getMonth() + 1 === mesAtual2) {
            anivs.push({
              nome: ((_a = p.operadores) == null ? void 0 : _a.nome) || "—",
              avatar_url: ((_b = p.operadores) == null ? void 0 : _b.avatar_url) || null,
              dia: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`,
              tipo: "aniversario"
            });
          }
        }
      }
      const {
        data: ops
      } = await supabase.from("operadores").select("id, nome, avatar_url, data_admissao").in("status", ["aprovado", "active"]);
      if (ops) {
        for (const o of ops) {
          if (!o.data_admissao) continue;
          const d = /* @__PURE__ */ new Date(o.data_admissao + "T12:00:00");
          if (d.getMonth() + 1 === mesAtual2) {
            anivs.push({
              nome: o.nome,
              avatar_url: o.avatar_url || null,
              dia: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`,
              tipo: "admissao"
            });
          }
        }
      }
      const seen = /* @__PURE__ */ new Set();
      const unique = [];
      for (const a of anivs) {
        const key = a.nome + a.dia + a.tipo;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(a);
        }
      }
      setAniversariantes(unique);
    } catch {
      setAniversariantes([]);
    }
    try {
      const {
        data: hoList
      } = await supabase.from("home_office_schedule").select("operator_id, operator_name").eq("date", hoje2);
      if (hoList && hoList.length > 0) {
        const ids = hoList.map((h) => h.operator_id).filter(Boolean);
        let avatarMap = {};
        if (ids.length > 0) {
          const {
            data: ops
          } = await supabase.from("operadores").select("id, avatar_url").in("id", ids);
          (ops || []).forEach((o) => {
            avatarMap[o.id] = o.avatar_url;
          });
        }
        setPessoasHO(hoList.map((h) => ({
          nome: h.operator_name || "—",
          avatar_url: avatarMap[h.operator_id] || null
        })));
      }
    } catch {
      setPessoasHO([]);
    }
    if (admin) {
      const lista = [];
      if (countPendentes > 0) {
        lista.push({
          icon: "!",
          texto: `${countPendentes} funcionário${countPendentes > 1 ? "s" : ""} com cadastro pendente`,
          nomes: nomesPendentes,
          count: countPendentes,
          cor: "#dc2626",
          bg: "#fef2f2",
          link: "/standalone/funcionarios"
        });
      }
      try {
        const {
          data: semTL
        } = await supabase.from("operadores").select("id, nome").in("status", ["aprovado", "active"]).or("teamlogger_email.is.null,teamlogger_email.eq.");
        const n = (semTL == null ? void 0 : semTL.length) || 0;
        if (n > 0) {
          lista.push({
            icon: "M",
            texto: `${n} funcionário${n > 1 ? "s" : ""} sem e-mail TeamLogger preenchido`,
            nomes: (semTL || []).map((x) => x.nome),
            count: n,
            cor: "#d97706",
            bg: "#fffbeb",
            link: "/standalone/funcionarios"
          });
        }
      } catch {
      }
      try {
        const {
          data: allOps
        } = await supabase.from("operadores").select("id, nome").in("status", ["aprovado", "active"]);
        const {
          data: perfisDone
        } = await supabase.from("perfil_social").select("operator_id").eq("quiz_completo", true);
        const doneSet = new Set((perfisDone || []).map((p) => p.operator_id));
        const incompletos = (allOps || []).filter((o) => !doneSet.has(o.id));
        const n = incompletos.length;
        if (n > 0) {
          lista.push({
            icon: "P",
            texto: `${n} perfil${n > 1 ? "s" : ""} incompleto${n > 1 ? "s" : ""} na Tropa da CYG`,
            nomes: incompletos.map((x) => x.nome),
            count: n,
            cor: "#7c3aed",
            bg: "#f5f3ff",
            link: "/standalone/tropa"
          });
        }
      } catch {
      }
      setAlertas(lista);
    }
    if (admin) {
      try {
        const {
          data: ultimoList
        } = await supabase.from("comunicados").select("id, titulo, created_at").eq("ativo", true).order("created_at", {
          ascending: false
        }).limit(1);
        const ultimoCom = ultimoList == null ? void 0 : ultimoList[0];
        if (ultimoCom) {
          const {
            count: totalFuncs
          } = await supabase.from("operadores").select("id", {
            count: "exact",
            head: true
          }).in("status", ["aprovado", "active"]);
          const {
            data: quemLeu
          } = await supabase.from("comunicados_lidos").select("operator_id").eq("comunicado_id", ultimoCom.id);
          const idsLeram = (quemLeu || []).map((l) => l.operator_id).filter(Boolean);
          let leram = [];
          if (idsLeram.length > 0) {
            const {
              data: opsLeram
            } = await supabase.from("operadores").select("id, nome, avatar_url").in("id", idsLeram);
            leram = (opsLeram || []).map((o) => ({
              nome: o.nome || "—",
              avatar_url: o.avatar_url || null
            }));
          }
          setMuralStats({
            titulo: ultimoCom.titulo,
            total: totalFuncs || 0,
            lidos: leram.length,
            quemLeu: leram
          });
        }
      } catch {
      }
    }
    setLoading(false);
  }
  const mesNome = MESES$1[(/* @__PURE__ */ new Date()).getMonth()];
  const alertCards = [{
    label: "Cadastros pendentes",
    valor: pendentes,
    cor: pendentes > 0 ? "#dc2626" : "#94a3b8",
    borderCor: pendentes > 0 ? "#dc2626" : "#e2e8f0"
  }, {
    label: "Home Office hoje",
    valor: hoHoje,
    cor: "rgb(22,134,78)",
    borderCor: "rgb(22,134,78)"
  }, {
    label: "Férias ativas",
    valor: feriasAtivas,
    cor: "#2563eb",
    borderCor: "#2563eb"
  }, {
    label: "Comunicados não lidos",
    valor: comunicadosNaoLidos,
    cor: comunicadosNaoLidos > 0 ? "#ea580c" : "#94a3b8",
    borderCor: comunicadosNaoLidos > 0 ? "#ea580c" : "#e2e8f0"
  }];
  const acoesRapidas = [{
    texto: "Ver escala de home office",
    link: "/standalone/home-office"
  }, {
    texto: "Consultar métricas TeamLogger",
    link: "/standalone/ponto"
  }, {
    texto: "Publicar comunicado",
    link: "/standalone/comunicados"
  }, {
    texto: "Ver relatórios",
    link: "/standalone/relatorios"
  }];
  return /* @__PURE__ */ jsxs("div", {
    style: {
      background: "#f8fafc",
      minHeight: "100vh",
      padding: 32
    },
    children: [/* @__PURE__ */ jsxs("h1", {
      style: {
        fontSize: 22,
        fontWeight: 700,
        margin: 0,
        color: "#0f172a"
      },
      children: ["Olá, ", (operator == null ? void 0 : operator.nome) || "Operador"]
    }), /* @__PURE__ */ jsx("p", {
      style: {
        fontSize: 14,
        color: "#64748b",
        margin: "4px 0 28px"
      },
      children: "Painel geral do RH Cygnuss"
    }), admin && /* @__PURE__ */ jsx("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
        gap: 16,
        marginBottom: 28
      },
      children: alertCards.map((c) => /* @__PURE__ */ jsxs("div", {
        style: {
          ...cardBase,
          borderLeft: `4px solid ${c.borderCor}`,
          padding: "18px 20px"
        },
        children: [/* @__PURE__ */ jsx("p", {
          style: {
            fontSize: 13,
            color: "#64748b",
            margin: "0 0 6px"
          },
          children: c.label
        }), /* @__PURE__ */ jsx("p", {
          style: {
            fontSize: 30,
            fontWeight: 700,
            color: c.cor,
            margin: 0
          },
          children: loading ? "..." : c.valor
        })]
      }, c.label))
    }), /* @__PURE__ */ jsxs("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: 20,
        marginBottom: 28
      },
      children: [/* @__PURE__ */ jsxs("div", {
        style: cardBase,
        children: [/* @__PURE__ */ jsxs("h3", {
          style: {
            fontSize: 15,
            fontWeight: 600,
            margin: "0 0 16px",
            color: "#0f172a"
          },
          children: ["Aniversariantes de ", mesNome]
        }), loading ? /* @__PURE__ */ jsx("p", {
          style: {
            fontSize: 14,
            color: "#94a3b8"
          },
          children: "Carregando..."
        }) : aniversariantes.length === 0 ? /* @__PURE__ */ jsx("p", {
          style: {
            fontSize: 14,
            color: "#94a3b8"
          },
          children: "Nenhum aniversariante este mês"
        }) : /* @__PURE__ */ jsx("div", {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: 10
          },
          children: aniversariantes.map((a, i) => /* @__PURE__ */ jsxs("div", {
            style: {
              display: "flex",
              alignItems: "center",
              gap: 10
            },
            children: [a.avatar_url ? /* @__PURE__ */ jsx("img", {
              src: a.avatar_url,
              alt: "",
              style: {
                width: 36,
                height: 36,
                borderRadius: "50%",
                objectFit: "cover"
              }
            }) : /* @__PURE__ */ jsx("div", {
              style: {
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "#e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 600,
                color: "#64748b"
              },
              children: a.nome.charAt(0)
            }), /* @__PURE__ */ jsxs("div", {
              children: [/* @__PURE__ */ jsx("p", {
                style: {
                  fontSize: 14,
                  fontWeight: 500,
                  margin: 0,
                  color: "#1e293b"
                },
                children: a.nome
              }), /* @__PURE__ */ jsxs("p", {
                style: {
                  fontSize: 12,
                  color: "#94a3b8",
                  margin: 0
                },
                children: [a.dia, " ", a.tipo === "admissao" ? "(admissão)" : "(aniversário)"]
              })]
            })]
          }, i))
        })]
      }), /* @__PURE__ */ jsxs("div", {
        style: cardBase,
        children: [/* @__PURE__ */ jsx("h3", {
          style: {
            fontSize: 15,
            fontWeight: 600,
            margin: "0 0 16px",
            color: "#0f172a"
          },
          children: "Quem está em Home Office hoje"
        }), loading ? /* @__PURE__ */ jsx("p", {
          style: {
            fontSize: 14,
            color: "#94a3b8"
          },
          children: "Carregando..."
        }) : pessoasHO.length === 0 ? /* @__PURE__ */ jsx("p", {
          style: {
            fontSize: 14,
            color: "#94a3b8"
          },
          children: "Ninguém escalado hoje"
        }) : /* @__PURE__ */ jsx("div", {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: 10
          },
          children: pessoasHO.map((p, i) => /* @__PURE__ */ jsxs("div", {
            style: {
              display: "flex",
              alignItems: "center",
              gap: 10
            },
            children: [p.avatar_url ? /* @__PURE__ */ jsx("img", {
              src: p.avatar_url,
              alt: "",
              style: {
                width: 36,
                height: 36,
                borderRadius: "50%",
                objectFit: "cover"
              }
            }) : /* @__PURE__ */ jsx("div", {
              style: {
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "#dcfce7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 600,
                color: "rgb(22,134,78)"
              },
              children: p.nome.charAt(0)
            }), /* @__PURE__ */ jsx("p", {
              style: {
                fontSize: 14,
                fontWeight: 500,
                margin: 0,
                color: "#1e293b"
              },
              children: p.nome
            })]
          }, i))
        })]
      }), admin && /* @__PURE__ */ jsxs("div", {
        style: cardBase,
        children: [/* @__PURE__ */ jsx("h3", {
          style: {
            fontSize: 15,
            fontWeight: 600,
            margin: "0 0 16px",
            color: "#0f172a"
          },
          children: "Alertas e Pendências"
        }), loading ? /* @__PURE__ */ jsx("p", {
          style: {
            fontSize: 14,
            color: "#94a3b8"
          },
          children: "Carregando..."
        }) : alertas.length === 0 ? /* @__PURE__ */ jsx("div", {
          style: {
            background: "#f0fdf4",
            borderRadius: 8,
            padding: 14,
            textAlign: "center",
            color: "rgb(22,134,78)",
            fontSize: 14
          },
          children: "Tudo em dia! Nenhuma pendência."
        }) : /* @__PURE__ */ jsx("div", {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: 8
          },
          children: alertas.map((a, i) => /* @__PURE__ */ jsxs("a", {
            href: a.link,
            style: {
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: a.bg,
              borderRadius: 8,
              padding: "10px 14px",
              textDecoration: "none",
              color: "inherit"
            },
            children: [/* @__PURE__ */ jsx("span", {
              style: {
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: a.cor,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 700,
                flexShrink: 0
              },
              children: a.icon
            }), /* @__PURE__ */ jsxs("div", {
              style: {
                flex: 1
              },
              children: [/* @__PURE__ */ jsx("p", {
                style: {
                  fontSize: 14,
                  margin: 0,
                  color: "#1e293b"
                },
                children: a.texto
              }), a.nomes && a.nomes.length > 0 && /* @__PURE__ */ jsx("p", {
                style: {
                  fontSize: 12,
                  margin: "4px 0 0",
                  color: "#64748b"
                },
                children: a.nomes.join(", ")
              })]
            }), /* @__PURE__ */ jsx("span", {
              style: {
                background: a.cor,
                color: "#fff",
                fontSize: 12,
                fontWeight: 700,
                borderRadius: 10,
                padding: "2px 10px",
                minWidth: 24,
                textAlign: "center"
              },
              children: a.count
            })]
          }, i))
        })]
      }), admin && muralStats && /* @__PURE__ */ jsxs("div", {
        style: cardBase,
        children: [/* @__PURE__ */ jsx("h3", {
          style: {
            fontSize: 15,
            fontWeight: 600,
            margin: "0 0 6px",
            color: "#0f172a"
          },
          children: "Leitura do Mural"
        }), /* @__PURE__ */ jsxs("p", {
          style: {
            fontSize: 12,
            color: "#94a3b8",
            margin: "0 0 14px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          },
          children: ["Último: ", muralStats.titulo]
        }), /* @__PURE__ */ jsxs("div", {
          style: {
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 14
          },
          children: [/* @__PURE__ */ jsx("div", {
            style: {
              flex: 1,
              height: 8,
              borderRadius: 4,
              background: "#e2e8f0",
              overflow: "hidden"
            },
            children: /* @__PURE__ */ jsx("div", {
              style: {
                width: muralStats.total > 0 ? `${Math.round(muralStats.lidos / muralStats.total * 100)}%` : "0%",
                height: "100%",
                borderRadius: 4,
                background: muralStats.lidos === muralStats.total ? "#22c55e" : "#3b82f6",
                transition: "width 0.3s ease"
              }
            })
          }), /* @__PURE__ */ jsxs("span", {
            style: {
              fontSize: 14,
              fontWeight: 700,
              color: "#1e293b",
              whiteSpace: "nowrap"
            },
            children: [muralStats.lidos, "/", muralStats.total]
          })]
        }), muralStats.quemLeu.length > 0 ? /* @__PURE__ */ jsxs("div", {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: 6
          },
          children: [/* @__PURE__ */ jsx("p", {
            style: {
              fontSize: 11,
              fontWeight: 600,
              color: "#64748b",
              margin: 0,
              textTransform: "uppercase"
            },
            children: "Visualizado por"
          }), /* @__PURE__ */ jsx("div", {
            style: {
              display: "flex",
              flexWrap: "wrap",
              gap: 6
            },
            children: muralStats.quemLeu.map((p, i) => /* @__PURE__ */ jsxs("div", {
              title: p.nome,
              style: {
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "#f0fdf4",
                borderRadius: 20,
                padding: "4px 10px 4px 4px",
                fontSize: 12,
                color: "#166534",
                fontWeight: 500
              },
              children: [p.avatar_url ? /* @__PURE__ */ jsx("img", {
                src: p.avatar_url,
                alt: "",
                style: {
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  objectFit: "cover"
                }
              }) : /* @__PURE__ */ jsx("div", {
                style: {
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: "#bbf7d0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#166534"
                },
                children: p.nome.charAt(0)
              }), p.nome.split(" ")[0]]
            }, i))
          }), muralStats.lidos < muralStats.total && /* @__PURE__ */ jsxs("p", {
            style: {
              fontSize: 12,
              color: "#dc2626",
              margin: "6px 0 0",
              fontWeight: 500
            },
            children: [muralStats.total - muralStats.lidos, " pessoa", muralStats.total - muralStats.lidos > 1 ? "s" : "", " ainda não leu"]
          })]
        }) : /* @__PURE__ */ jsx("p", {
          style: {
            fontSize: 13,
            color: "#dc2626",
            margin: 0
          },
          children: "Ninguém leu ainda"
        })]
      }), /* @__PURE__ */ jsxs("div", {
        style: cardBase,
        children: [/* @__PURE__ */ jsx("h3", {
          style: {
            fontSize: 15,
            fontWeight: 600,
            margin: "0 0 16px",
            color: "#0f172a"
          },
          children: "Ações Rápidas"
        }), /* @__PURE__ */ jsx("div", {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: 10
          },
          children: acoesRapidas.map((a) => /* @__PURE__ */ jsxs("a", {
            href: a.link,
            style: {
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 14,
              color: "#1e40af",
              textDecoration: "none",
              padding: "8px 12px",
              borderRadius: 8,
              background: "#f8fafc",
              transition: "background 0.15s"
            },
            onMouseEnter: (e) => e.currentTarget.style.background = "#eff6ff",
            onMouseLeave: (e) => e.currentTarget.style.background = "#f8fafc",
            children: [/* @__PURE__ */ jsx("span", {
              style: {
                fontSize: 16
              },
              children: "→"
            }), a.texto]
          }, a.link))
        })]
      })]
    })]
  });
});
const route4 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: standalone__index
}, Symbol.toStringTag, { value: "Module" }));
const standalone_entrar = UNSAFE_withComponentProps(function Entrar() {
  const [tab, setTab] = useState("login");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [carregando, setCarregando] = useState(false);
  useNavigate();
  function limpar() {
    setErro("");
    setSucesso("");
  }
  async function handleLogin(e) {
    e.preventDefault();
    limpar();
    setCarregando(true);
    try {
      const {
        data,
        error
      } = await supabase.from("operadores").select("id, nome, email, cargo, senha_hash, status, teamlogger_email, avatar_url").eq("email", email).single();
      if (error || !data) {
        setErro("E-mail não encontrado.");
        setCarregando(false);
        return;
      }
      if (data.status === "pendente") {
        setErro("Seu cadastro ainda está aguardando aprovação do administrador.");
        setCarregando(false);
        return;
      }
      if (data.status === "recusado") {
        setErro("Seu cadastro foi recusado. Entre em contato com o RH.");
        setCarregando(false);
        return;
      }
      if (data.senha_hash !== senha) {
        setErro("Senha incorreta.");
        setCarregando(false);
        return;
      }
      localStorage.setItem("rh_operator", JSON.stringify({
        id: data.id,
        nome: data.nome,
        email: data.email,
        cargo: data.cargo,
        teamlogger_email: data.teamlogger_email || "",
        avatar_url: data.avatar_url || null
      }));
      window.location.href = "/standalone";
    } catch {
      setErro("Erro ao conectar. Tente novamente.");
    }
    setCarregando(false);
  }
  async function handleCadastro(e) {
    e.preventDefault();
    limpar();
    setCarregando(true);
    try {
      const {
        data: existente
      } = await supabase.from("operadores").select("id, status").eq("email", email).single();
      if (existente) {
        if (existente.status === "pendente") {
          setErro("Cadastro já enviado. Aguarde aprovação do administrador.");
        } else {
          setErro("Este e-mail já está cadastrado. Faça login.");
        }
        setCarregando(false);
        return;
      }
      const {
        error
      } = await supabase.from("operadores").insert({
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        senha_hash: senha,
        cargo: "colaborador",
        status: "pendente"
      });
      if (error) {
        setErro("Erro ao cadastrar: " + error.message);
        setCarregando(false);
        return;
      }
      setSucesso("Cadastro enviado! Aguarde a aprovação do administrador para poder entrar.");
      setNome("");
      setEmail("");
      setSenha("");
    } catch {
      setErro("Erro ao conectar. Tente novamente.");
    }
    setCarregando(false);
  }
  const inputStyle2 = {
    padding: "10px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    fontSize: 14,
    outline: "none",
    width: "100%",
    boxSizing: "border-box"
  };
  return /* @__PURE__ */ jsx("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      background: "#f1f5f9"
    },
    children: /* @__PURE__ */ jsxs("div", {
      style: {
        background: "#fff",
        padding: 40,
        borderRadius: 12,
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        width: "100%",
        maxWidth: 420
      },
      children: [/* @__PURE__ */ jsx("h1", {
        style: {
          fontSize: 24,
          fontWeight: 700,
          textAlign: "center",
          color: "#0f172a",
          marginBottom: 4
        },
        children: "RH Cygnuss"
      }), /* @__PURE__ */ jsx("p", {
        style: {
          fontSize: 14,
          color: "#64748b",
          textAlign: "center",
          marginBottom: 20
        },
        children: tab === "login" ? "Acesse sua conta" : "Crie sua conta"
      }), /* @__PURE__ */ jsxs("div", {
        style: {
          display: "flex",
          marginBottom: 20,
          borderRadius: 8,
          overflow: "hidden",
          border: "1px solid #e2e8f0"
        },
        children: [/* @__PURE__ */ jsx("button", {
          onClick: () => {
            setTab("login");
            limpar();
          },
          style: {
            flex: 1,
            padding: "10px 0",
            border: "none",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            background: tab === "login" ? "#1e40af" : "#f8fafc",
            color: tab === "login" ? "#fff" : "#64748b",
            transition: "all 0.15s"
          },
          children: "Entrar"
        }), /* @__PURE__ */ jsx("button", {
          onClick: () => {
            setTab("cadastro");
            limpar();
          },
          style: {
            flex: 1,
            padding: "10px 0",
            border: "none",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            background: tab === "cadastro" ? "#1e40af" : "#f8fafc",
            color: tab === "cadastro" ? "#fff" : "#64748b",
            transition: "all 0.15s"
          },
          children: "Cadastrar"
        })]
      }), erro && /* @__PURE__ */ jsx("div", {
        style: {
          background: "#fef2f2",
          border: "1px solid #fecaca",
          color: "#dc2626",
          padding: "8px 12px",
          borderRadius: 6,
          fontSize: 13,
          marginBottom: 16
        },
        children: erro
      }), sucesso && /* @__PURE__ */ jsx("div", {
        style: {
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
          color: "#166534",
          padding: "8px 12px",
          borderRadius: 6,
          fontSize: 13,
          marginBottom: 16
        },
        children: sucesso
      }), tab === "login" ? /* @__PURE__ */ jsxs("form", {
        onSubmit: handleLogin,
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 14
        },
        children: [/* @__PURE__ */ jsxs("div", {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: 4
          },
          children: [/* @__PURE__ */ jsx("label", {
            style: {
              fontSize: 13,
              fontWeight: 500,
              color: "#374151"
            },
            children: "E-mail"
          }), /* @__PURE__ */ jsx("input", {
            type: "email",
            value: email,
            onChange: (e) => setEmail(e.target.value),
            required: true,
            placeholder: "seu@email.com",
            style: inputStyle2
          })]
        }), /* @__PURE__ */ jsxs("div", {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: 4
          },
          children: [/* @__PURE__ */ jsx("label", {
            style: {
              fontSize: 13,
              fontWeight: 500,
              color: "#374151"
            },
            children: "Senha"
          }), /* @__PURE__ */ jsx("input", {
            type: "password",
            value: senha,
            onChange: (e) => setSenha(e.target.value),
            required: true,
            placeholder: "••••••••",
            style: inputStyle2
          })]
        }), /* @__PURE__ */ jsx("button", {
          type: "submit",
          disabled: carregando,
          style: {
            background: carregando ? "#93c5fd" : "#1e40af",
            color: "#fff",
            border: "none",
            padding: "10px 16px",
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 600,
            cursor: carregando ? "not-allowed" : "pointer",
            marginTop: 4
          },
          children: carregando ? "Entrando..." : "Entrar"
        })]
      }) : /* @__PURE__ */ jsxs("form", {
        onSubmit: handleCadastro,
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 14
        },
        children: [/* @__PURE__ */ jsxs("div", {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: 4
          },
          children: [/* @__PURE__ */ jsx("label", {
            style: {
              fontSize: 13,
              fontWeight: 500,
              color: "#374151"
            },
            children: "Nome completo"
          }), /* @__PURE__ */ jsx("input", {
            type: "text",
            value: nome,
            onChange: (e) => setNome(e.target.value),
            required: true,
            placeholder: "Seu nome",
            style: inputStyle2
          })]
        }), /* @__PURE__ */ jsxs("div", {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: 4
          },
          children: [/* @__PURE__ */ jsx("label", {
            style: {
              fontSize: 13,
              fontWeight: 500,
              color: "#374151"
            },
            children: "E-mail"
          }), /* @__PURE__ */ jsx("input", {
            type: "email",
            value: email,
            onChange: (e) => setEmail(e.target.value),
            required: true,
            placeholder: "seu@email.com",
            style: inputStyle2
          })]
        }), /* @__PURE__ */ jsxs("div", {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: 4
          },
          children: [/* @__PURE__ */ jsx("label", {
            style: {
              fontSize: 13,
              fontWeight: 500,
              color: "#374151"
            },
            children: "Senha"
          }), /* @__PURE__ */ jsx("input", {
            type: "password",
            value: senha,
            onChange: (e) => setSenha(e.target.value),
            required: true,
            placeholder: "Crie uma senha",
            minLength: 4,
            style: inputStyle2
          })]
        }), /* @__PURE__ */ jsx("button", {
          type: "submit",
          disabled: carregando,
          style: {
            background: carregando ? "#86efac" : "#16a34a",
            color: "#fff",
            border: "none",
            padding: "10px 16px",
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 600,
            cursor: carregando ? "not-allowed" : "pointer",
            marginTop: 4
          },
          children: carregando ? "Enviando..." : "Enviar cadastro"
        }), /* @__PURE__ */ jsx("p", {
          style: {
            fontSize: 12,
            color: "#94a3b8",
            textAlign: "center",
            margin: 0
          },
          children: "Após o cadastro, um administrador precisa aprovar seu acesso."
        })]
      })]
    })
  });
});
const route5 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: standalone_entrar
}, Symbol.toStringTag, { value: "Module" }));
const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MAX_POR_DIA = 2;
function getDiasDoMes(ano, mes) {
  const primeiro = new Date(ano, mes, 1);
  const ultimo = new Date(ano, mes + 1, 0);
  const dias = [];
  for (let i = 0; i < primeiro.getDay(); i++) {
    dias.push(null);
  }
  for (let d = 1; d <= ultimo.getDate(); d++) {
    dias.push(new Date(ano, mes, d));
  }
  return dias;
}
function formatDate$1(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function isWeekday(date) {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}
const standalone_homeOffice = UNSAFE_withComponentProps(function HomeOffice() {
  const {
    operator
  } = useAuth();
  const hoje2 = /* @__PURE__ */ new Date();
  const [ano, setAno] = useState(hoje2.getFullYear());
  const [mes, setMes] = useState(hoje2.getMonth());
  const [escalas, setEscalas] = useState({});
  const [bloqueados, setBloqueados] = useState([]);
  const [teamloggerData, setTeamloggerData] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [modalEscalar, setModalEscalar] = useState(null);
  const [modalBloquear, setModalBloquear] = useState(null);
  const [motivoBloqueio, setMotivoBloqueio] = useState("");
  const [bloqueioInfo, setBloqueioInfo] = useState({});
  const isAdmin2 = (operator == null ? void 0 : operator.cargo) === "admin" || (operator == null ? void 0 : operator.cargo) === "rh" || (operator == null ? void 0 : operator.cargo) === "gestor";
  const mesNome = new Date(ano, mes).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric"
  });
  const dias = getDiasDoMes(ano, mes);
  const carregar = useCallback(async () => {
    setCarregando(true);
    const mesStr = String(mes + 1).padStart(2, "0");
    const inicioMes = `${ano}-${mesStr}-01`;
    const ultimoDia = new Date(ano, mes + 1, 0).getDate();
    const fimMes = `${ano}-${mesStr}-${ultimoDia}`;
    const {
      data: schedData
    } = await supabase.from("home_office_schedule").select("id, date, operator_id, operator_name, operator_email").gte("date", inicioMes).lte("date", fimMes);
    const {
      data: blockData
    } = await supabase.from("home_office_blocked").select("date, reason, blocked_by").gte("date", inicioMes).lte("date", fimMes);
    const agrupado = {};
    const diasComEscala = /* @__PURE__ */ new Set();
    if (schedData) {
      for (const s of schedData) {
        if (!agrupado[s.date]) agrupado[s.date] = [];
        agrupado[s.date].push({
          id: s.id,
          operator_id: s.operator_id,
          operator_name: s.operator_name || "—",
          operator_email: s.operator_email || ""
        });
        diasComEscala.add(s.date);
      }
    }
    setEscalas(agrupado);
    const bloqueiosDiretos = (blockData || []).map((b) => b.date);
    const bInfo = {};
    if (blockData) {
      for (const b of blockData) {
        bInfo[b.date] = {
          reason: b.reason || ""
        };
      }
    }
    const bloqueiosExpandidos = new Set(bloqueiosDiretos);
    const feriados = (blockData || []).filter((b) => !b.blocked_by);
    for (const feriado of feriados) {
      const d = /* @__PURE__ */ new Date(feriado.date + "T12:00:00");
      const dow = d.getDay();
      if (dow >= 1 && dow <= 5) {
        const seg = new Date(d);
        seg.setDate(d.getDate() - (dow - 1));
        for (let i = 0; i < 5; i++) {
          const dia = new Date(seg);
          dia.setDate(seg.getDate() + i);
          const dStr = formatDate$1(dia);
          bloqueiosExpandidos.add(dStr);
          if (!bInfo[dStr]) {
            bInfo[dStr] = {
              reason: `Semana bloqueada (${feriado.reason || "feriado"} ${feriado.date.split("-").reverse().join("/")})`,
              auto: true
            };
          }
        }
      }
    }
    setBloqueados([...bloqueiosExpandidos]);
    setBloqueioInfo(bInfo);
    if (isAdmin2) {
      let tlEmailToName = {};
      try {
        const usersRes = await fetch("/api/teamlogger/list_users");
        const usersJson = await usersRes.json();
        const usersList = Array.isArray(usersJson) ? usersJson : [];
        for (const u of usersList) {
          if (u.email) tlEmailToName[u.email.toLowerCase()] = u.name || u.username;
        }
      } catch {
      }
      const hojeStr22 = formatDate$1(hoje2);
      const tlData = {};
      const diasParaBuscar = [...diasComEscala].filter((d) => d <= hojeStr22);
      const chunks = [];
      for (let i = 0; i < diasParaBuscar.length; i += 5) {
        chunks.push(diasParaBuscar.slice(i, i + 5));
      }
      for (const chunk of chunks) {
        const promises = chunk.map(async (dateStr) => {
          const [, m, d] = dateStr.split("-").map(Number);
          const y = Number(dateStr.split("-")[0]);
          try {
            const res = await fetch(`/api/teamlogger/punch_report?year=${y}&month=${m}&day=${d}&timezoneOffsetMinutes=-180`);
            const json = await res.json();
            const punchList = Array.isArray(json) ? json : [];
            const dayData = {};
            for (const p of punchList) {
              const name = p.employeeName || "";
              const presente = p.punchInGMT !== "Absent" && p.totalHours > 0;
              dayData[name] = {
                presente,
                totalHours: p.totalHours || 0,
                entrada: presente ? p.punchInLocalTime : null,
                saida: presente ? p.punchOutLocalTime : null
              };
            }
            tlData[dateStr] = dayData;
          } catch {
          }
        });
        await Promise.all(promises);
      }
      setTeamloggerData({
        days: tlData,
        emailToName: tlEmailToName
      });
    }
    setCarregando(false);
  }, [ano, mes]);
  useEffect(() => {
    carregar();
  }, [carregar]);
  function abrirModalEscala(date) {
    if (!operator) return;
    const dateStr = formatDate$1(date);
    const diaEscalas = escalas[dateStr] || [];
    const meuRegistro = diaEscalas.find((e) => e.operator_id === operator.id);
    if (meuRegistro) {
      setModalEscalar({
        dateStr,
        date,
        acao: "cancelar",
        registroId: meuRegistro.id
      });
    } else {
      if (diaEscalas.length >= MAX_POR_DIA) return;
      setModalEscalar({
        dateStr,
        date,
        acao: "escalar"
      });
    }
  }
  const [erroEscala, setErroEscala] = useState("");
  async function confirmarEscala() {
    if (!modalEscalar || !operator) return;
    setErroEscala("");
    if (modalEscalar.acao === "cancelar") {
      const {
        error
      } = await supabase.from("home_office_schedule").delete().eq("id", modalEscalar.registroId);
      if (error) {
        setErroEscala(error.message);
        return;
      }
    } else {
      const {
        count
      } = await supabase.from("home_office_schedule").select("id", {
        count: "exact",
        head: true
      }).eq("date", modalEscalar.dateStr);
      if (count >= MAX_POR_DIA) {
        setErroEscala("Este dia já atingiu o limite de " + MAX_POR_DIA + " pessoas.");
        return;
      }
      const {
        error
      } = await supabase.from("home_office_schedule").insert({
        date: modalEscalar.dateStr,
        operator_id: operator.id,
        operator_name: operator.nome,
        operator_email: operator.teamlogger_email || operator.email
      });
      if (error) {
        setErroEscala(error.message);
        return;
      }
    }
    setModalEscalar(null);
    carregar();
  }
  async function bloquearDia() {
    if (!modalBloquear || !motivoBloqueio.trim()) return;
    const dateStr = modalBloquear.dateStr;
    const diaEscalas = escalas[dateStr] || [];
    for (const e of diaEscalas) {
      await supabase.from("home_office_schedule").delete().eq("id", e.id);
    }
    await supabase.from("home_office_blocked").insert({
      date: dateStr,
      reason: motivoBloqueio.trim(),
      blocked_by: operator == null ? void 0 : operator.id
    });
    setModalBloquear(null);
    setMotivoBloqueio("");
    carregar();
  }
  async function desbloquearDia(dateStr) {
    if (!isAdmin2) return;
    await supabase.from("home_office_blocked").delete().eq("date", dateStr);
    carregar();
  }
  function mudarMes(delta) {
    let novoMes = mes + delta;
    let novoAno = ano;
    if (novoMes < 0) {
      novoMes = 11;
      novoAno--;
    }
    if (novoMes > 11) {
      novoMes = 0;
      novoAno++;
    }
    setMes(novoMes);
    setAno(novoAno);
  }
  function getStatusTeamlogger(dateStr, operatorName, operatorEmail) {
    const days = (teamloggerData == null ? void 0 : teamloggerData.days) || {};
    const emailToName = (teamloggerData == null ? void 0 : teamloggerData.emailToName) || {};
    const dayData = days[dateStr];
    if (!dayData) return null;
    if (operatorEmail) {
      const tlName = emailToName[operatorEmail.toLowerCase()];
      if (tlName && dayData[tlName]) return dayData[tlName];
    }
    if (dayData[operatorName]) return dayData[operatorName];
    return {
      presente: false,
      totalHours: 0
    };
  }
  const hojeStr2 = formatDate$1(hoje2);
  return /* @__PURE__ */ jsxs("div", {
    children: [/* @__PURE__ */ jsx("h1", {
      style: {
        fontSize: 22,
        fontWeight: 700,
        marginBottom: 20
      },
      children: "Home Office"
    }), /* @__PURE__ */ jsxs("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 16,
        marginBottom: 20
      },
      children: [/* @__PURE__ */ jsx("button", {
        onClick: () => mudarMes(-1),
        style: btnNavStyle,
        children: "← Anterior"
      }), /* @__PURE__ */ jsx("span", {
        style: {
          fontSize: 16,
          fontWeight: 600,
          textTransform: "capitalize",
          minWidth: 180,
          textAlign: "center"
        },
        children: mesNome
      }), /* @__PURE__ */ jsx("button", {
        onClick: () => mudarMes(1),
        style: btnNavStyle,
        children: "Próximo →"
      })]
    }), /* @__PURE__ */ jsxs("div", {
      style: {
        display: "flex",
        gap: 16,
        marginBottom: 16,
        fontSize: 13,
        flexWrap: "wrap"
      },
      children: [/* @__PURE__ */ jsxs("span", {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 4
        },
        children: [/* @__PURE__ */ jsx("span", {
          style: {
            width: 12,
            height: 12,
            borderRadius: 3,
            background: "#dbeafe",
            display: "inline-block"
          }
        }), " Vaga disponível"]
      }), /* @__PURE__ */ jsxs("span", {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 4
        },
        children: [/* @__PURE__ */ jsx("span", {
          style: {
            width: 12,
            height: 12,
            borderRadius: 3,
            background: "#bbf7d0",
            display: "inline-block"
          }
        }), " Você escalado"]
      }), /* @__PURE__ */ jsxs("span", {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 4
        },
        children: [/* @__PURE__ */ jsx("span", {
          style: {
            width: 12,
            height: 12,
            borderRadius: 3,
            background: "#fecaca",
            display: "inline-block"
          }
        }), " Lotado / Bloqueado"]
      }), isAdmin2 && /* @__PURE__ */ jsxs(Fragment, {
        children: [/* @__PURE__ */ jsxs("span", {
          style: {
            display: "flex",
            alignItems: "center",
            gap: 4
          },
          children: [/* @__PURE__ */ jsx("span", {
            style: {
              width: 12,
              height: 12,
              borderRadius: 3,
              background: "#22c55e",
              display: "inline-block"
            }
          }), " TeamLogger ativo"]
        }), /* @__PURE__ */ jsxs("span", {
          style: {
            display: "flex",
            alignItems: "center",
            gap: 4
          },
          children: [/* @__PURE__ */ jsx("span", {
            style: {
              width: 12,
              height: 12,
              borderRadius: 3,
              background: "#ef4444",
              display: "inline-block"
            }
          }), " Não ligou TeamLogger"]
        })]
      })]
    }), carregando ? /* @__PURE__ */ jsx("p", {
      style: {
        color: "#94a3b8"
      },
      children: "Carregando calendário..."
    }) : /* @__PURE__ */ jsxs("div", {
      style: {
        background: "#fff",
        borderRadius: 10,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        padding: 16,
        overflow: "auto"
      },
      children: [/* @__PURE__ */ jsx("div", {
        style: {
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 4,
          marginBottom: 4
        },
        children: DIAS_SEMANA.map((d) => /* @__PURE__ */ jsx("div", {
          style: {
            textAlign: "center",
            fontSize: 12,
            fontWeight: 600,
            color: "#64748b",
            padding: 8
          },
          children: d
        }, d))
      }), /* @__PURE__ */ jsx("div", {
        style: {
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 4
        },
        children: dias.map((dia, i) => {
          var _a, _b;
          if (!dia) {
            return /* @__PURE__ */ jsx("div", {
              style: {
                minHeight: 90
              }
            }, `empty-${i}`);
          }
          const dateStr = formatDate$1(dia);
          const weekday = isWeekday(dia);
          const blocked = bloqueados.includes(dateStr);
          const diaEscalas = escalas[dateStr] || [];
          const meuRegistro = diaEscalas.find((e) => e.operator_id === (operator == null ? void 0 : operator.id));
          const lotado = diaEscalas.length >= MAX_POR_DIA;
          const passado = dateStr < hojeStr2;
          const ehHoje = dateStr === hojeStr2;
          let bg = "#f8fafc";
          if (!weekday) bg = "#f1f5f9";
          else if (blocked) bg = "#fef2f2";
          else if (meuRegistro) bg = "#f0fdf4";
          else if (lotado) bg = "#fff7ed";
          const clicavel = weekday && !blocked && !passado && !ehHoje ? meuRegistro || !lotado : ehHoje && weekday && !blocked && (meuRegistro || !lotado);
          return /* @__PURE__ */ jsxs("div", {
            onClick: () => clicavel && abrirModalEscala(dia),
            style: {
              minHeight: 90,
              background: bg,
              borderRadius: 6,
              padding: 8,
              cursor: clicavel ? "pointer" : "default",
              border: meuRegistro ? "2px solid #22c55e" : "1px solid #e2e8f0",
              opacity: !weekday ? 0.4 : passado ? 0.85 : 1,
              transition: "all 0.15s"
            },
            children: [/* @__PURE__ */ jsxs("div", {
              style: {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 4
              },
              children: [/* @__PURE__ */ jsx("span", {
                style: {
                  fontSize: 13,
                  fontWeight: 600,
                  color: ehHoje ? "#1e40af" : "#374151"
                },
                children: dia.getDate()
              }), isAdmin2 && weekday && !passado && /* @__PURE__ */ jsx("button", {
                onClick: (ev) => {
                  ev.stopPropagation();
                  if (blocked) {
                    desbloquearDia(dateStr);
                  } else {
                    setModalBloquear({
                      dateStr,
                      date: dia
                    });
                    setMotivoBloqueio("");
                  }
                },
                title: blocked ? `Desbloquear (${((_a = bloqueioInfo[dateStr]) == null ? void 0 : _a.reason) || ""})` : "Bloquear dia",
                style: {
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 14,
                  padding: 0,
                  lineHeight: 1,
                  opacity: blocked ? 1 : 0.4
                },
                children: blocked ? "🔒" : "🔓"
              })]
            }), blocked && /* @__PURE__ */ jsxs("div", {
              children: [/* @__PURE__ */ jsx("span", {
                style: {
                  fontSize: 11,
                  color: "#dc2626",
                  fontWeight: 700
                },
                children: "BLOQUEADO"
              }), ((_b = bloqueioInfo[dateStr]) == null ? void 0 : _b.reason) && /* @__PURE__ */ jsx("div", {
                style: {
                  fontSize: 13,
                  color: "#991b1b",
                  fontWeight: 600,
                  marginTop: 2
                },
                children: bloqueioInfo[dateStr].reason
              })]
            }), !blocked && weekday && diaEscalas.map((e) => {
              const tlStatus = isAdmin2 && (passado || ehHoje) ? getStatusTeamlogger(dateStr, e.operator_name, e.operator_email) : null;
              return /* @__PURE__ */ jsxs("div", {
                style: {
                  fontSize: 11,
                  padding: "2px 6px",
                  borderRadius: 4,
                  marginBottom: 3,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  background: e.operator_id === (operator == null ? void 0 : operator.id) ? "#bbf7d0" : "#dbeafe",
                  color: e.operator_id === (operator == null ? void 0 : operator.id) ? "#166534" : "#1e40af",
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                },
                children: [tlStatus && /* @__PURE__ */ jsx("span", {
                  style: {
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: tlStatus.presente ? "#22c55e" : "#ef4444",
                    display: "inline-block",
                    flexShrink: 0
                  },
                  title: tlStatus.presente ? `TeamLogger: ${tlStatus.totalHours.toFixed(1).replace(".", ",")}h trabalhadas` : "Não ligou o TeamLogger"
                }), /* @__PURE__ */ jsx("span", {
                  style: {
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                  },
                  children: e.operator_name
                })]
              }, e.id);
            }), isAdmin2 && !blocked && weekday && (passado || ehHoje) && diaEscalas.length > 0 && /* @__PURE__ */ jsx("div", {
              style: {
                marginTop: 2
              },
              children: diaEscalas.map((e) => {
                const tlStatus = getStatusTeamlogger(dateStr, e.operator_name, e.operator_email);
                if (!tlStatus) return null;
                if (tlStatus.presente) {
                  const pct = Math.min(Math.round(tlStatus.totalHours / 8 * 100), 100);
                  return /* @__PURE__ */ jsxs("div", {
                    style: {
                      fontSize: 9,
                      color: "#64748b",
                      marginBottom: 1
                    },
                    children: [/* @__PURE__ */ jsx("div", {
                      style: {
                        width: "100%",
                        height: 3,
                        borderRadius: 2,
                        background: "#e5e7eb",
                        overflow: "hidden",
                        marginBottom: 1
                      },
                      children: /* @__PURE__ */ jsx("div", {
                        style: {
                          width: `${pct}%`,
                          height: "100%",
                          borderRadius: 2,
                          background: pct >= 80 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#ef4444"
                        }
                      })
                    }), tlStatus.totalHours.toFixed(1).replace(".", ","), "h", tlStatus.entrada && ` (${tlStatus.entrada}`, tlStatus.saida && `-${tlStatus.saida})`]
                  }, `h-${e.id}`);
                } else {
                  return /* @__PURE__ */ jsx("div", {
                    style: {
                      fontSize: 9,
                      color: "#ef4444",
                      fontWeight: 600
                    },
                    children: "0% — não ligou"
                  }, `h-${e.id}`);
                }
              })
            }), !blocked && weekday && !passado && /* @__PURE__ */ jsxs("div", {
              style: {
                marginTop: 4
              },
              children: [meuRegistro ? /* @__PURE__ */ jsx("div", {
                onClick: (ev) => {
                  ev.stopPropagation();
                  abrirModalEscala(dia);
                },
                style: {
                  fontSize: 10,
                  color: "#dc2626",
                  cursor: "pointer",
                  background: "#fef2f2",
                  borderRadius: 4,
                  padding: "3px 6px",
                  textAlign: "center",
                  fontWeight: 500
                },
                children: "✕ Cancelar meu home office"
              }) : !lotado ? /* @__PURE__ */ jsx("div", {
                onClick: (ev) => {
                  ev.stopPropagation();
                  abrirModalEscala(dia);
                },
                style: {
                  fontSize: 10,
                  color: "#1e40af",
                  cursor: "pointer",
                  background: "#eff6ff",
                  borderRadius: 4,
                  padding: "3px 6px",
                  textAlign: "center",
                  fontWeight: 500,
                  border: "1px dashed #93c5fd"
                },
                children: "+ Escalar meu home office"
              }) : /* @__PURE__ */ jsx("div", {
                style: {
                  fontSize: 10,
                  color: "#f59e0b",
                  textAlign: "center",
                  fontWeight: 500
                },
                children: "Lotado"
              }), !lotado && !meuRegistro && /* @__PURE__ */ jsxs("div", {
                style: {
                  fontSize: 9,
                  color: "#94a3b8",
                  textAlign: "center",
                  marginTop: 2
                },
                children: [MAX_POR_DIA - diaEscalas.length, " vaga", MAX_POR_DIA - diaEscalas.length > 1 ? "s" : ""]
              })]
            })]
          }, dateStr);
        })
      })]
    }), isAdmin2 && Object.keys(escalas).length > 0 && (() => {
      const contagem = {};
      for (const [dateStr, lista] of Object.entries(escalas)) {
        for (const e of lista) {
          const nome = e.operator_name || "—";
          if (!contagem[nome]) contagem[nome] = {
            total: 0,
            dias: []
          };
          contagem[nome].total++;
          contagem[nome].dias.push(dateStr);
        }
      }
      const ranking = Object.entries(contagem).map(([nome, d]) => ({
        nome,
        total: d.total,
        dias: d.dias.sort()
      })).sort((a, b) => b.total - a.total);
      if (ranking.length === 0) return null;
      return /* @__PURE__ */ jsxs("div", {
        style: {
          background: "#fff",
          borderRadius: 12,
          padding: 24,
          marginTop: 20,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
        },
        children: [/* @__PURE__ */ jsxs("h3", {
          style: {
            fontSize: 15,
            fontWeight: 600,
            color: "#1e293b",
            marginBottom: 14
          },
          children: ["Histórico de Home Office — ", mesNome]
        }), /* @__PURE__ */ jsxs("table", {
          style: {
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 13
          },
          children: [/* @__PURE__ */ jsx("thead", {
            children: /* @__PURE__ */ jsxs("tr", {
              style: {
                borderBottom: "2px solid #e2e8f0"
              },
              children: [/* @__PURE__ */ jsx("th", {
                style: {
                  textAlign: "left",
                  padding: "8px 12px",
                  color: "#64748b",
                  fontWeight: 600,
                  fontSize: 11,
                  textTransform: "uppercase"
                },
                children: "Funcionário"
              }), /* @__PURE__ */ jsx("th", {
                style: {
                  textAlign: "center",
                  padding: "8px 12px",
                  color: "#64748b",
                  fontWeight: 600,
                  fontSize: 11,
                  textTransform: "uppercase"
                },
                children: "Dias"
              }), /* @__PURE__ */ jsx("th", {
                style: {
                  textAlign: "left",
                  padding: "8px 12px",
                  color: "#64748b",
                  fontWeight: 600,
                  fontSize: 11,
                  textTransform: "uppercase"
                },
                children: "Datas"
              })]
            })
          }), /* @__PURE__ */ jsx("tbody", {
            children: ranking.map((r) => /* @__PURE__ */ jsxs("tr", {
              style: {
                borderBottom: "1px solid #f1f5f9"
              },
              children: [/* @__PURE__ */ jsx("td", {
                style: {
                  padding: "10px 12px",
                  fontWeight: 500,
                  color: "#1e293b"
                },
                children: r.nome
              }), /* @__PURE__ */ jsx("td", {
                style: {
                  padding: "10px 12px",
                  textAlign: "center"
                },
                children: /* @__PURE__ */ jsxs("span", {
                  style: {
                    background: r.total >= 4 ? "#fef2f2" : r.total >= 2 ? "#fefce8" : "#f0fdf4",
                    color: r.total >= 4 ? "#dc2626" : r.total >= 2 ? "#a16207" : "#16a34a",
                    padding: "2px 10px",
                    borderRadius: 10,
                    fontWeight: 700,
                    fontSize: 12
                  },
                  children: [r.total, "x"]
                })
              }), /* @__PURE__ */ jsx("td", {
                style: {
                  padding: "10px 12px",
                  color: "#64748b",
                  fontSize: 12
                },
                children: r.dias.map((d) => {
                  const [y, m, day] = d.split("-");
                  return `${day}/${m}`;
                }).join(", ")
              })]
            }, r.nome))
          })]
        })]
      });
    })(), modalEscalar && /* @__PURE__ */ jsx("div", {
      onClick: () => setModalEscalar(null),
      style: {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1e3
      },
      children: /* @__PURE__ */ jsxs("div", {
        onClick: (e) => e.stopPropagation(),
        style: {
          background: "#fff",
          borderRadius: 14,
          padding: "32px 28px",
          width: 360,
          boxShadow: "0 8px 30px rgba(0,0,0,0.15)",
          textAlign: "center"
        },
        children: [/* @__PURE__ */ jsx("div", {
          style: {
            width: 48,
            height: 48,
            borderRadius: "50%",
            margin: "0 auto 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            background: modalEscalar.acao === "escalar" ? "#eff6ff" : "#fef2f2"
          },
          children: modalEscalar.acao === "escalar" ? "🏠" : "✕"
        }), /* @__PURE__ */ jsx("h3", {
          style: {
            fontSize: 17,
            fontWeight: 700,
            color: "#1e293b",
            marginBottom: 6
          },
          children: modalEscalar.acao === "escalar" ? "Confirmar Home Office" : "Cancelar Home Office"
        }), /* @__PURE__ */ jsx("p", {
          style: {
            fontSize: 14,
            color: "#64748b",
            marginBottom: 4
          },
          children: modalEscalar.date.toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "numeric",
            month: "long"
          })
        }), /* @__PURE__ */ jsx("p", {
          style: {
            fontSize: 15,
            color: "#1e293b",
            fontWeight: 600,
            marginBottom: 16
          },
          children: operator == null ? void 0 : operator.nome
        }), erroEscala && /* @__PURE__ */ jsxs("div", {
          style: {
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#dc2626",
            padding: "8px 12px",
            borderRadius: 6,
            fontSize: 12,
            marginBottom: 16,
            textAlign: "left"
          },
          children: ["Erro: ", erroEscala]
        }), /* @__PURE__ */ jsxs("div", {
          style: {
            display: "flex",
            gap: 10,
            justifyContent: "center"
          },
          children: [/* @__PURE__ */ jsx("button", {
            onClick: () => setModalEscalar(null),
            style: {
              padding: "10px 24px",
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              background: "#fff",
              fontSize: 14,
              cursor: "pointer",
              fontWeight: 500,
              color: "#64748b"
            },
            children: "Voltar"
          }), /* @__PURE__ */ jsx("button", {
            onClick: confirmarEscala,
            style: {
              padding: "10px 24px",
              borderRadius: 8,
              border: "none",
              background: modalEscalar.acao === "escalar" ? "#1e40af" : "#dc2626",
              color: "#fff",
              fontSize: 14,
              cursor: "pointer",
              fontWeight: 600
            },
            children: modalEscalar.acao === "escalar" ? "Confirmar" : "Sim, cancelar"
          })]
        })]
      })
    }), modalBloquear && /* @__PURE__ */ jsx("div", {
      onClick: () => setModalBloquear(null),
      style: {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1e3
      },
      children: /* @__PURE__ */ jsxs("div", {
        onClick: (e) => e.stopPropagation(),
        style: {
          background: "#fff",
          borderRadius: 12,
          padding: 28,
          width: 380,
          boxShadow: "0 8px 30px rgba(0,0,0,0.15)"
        },
        children: [/* @__PURE__ */ jsx("h3", {
          style: {
            fontSize: 16,
            fontWeight: 700,
            marginBottom: 6,
            color: "#1e293b"
          },
          children: "🔒 Bloquear dia"
        }), /* @__PURE__ */ jsx("p", {
          style: {
            fontSize: 13,
            color: "#64748b",
            marginBottom: 16
          },
          children: modalBloquear.date.toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "numeric",
            month: "long"
          })
        }), (escalas[modalBloquear.dateStr] || []).length > 0 && /* @__PURE__ */ jsxs("div", {
          style: {
            background: "#fef3c7",
            borderRadius: 6,
            padding: 10,
            marginBottom: 14,
            fontSize: 12,
            color: "#92400e"
          },
          children: ["⚠️ ", (escalas[modalBloquear.dateStr] || []).length, " pessoa(s) escalada(s) neste dia serão removidas."]
        }), /* @__PURE__ */ jsx("label", {
          style: {
            fontSize: 13,
            fontWeight: 600,
            color: "#374151",
            display: "block",
            marginBottom: 6
          },
          children: "Motivo"
        }), /* @__PURE__ */ jsx("input", {
          type: "text",
          value: motivoBloqueio,
          onChange: (e) => setMotivoBloqueio(e.target.value),
          placeholder: "Ex: Reunião, Feriado, Evento...",
          autoFocus: true,
          onKeyDown: (e) => e.key === "Enter" && bloquearDia(),
          style: {
            width: "100%",
            padding: "8px 12px",
            borderRadius: 6,
            border: "1px solid #d1d5db",
            fontSize: 14,
            marginBottom: 18,
            outline: "none",
            boxSizing: "border-box"
          }
        }), /* @__PURE__ */ jsxs("div", {
          style: {
            display: "flex",
            gap: 10,
            justifyContent: "flex-end"
          },
          children: [/* @__PURE__ */ jsx("button", {
            onClick: () => setModalBloquear(null),
            style: {
              padding: "8px 18px",
              borderRadius: 6,
              border: "1px solid #e2e8f0",
              background: "#fff",
              fontSize: 13,
              cursor: "pointer",
              fontWeight: 500
            },
            children: "Cancelar"
          }), /* @__PURE__ */ jsx("button", {
            onClick: bloquearDia,
            disabled: !motivoBloqueio.trim(),
            style: {
              padding: "8px 18px",
              borderRadius: 6,
              border: "none",
              background: motivoBloqueio.trim() ? "#dc2626" : "#e5e7eb",
              color: motivoBloqueio.trim() ? "#fff" : "#9ca3af",
              fontSize: 13,
              cursor: motivoBloqueio.trim() ? "pointer" : "default",
              fontWeight: 600
            },
            children: "Bloquear"
          })]
        })]
      })
    })]
  });
});
const btnNavStyle = {
  background: "#f1f5f9",
  border: "1px solid #e2e8f0",
  padding: "6px 14px",
  borderRadius: 6,
  fontSize: 13,
  cursor: "pointer",
  fontWeight: 500
};
const route6 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: standalone_homeOffice
}, Symbol.toStringTag, { value: "Module" }));
function calcDiasUteis(inicio, fim) {
  if (!inicio || !fim) return 0;
  const d1 = /* @__PURE__ */ new Date(inicio + "T00:00:00");
  const d2 = /* @__PURE__ */ new Date(fim + "T00:00:00");
  if (d2 < d1) return 0;
  let count = 0;
  const cur = new Date(d1);
  while (cur <= d2) {
    const day = cur.getDay();
    if (day >= 1 && day <= 5) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}
function fmtDate(d) {
  if (!d) return "—";
  const parts = d.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return d;
}
function fmtDateTime(dt) {
  if (!dt) return "—";
  const d = new Date(dt);
  return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  });
}
function mesAtual() {
  const now = /* @__PURE__ */ new Date();
  return {
    ano: now.getFullYear(),
    mes: now.getMonth()
  };
}
const COLORS = {
  bg: "#f8fafc",
  card: "#ffffff",
  green: "rgb(22,134,78)",
  greenLight: "#dcfce7",
  greenDark: "#166534",
  yellow: "#f59e0b",
  yellowLight: "#fef3c7",
  yellowDark: "#92400e",
  red: "#dc2626",
  redLight: "#fecaca",
  redDark: "#991b1b",
  blue: "#1e40af",
  textPrimary: "#1e293b",
  textSecondary: "#64748b",
  border: "#e2e8f0",
  borderLight: "#f1f5f9"
};
const statusConfig = {
  pendente: {
    label: "Pendente",
    bg: COLORS.yellowLight,
    color: COLORS.yellowDark
  },
  aprovado: {
    label: "Aprovado",
    bg: COLORS.greenLight,
    color: COLORS.greenDark
  },
  recusado: {
    label: "Recusado",
    bg: COLORS.redLight,
    color: COLORS.redDark
  }
};
const tipoLabels = {
  ferias: "Ferias",
  abono: "Abono",
  licenca: "Licenca"
};
const inputStyle$2 = {
  width: "100%",
  padding: "8px 12px",
  border: `1px solid #d1d5db`,
  borderRadius: 6,
  fontSize: 14,
  outline: "none",
  marginTop: 4,
  boxSizing: "border-box"
};
const cardStyle$2 = {
  background: COLORS.card,
  borderRadius: 10,
  padding: 20,
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
};
const btnBase = {
  border: "none",
  borderRadius: 6,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  padding: "8px 16px"
};
const standalone_ferias = UNSAFE_withComponentProps(function Ferias() {
  const {
    operator
  } = useAuth();
  const toast = useToast();
  const {
    confirm
  } = useConfirm();
  const isAdmin2 = (operator == null ? void 0 : operator.cargo) === "admin" || (operator == null ? void 0 : operator.cargo) === "rh" || (operator == null ? void 0 : operator.cargo) === "gestor";
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [minhasSolicitacoes, setMinhasSolicitacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [mostraForm, setMostraForm] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [calMes, setCalMes] = useState(mesAtual());
  const [form, setForm] = useState({
    data_inicio: "",
    data_fim: "",
    tipo: "ferias",
    motivo: ""
  });
  const [enviando, setEnviando] = useState(false);
  const carregar = useCallback(async () => {
    if (!operator) return;
    setCarregando(true);
    if (isAdmin2) {
      const {
        data
      } = await supabase.from("ferias").select("*").order("created_at", {
        ascending: false
      });
      if (data) setSolicitacoes(data);
    }
    const {
      data: minhas
    } = await supabase.from("ferias").select("*").eq("operator_id", operator.id).order("created_at", {
      ascending: false
    });
    if (minhas) setMinhasSolicitacoes(minhas);
    setCarregando(false);
  }, [operator, isAdmin2]);
  useEffect(() => {
    if (operator) carregar();
  }, [operator, carregar]);
  const diasUsados = minhasSolicitacoes.filter((s) => s.status === "aprovado" && s.tipo === "ferias").reduce((sum, s) => sum + (s.dias || 0), 0);
  const diasTotal = 30;
  const diasRestantes = diasTotal - diasUsados;
  const pendentes = isAdmin2 ? solicitacoes.filter((s) => s.status === "pendente") : [];
  const aprovadosMes = isAdmin2 ? solicitacoes.filter((s) => {
    if (s.status !== "aprovado" || !s.aprovado_em) return false;
    const d = new Date(s.aprovado_em);
    const now = /* @__PURE__ */ new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }) : [];
  const emFeriasHoje = isAdmin2 ? solicitacoes.filter((s) => {
    if (s.status !== "aprovado") return false;
    const hoje2 = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    return s.data_inicio <= hoje2 && s.data_fim >= hoje2;
  }) : [];
  const solicitacoesFiltradas = isAdmin2 ? filtroStatus === "todos" ? solicitacoes : solicitacoes.filter((s) => s.status === filtroStatus) : [];
  async function enviarSolicitacao(e) {
    e.preventDefault();
    const dias = calcDiasUteis(form.data_inicio, form.data_fim);
    if (dias <= 0) {
      toast.warn("Período inválido. A data fim deve ser posterior à data início.");
      return;
    }
    if (form.tipo === "ferias" && dias < 5) {
      toast.warn("Para férias, o período mínimo é de 5 dias úteis.");
      return;
    }
    setEnviando(true);
    const {
      error
    } = await supabase.from("ferias").insert({
      operator_id: operator.id,
      operator_nome: operator.nome,
      data_inicio: form.data_inicio,
      data_fim: form.data_fim,
      dias,
      tipo: form.tipo,
      motivo: form.motivo || null,
      status: "pendente"
    });
    if (error) {
      toast.error("Erro ao enviar solicitação: " + error.message);
    } else {
      toast.success("Solicitação enviada com sucesso!");
      setForm({
        data_inicio: "",
        data_fim: "",
        tipo: "ferias",
        motivo: ""
      });
      setMostraForm(false);
      carregar();
    }
    setEnviando(false);
  }
  async function aprovar(id) {
    const {
      error
    } = await supabase.from("ferias").update({
      status: "aprovado",
      aprovado_por: operator.id,
      aprovado_por_nome: operator.nome,
      aprovado_em: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("id", id);
    if (error) toast.error("Erro ao aprovar: " + error.message);
    else {
      toast.success("Solicitação aprovada!");
      carregar();
    }
  }
  async function recusar(id) {
    const {
      error
    } = await supabase.from("ferias").update({
      status: "recusado",
      aprovado_por: operator.id,
      aprovado_por_nome: operator.nome,
      aprovado_em: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("id", id);
    if (error) toast.error("Erro ao recusar: " + error.message);
    else {
      toast.success("Solicitação recusada.");
      carregar();
    }
  }
  async function cancelar(id) {
    const ok = await confirm("Deseja cancelar esta solicitação?", {
      title: "Cancelar solicitação",
      confirmText: "Sim, cancelar",
      danger: true
    });
    if (!ok) return;
    const {
      error
    } = await supabase.from("ferias").delete().eq("id", id);
    if (error) toast.error("Erro ao cancelar: " + error.message);
    else {
      toast.success("Solicitação cancelada.");
      carregar();
    }
  }
  function getDiasDoMes2(ano, mes) {
    return new Date(ano, mes + 1, 0).getDate();
  }
  function getPrimeiroDiaSemana(ano, mes) {
    return new Date(ano, mes, 1).getDay();
  }
  function navegarMes(dir) {
    setCalMes((prev) => {
      let m = prev.mes + dir;
      let a = prev.ano;
      if (m < 0) {
        m = 11;
        a--;
      }
      if (m > 11) {
        m = 0;
        a++;
      }
      return {
        ano: a,
        mes: m
      };
    });
  }
  const mesesNome = ["Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  function feriasNoMes() {
    if (!isAdmin2) return [];
    const anoStr = String(calMes.ano);
    const mesStr = String(calMes.mes + 1).padStart(2, "0");
    const mesPrefix = `${anoStr}-${mesStr}`;
    const primeiroDia2 = `${mesPrefix}-01`;
    const ultimoDia = `${mesPrefix}-${String(getDiasDoMes2(calMes.ano, calMes.mes)).padStart(2, "0")}`;
    return solicitacoes.filter((s) => s.status === "aprovado" && s.data_inicio <= ultimoDia && s.data_fim >= primeiroDia2);
  }
  function StatusBadge({
    status
  }) {
    const cfg = statusConfig[status] || statusConfig.pendente;
    return /* @__PURE__ */ jsx("span", {
      style: {
        background: cfg.bg,
        color: cfg.color,
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: "nowrap"
      },
      children: cfg.label
    });
  }
  function SummaryCard({
    label,
    value,
    accent
  }) {
    return /* @__PURE__ */ jsxs("div", {
      style: {
        ...cardStyle$2,
        borderLeft: `4px solid ${accent}`,
        padding: 16
      },
      children: [/* @__PURE__ */ jsx("p", {
        style: {
          fontSize: 12,
          color: COLORS.textSecondary,
          marginBottom: 4
        },
        children: label
      }), /* @__PURE__ */ jsx("p", {
        style: {
          fontSize: 26,
          fontWeight: 700,
          color: accent,
          margin: 0
        },
        children: value
      })]
    });
  }
  if (carregando && !solicitacoes.length && !minhasSolicitacoes.length) {
    return /* @__PURE__ */ jsx("div", {
      style: {
        background: COLORS.bg,
        minHeight: "100vh",
        padding: 32
      },
      children: /* @__PURE__ */ jsx("p", {
        style: {
          color: COLORS.textSecondary,
          textAlign: "center",
          marginTop: 60
        },
        children: "Carregando..."
      })
    });
  }
  if (!isAdmin2) {
    const diasCalc = calcDiasUteis(form.data_inicio, form.data_fim);
    return /* @__PURE__ */ jsxs("div", {
      style: {
        background: COLORS.bg,
        minHeight: "100vh",
        padding: 32
      },
      children: [/* @__PURE__ */ jsxs("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24
        },
        children: [/* @__PURE__ */ jsx("h1", {
          style: {
            fontSize: 22,
            fontWeight: 700,
            color: COLORS.textPrimary,
            margin: 0
          },
          children: "Ferias"
        }), /* @__PURE__ */ jsx("button", {
          onClick: () => setMostraForm(!mostraForm),
          style: {
            ...btnBase,
            background: mostraForm ? COLORS.textSecondary : COLORS.green,
            color: "#fff"
          },
          children: mostraForm ? "Cancelar" : "+ Nova Solicitacao"
        })]
      }), /* @__PURE__ */ jsxs("div", {
        style: {
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 14,
          marginBottom: 24
        },
        children: [/* @__PURE__ */ jsx(SummaryCard, {
          label: "Direito Total",
          value: `${diasTotal} dias`,
          accent: COLORS.blue
        }), /* @__PURE__ */ jsx(SummaryCard, {
          label: "Dias Usados",
          value: `${diasUsados} dias`,
          accent: COLORS.red
        }), /* @__PURE__ */ jsx(SummaryCard, {
          label: "Dias Restantes",
          value: `${diasRestantes} dias`,
          accent: COLORS.green
        })]
      }), mostraForm && /* @__PURE__ */ jsxs("form", {
        onSubmit: enviarSolicitacao,
        style: {
          ...cardStyle$2,
          marginBottom: 24,
          display: "flex",
          flexDirection: "column",
          gap: 14
        },
        children: [/* @__PURE__ */ jsx("h3", {
          style: {
            fontSize: 16,
            fontWeight: 600,
            margin: 0,
            color: COLORS.textPrimary
          },
          children: "Nova Solicitacao"
        }), /* @__PURE__ */ jsxs("div", {
          style: {
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 14
          },
          children: [/* @__PURE__ */ jsxs("div", {
            children: [/* @__PURE__ */ jsx("label", {
              style: {
                fontSize: 13,
                fontWeight: 500,
                color: COLORS.textPrimary
              },
              children: "Data Inicio"
            }), /* @__PURE__ */ jsx("input", {
              type: "date",
              value: form.data_inicio,
              onChange: (e) => setForm({
                ...form,
                data_inicio: e.target.value
              }),
              required: true,
              style: inputStyle$2
            })]
          }), /* @__PURE__ */ jsxs("div", {
            children: [/* @__PURE__ */ jsx("label", {
              style: {
                fontSize: 13,
                fontWeight: 500,
                color: COLORS.textPrimary
              },
              children: "Data Fim"
            }), /* @__PURE__ */ jsx("input", {
              type: "date",
              value: form.data_fim,
              onChange: (e) => setForm({
                ...form,
                data_fim: e.target.value
              }),
              required: true,
              style: inputStyle$2
            })]
          })]
        }), form.data_inicio && form.data_fim && /* @__PURE__ */ jsxs("p", {
          style: {
            fontSize: 13,
            color: COLORS.textSecondary,
            margin: 0
          },
          children: ["Dias uteis: ", /* @__PURE__ */ jsx("strong", {
            style: {
              color: COLORS.textPrimary
            },
            children: diasCalc
          }), form.tipo === "ferias" && diasCalc > 0 && diasCalc < 5 && /* @__PURE__ */ jsx("span", {
            style: {
              color: COLORS.red,
              marginLeft: 8
            },
            children: "(minimo 5 dias para ferias)"
          })]
        }), /* @__PURE__ */ jsxs("div", {
          children: [/* @__PURE__ */ jsx("label", {
            style: {
              fontSize: 13,
              fontWeight: 500,
              color: COLORS.textPrimary
            },
            children: "Tipo"
          }), /* @__PURE__ */ jsxs("select", {
            value: form.tipo,
            onChange: (e) => setForm({
              ...form,
              tipo: e.target.value
            }),
            style: {
              ...inputStyle$2,
              background: "#fff"
            },
            children: [/* @__PURE__ */ jsx("option", {
              value: "ferias",
              children: "Ferias"
            }), /* @__PURE__ */ jsx("option", {
              value: "abono",
              children: "Abono"
            }), /* @__PURE__ */ jsx("option", {
              value: "licenca",
              children: "Licenca"
            })]
          })]
        }), /* @__PURE__ */ jsxs("div", {
          children: [/* @__PURE__ */ jsx("label", {
            style: {
              fontSize: 13,
              fontWeight: 500,
              color: COLORS.textPrimary
            },
            children: "Motivo (opcional)"
          }), /* @__PURE__ */ jsx("textarea", {
            value: form.motivo,
            onChange: (e) => setForm({
              ...form,
              motivo: e.target.value
            }),
            rows: 3,
            style: {
              ...inputStyle$2,
              resize: "vertical"
            }
          })]
        }), /* @__PURE__ */ jsx("button", {
          type: "submit",
          disabled: enviando,
          style: {
            ...btnBase,
            background: enviando ? "#86efac" : COLORS.green,
            color: "#fff",
            padding: "10px 20px",
            alignSelf: "flex-start",
            cursor: enviando ? "not-allowed" : "pointer"
          },
          children: enviando ? "Enviando..." : "Enviar Solicitacao"
        })]
      }), /* @__PURE__ */ jsxs("div", {
        style: {
          ...cardStyle$2,
          padding: 0,
          overflow: "auto"
        },
        children: [/* @__PURE__ */ jsx("h3", {
          style: {
            fontSize: 15,
            fontWeight: 600,
            padding: "16px 20px",
            margin: 0,
            borderBottom: `1px solid ${COLORS.border}`,
            color: COLORS.textPrimary
          },
          children: "Minhas Solicitacoes"
        }), minhasSolicitacoes.length === 0 ? /* @__PURE__ */ jsx("p", {
          style: {
            padding: 24,
            color: COLORS.textSecondary,
            textAlign: "center"
          },
          children: "Nenhuma solicitacao encontrada."
        }) : /* @__PURE__ */ jsxs("table", {
          style: {
            width: "100%",
            borderCollapse: "collapse"
          },
          children: [/* @__PURE__ */ jsx("thead", {
            children: /* @__PURE__ */ jsx("tr", {
              style: {
                borderBottom: `1px solid ${COLORS.border}`
              },
              children: ["Tipo", "Inicio", "Fim", "Dias", "Status", "Motivo", ""].map((h) => /* @__PURE__ */ jsx("th", {
                style: {
                  textAlign: "left",
                  padding: "10px 16px",
                  fontSize: 11,
                  fontWeight: 600,
                  color: COLORS.textSecondary,
                  textTransform: "uppercase"
                },
                children: h
              }, h))
            })
          }), /* @__PURE__ */ jsx("tbody", {
            children: minhasSolicitacoes.map((s) => /* @__PURE__ */ jsxs("tr", {
              style: {
                borderBottom: `1px solid ${COLORS.borderLight}`
              },
              children: [/* @__PURE__ */ jsx("td", {
                style: {
                  padding: "10px 16px",
                  fontSize: 14,
                  fontWeight: 500
                },
                children: tipoLabels[s.tipo] || s.tipo
              }), /* @__PURE__ */ jsx("td", {
                style: {
                  padding: "10px 16px",
                  fontSize: 14,
                  color: COLORS.textSecondary
                },
                children: fmtDate(s.data_inicio)
              }), /* @__PURE__ */ jsx("td", {
                style: {
                  padding: "10px 16px",
                  fontSize: 14,
                  color: COLORS.textSecondary
                },
                children: fmtDate(s.data_fim)
              }), /* @__PURE__ */ jsx("td", {
                style: {
                  padding: "10px 16px",
                  fontSize: 14,
                  color: COLORS.textSecondary
                },
                children: s.dias
              }), /* @__PURE__ */ jsx("td", {
                style: {
                  padding: "10px 16px"
                },
                children: /* @__PURE__ */ jsx(StatusBadge, {
                  status: s.status
                })
              }), /* @__PURE__ */ jsx("td", {
                style: {
                  padding: "10px 16px",
                  fontSize: 13,
                  color: COLORS.textSecondary,
                  maxWidth: 200,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap"
                },
                children: s.motivo || "—"
              }), /* @__PURE__ */ jsx("td", {
                style: {
                  padding: "10px 16px"
                },
                children: s.status === "pendente" && /* @__PURE__ */ jsx("button", {
                  onClick: () => cancelar(s.id),
                  style: {
                    ...btnBase,
                    background: COLORS.redLight,
                    color: COLORS.redDark,
                    padding: "4px 10px",
                    fontSize: 12
                  },
                  children: "Cancelar"
                })
              })]
            }, s.id))
          })]
        })]
      })]
    });
  }
  const feriasCalendario = feriasNoMes();
  const diasNoMes = getDiasDoMes2(calMes.ano, calMes.mes);
  const primeiroDia = getPrimeiroDiaSemana(calMes.ano, calMes.mes);
  return /* @__PURE__ */ jsxs("div", {
    style: {
      background: COLORS.bg,
      minHeight: "100vh",
      padding: 32
    },
    children: [/* @__PURE__ */ jsx("h1", {
      style: {
        fontSize: 22,
        fontWeight: 700,
        color: COLORS.textPrimary,
        margin: 0,
        marginBottom: 24
      },
      children: "Ferias — Gestao"
    }), /* @__PURE__ */ jsxs("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gap: 14,
        marginBottom: 28
      },
      children: [/* @__PURE__ */ jsx(SummaryCard, {
        label: "Solicitacoes Pendentes",
        value: pendentes.length,
        accent: COLORS.yellow
      }), /* @__PURE__ */ jsx(SummaryCard, {
        label: "Aprovadas este Mes",
        value: aprovadosMes.length,
        accent: COLORS.green
      }), /* @__PURE__ */ jsx(SummaryCard, {
        label: "Em Ferias Hoje",
        value: emFeriasHoje.length,
        accent: COLORS.blue
      })]
    }), pendentes.length > 0 && /* @__PURE__ */ jsxs("div", {
      style: {
        marginBottom: 28
      },
      children: [/* @__PURE__ */ jsx("h2", {
        style: {
          fontSize: 16,
          fontWeight: 600,
          color: COLORS.textPrimary,
          marginBottom: 14
        },
        children: "Solicitacoes Pendentes"
      }), /* @__PURE__ */ jsx("div", {
        style: {
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: 14
        },
        children: pendentes.map((s) => /* @__PURE__ */ jsxs("div", {
          style: {
            ...cardStyle$2,
            borderLeft: `4px solid ${COLORS.yellow}`
          },
          children: [/* @__PURE__ */ jsxs("div", {
            style: {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 10
            },
            children: [/* @__PURE__ */ jsxs("div", {
              children: [/* @__PURE__ */ jsx("p", {
                style: {
                  fontSize: 15,
                  fontWeight: 600,
                  color: COLORS.textPrimary,
                  margin: 0
                },
                children: s.operator_nome || "—"
              }), /* @__PURE__ */ jsx("p", {
                style: {
                  fontSize: 12,
                  color: COLORS.textSecondary,
                  margin: "2px 0 0"
                },
                children: tipoLabels[s.tipo] || s.tipo
              })]
            }), /* @__PURE__ */ jsx(StatusBadge, {
              status: s.status
            })]
          }), /* @__PURE__ */ jsxs("div", {
            style: {
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 8,
              marginBottom: 10
            },
            children: [/* @__PURE__ */ jsxs("div", {
              children: [/* @__PURE__ */ jsx("p", {
                style: {
                  fontSize: 11,
                  color: COLORS.textSecondary,
                  margin: 0
                },
                children: "Inicio"
              }), /* @__PURE__ */ jsx("p", {
                style: {
                  fontSize: 14,
                  fontWeight: 500,
                  margin: 0,
                  color: COLORS.textPrimary
                },
                children: fmtDate(s.data_inicio)
              })]
            }), /* @__PURE__ */ jsxs("div", {
              children: [/* @__PURE__ */ jsx("p", {
                style: {
                  fontSize: 11,
                  color: COLORS.textSecondary,
                  margin: 0
                },
                children: "Fim"
              }), /* @__PURE__ */ jsx("p", {
                style: {
                  fontSize: 14,
                  fontWeight: 500,
                  margin: 0,
                  color: COLORS.textPrimary
                },
                children: fmtDate(s.data_fim)
              })]
            }), /* @__PURE__ */ jsxs("div", {
              children: [/* @__PURE__ */ jsx("p", {
                style: {
                  fontSize: 11,
                  color: COLORS.textSecondary,
                  margin: 0
                },
                children: "Dias"
              }), /* @__PURE__ */ jsx("p", {
                style: {
                  fontSize: 14,
                  fontWeight: 500,
                  margin: 0,
                  color: COLORS.textPrimary
                },
                children: s.dias
              })]
            })]
          }), s.motivo && /* @__PURE__ */ jsxs("p", {
            style: {
              fontSize: 13,
              color: COLORS.textSecondary,
              margin: "0 0 12px",
              fontStyle: "italic"
            },
            children: ['"', s.motivo, '"']
          }), /* @__PURE__ */ jsxs("div", {
            style: {
              display: "flex",
              gap: 8
            },
            children: [/* @__PURE__ */ jsx("button", {
              onClick: () => aprovar(s.id),
              style: {
                ...btnBase,
                background: COLORS.green,
                color: "#fff",
                flex: 1
              },
              children: "Aprovar"
            }), /* @__PURE__ */ jsx("button", {
              onClick: () => recusar(s.id),
              style: {
                ...btnBase,
                background: COLORS.red,
                color: "#fff",
                flex: 1
              },
              children: "Recusar"
            })]
          })]
        }, s.id))
      })]
    }), (() => {
      const diasCalc = calcDiasUteis(form.data_inicio, form.data_fim);
      return /* @__PURE__ */ jsxs("div", {
        style: {
          ...cardStyle$2,
          marginBottom: 28,
          padding: 20
        },
        children: [/* @__PURE__ */ jsxs("div", {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16
          },
          children: [/* @__PURE__ */ jsx("h2", {
            style: {
              fontSize: 16,
              fontWeight: 600,
              color: COLORS.textPrimary,
              margin: 0
            },
            children: "Minhas Ferias"
          }), /* @__PURE__ */ jsx("button", {
            onClick: () => setMostraForm(!mostraForm),
            style: {
              ...btnBase,
              background: mostraForm ? COLORS.textSecondary : COLORS.green,
              color: "#fff",
              padding: "6px 14px",
              fontSize: 12
            },
            children: mostraForm ? "Cancelar" : "+ Solicitar"
          })]
        }), /* @__PURE__ */ jsxs("div", {
          style: {
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 10,
            marginBottom: 16
          },
          children: [/* @__PURE__ */ jsxs("div", {
            style: {
              background: "#eff6ff",
              borderRadius: 8,
              padding: "8px 12px"
            },
            children: [/* @__PURE__ */ jsx("p", {
              style: {
                fontSize: 11,
                color: "#64748b",
                margin: 0
              },
              children: "Direito"
            }), /* @__PURE__ */ jsxs("p", {
              style: {
                fontSize: 18,
                fontWeight: 700,
                color: COLORS.blue,
                margin: 0
              },
              children: [diasTotal, " dias"]
            })]
          }), /* @__PURE__ */ jsxs("div", {
            style: {
              background: "#fef2f2",
              borderRadius: 8,
              padding: "8px 12px"
            },
            children: [/* @__PURE__ */ jsx("p", {
              style: {
                fontSize: 11,
                color: "#64748b",
                margin: 0
              },
              children: "Usados"
            }), /* @__PURE__ */ jsxs("p", {
              style: {
                fontSize: 18,
                fontWeight: 700,
                color: COLORS.red,
                margin: 0
              },
              children: [diasUsados, " dias"]
            })]
          }), /* @__PURE__ */ jsxs("div", {
            style: {
              background: "#f0fdf4",
              borderRadius: 8,
              padding: "8px 12px"
            },
            children: [/* @__PURE__ */ jsx("p", {
              style: {
                fontSize: 11,
                color: "#64748b",
                margin: 0
              },
              children: "Restantes"
            }), /* @__PURE__ */ jsxs("p", {
              style: {
                fontSize: 18,
                fontWeight: 700,
                color: COLORS.green,
                margin: 0
              },
              children: [diasRestantes, " dias"]
            })]
          })]
        }), mostraForm && /* @__PURE__ */ jsxs("form", {
          onSubmit: enviarSolicitacao,
          style: {
            display: "flex",
            flexDirection: "column",
            gap: 12,
            marginBottom: 16,
            padding: 16,
            background: "#f8fafc",
            borderRadius: 8
          },
          children: [/* @__PURE__ */ jsxs("div", {
            style: {
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12
            },
            children: [/* @__PURE__ */ jsxs("div", {
              children: [/* @__PURE__ */ jsx("label", {
                style: {
                  fontSize: 12,
                  fontWeight: 500,
                  color: COLORS.textPrimary
                },
                children: "Data Inicio"
              }), /* @__PURE__ */ jsx("input", {
                type: "date",
                value: form.data_inicio,
                onChange: (e) => setForm({
                  ...form,
                  data_inicio: e.target.value
                }),
                required: true,
                style: inputStyle$2
              })]
            }), /* @__PURE__ */ jsxs("div", {
              children: [/* @__PURE__ */ jsx("label", {
                style: {
                  fontSize: 12,
                  fontWeight: 500,
                  color: COLORS.textPrimary
                },
                children: "Data Fim"
              }), /* @__PURE__ */ jsx("input", {
                type: "date",
                value: form.data_fim,
                onChange: (e) => setForm({
                  ...form,
                  data_fim: e.target.value
                }),
                required: true,
                style: inputStyle$2
              })]
            })]
          }), form.data_inicio && form.data_fim && /* @__PURE__ */ jsxs("p", {
            style: {
              fontSize: 12,
              color: COLORS.textSecondary,
              margin: 0
            },
            children: ["Dias uteis: ", /* @__PURE__ */ jsx("strong", {
              children: diasCalc
            }), form.tipo === "ferias" && diasCalc > 0 && diasCalc < 5 && /* @__PURE__ */ jsx("span", {
              style: {
                color: COLORS.red,
                marginLeft: 8
              },
              children: "(minimo 5 dias)"
            })]
          }), /* @__PURE__ */ jsxs("div", {
            style: {
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12
            },
            children: [/* @__PURE__ */ jsxs("div", {
              children: [/* @__PURE__ */ jsx("label", {
                style: {
                  fontSize: 12,
                  fontWeight: 500,
                  color: COLORS.textPrimary
                },
                children: "Tipo"
              }), /* @__PURE__ */ jsxs("select", {
                value: form.tipo,
                onChange: (e) => setForm({
                  ...form,
                  tipo: e.target.value
                }),
                style: {
                  ...inputStyle$2,
                  background: "#fff"
                },
                children: [/* @__PURE__ */ jsx("option", {
                  value: "ferias",
                  children: "Ferias"
                }), /* @__PURE__ */ jsx("option", {
                  value: "abono",
                  children: "Abono"
                }), /* @__PURE__ */ jsx("option", {
                  value: "licenca",
                  children: "Licenca"
                })]
              })]
            }), /* @__PURE__ */ jsxs("div", {
              children: [/* @__PURE__ */ jsx("label", {
                style: {
                  fontSize: 12,
                  fontWeight: 500,
                  color: COLORS.textPrimary
                },
                children: "Motivo (opcional)"
              }), /* @__PURE__ */ jsx("input", {
                type: "text",
                value: form.motivo,
                onChange: (e) => setForm({
                  ...form,
                  motivo: e.target.value
                }),
                style: inputStyle$2
              })]
            })]
          }), /* @__PURE__ */ jsx("button", {
            type: "submit",
            disabled: enviando,
            style: {
              ...btnBase,
              background: COLORS.green,
              color: "#fff",
              padding: "8px 18px",
              alignSelf: "flex-start",
              fontSize: 13
            },
            children: enviando ? "Enviando..." : "Enviar Solicitacao"
          })]
        }), minhasSolicitacoes.length > 0 && /* @__PURE__ */ jsxs("table", {
          style: {
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 13
          },
          children: [/* @__PURE__ */ jsx("thead", {
            children: /* @__PURE__ */ jsx("tr", {
              style: {
                borderBottom: `2px solid ${COLORS.border}`
              },
              children: ["Tipo", "Inicio", "Fim", "Dias", "Status", ""].map((h) => /* @__PURE__ */ jsx("th", {
                style: {
                  textAlign: "left",
                  padding: "8px 12px",
                  fontSize: 11,
                  fontWeight: 600,
                  color: COLORS.textSecondary,
                  textTransform: "uppercase"
                },
                children: h
              }, h))
            })
          }), /* @__PURE__ */ jsx("tbody", {
            children: minhasSolicitacoes.map((s) => /* @__PURE__ */ jsxs("tr", {
              style: {
                borderBottom: `1px solid ${COLORS.borderLight}`
              },
              children: [/* @__PURE__ */ jsx("td", {
                style: {
                  padding: "8px 12px",
                  fontWeight: 500
                },
                children: tipoLabels[s.tipo] || s.tipo
              }), /* @__PURE__ */ jsx("td", {
                style: {
                  padding: "8px 12px",
                  color: COLORS.textSecondary
                },
                children: fmtDate(s.data_inicio)
              }), /* @__PURE__ */ jsx("td", {
                style: {
                  padding: "8px 12px",
                  color: COLORS.textSecondary
                },
                children: fmtDate(s.data_fim)
              }), /* @__PURE__ */ jsx("td", {
                style: {
                  padding: "8px 12px",
                  color: COLORS.textSecondary
                },
                children: s.dias
              }), /* @__PURE__ */ jsx("td", {
                style: {
                  padding: "8px 12px"
                },
                children: /* @__PURE__ */ jsx(StatusBadge, {
                  status: s.status
                })
              }), /* @__PURE__ */ jsx("td", {
                style: {
                  padding: "8px 12px"
                },
                children: s.status === "pendente" && /* @__PURE__ */ jsx("button", {
                  onClick: () => cancelar(s.id),
                  style: {
                    ...btnBase,
                    background: COLORS.redLight,
                    color: COLORS.redDark,
                    padding: "3px 8px",
                    fontSize: 11
                  },
                  children: "Cancelar"
                })
              })]
            }, s.id))
          })]
        })]
      });
    })(), /* @__PURE__ */ jsxs("div", {
      style: {
        ...cardStyle$2,
        padding: 0,
        overflow: "auto",
        marginBottom: 28
      },
      children: [/* @__PURE__ */ jsxs("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 20px",
          borderBottom: `1px solid ${COLORS.border}`
        },
        children: [/* @__PURE__ */ jsx("h2", {
          style: {
            fontSize: 16,
            fontWeight: 600,
            color: COLORS.textPrimary,
            margin: 0
          },
          children: "Todas as Solicitacoes"
        }), /* @__PURE__ */ jsxs("select", {
          value: filtroStatus,
          onChange: (e) => setFiltroStatus(e.target.value),
          style: {
            padding: "6px 12px",
            border: `1px solid ${COLORS.border}`,
            borderRadius: 6,
            fontSize: 13,
            outline: "none",
            background: "#fff"
          },
          children: [/* @__PURE__ */ jsx("option", {
            value: "todos",
            children: "Todos os status"
          }), /* @__PURE__ */ jsx("option", {
            value: "pendente",
            children: "Pendente"
          }), /* @__PURE__ */ jsx("option", {
            value: "aprovado",
            children: "Aprovado"
          }), /* @__PURE__ */ jsx("option", {
            value: "recusado",
            children: "Recusado"
          })]
        })]
      }), solicitacoesFiltradas.length === 0 ? /* @__PURE__ */ jsx("p", {
        style: {
          padding: 24,
          color: COLORS.textSecondary,
          textAlign: "center"
        },
        children: "Nenhuma solicitacao encontrada."
      }) : /* @__PURE__ */ jsxs("table", {
        style: {
          width: "100%",
          borderCollapse: "collapse"
        },
        children: [/* @__PURE__ */ jsx("thead", {
          children: /* @__PURE__ */ jsx("tr", {
            style: {
              borderBottom: `1px solid ${COLORS.border}`
            },
            children: ["Funcionario", "Tipo", "Inicio", "Fim", "Dias", "Status", "Motivo", "Aprovado por", "Acoes"].map((h) => /* @__PURE__ */ jsx("th", {
              style: {
                textAlign: "left",
                padding: "10px 16px",
                fontSize: 11,
                fontWeight: 600,
                color: COLORS.textSecondary,
                textTransform: "uppercase"
              },
              children: h
            }, h))
          })
        }), /* @__PURE__ */ jsx("tbody", {
          children: solicitacoesFiltradas.map((s) => /* @__PURE__ */ jsxs("tr", {
            style: {
              borderBottom: `1px solid ${COLORS.borderLight}`
            },
            children: [/* @__PURE__ */ jsx("td", {
              style: {
                padding: "10px 16px",
                fontSize: 14,
                fontWeight: 500,
                color: COLORS.textPrimary
              },
              children: s.operator_nome || "—"
            }), /* @__PURE__ */ jsx("td", {
              style: {
                padding: "10px 16px",
                fontSize: 13,
                color: COLORS.textSecondary
              },
              children: tipoLabels[s.tipo] || s.tipo
            }), /* @__PURE__ */ jsx("td", {
              style: {
                padding: "10px 16px",
                fontSize: 13,
                color: COLORS.textSecondary
              },
              children: fmtDate(s.data_inicio)
            }), /* @__PURE__ */ jsx("td", {
              style: {
                padding: "10px 16px",
                fontSize: 13,
                color: COLORS.textSecondary
              },
              children: fmtDate(s.data_fim)
            }), /* @__PURE__ */ jsx("td", {
              style: {
                padding: "10px 16px",
                fontSize: 13,
                color: COLORS.textSecondary
              },
              children: s.dias
            }), /* @__PURE__ */ jsx("td", {
              style: {
                padding: "10px 16px"
              },
              children: /* @__PURE__ */ jsx(StatusBadge, {
                status: s.status
              })
            }), /* @__PURE__ */ jsx("td", {
              style: {
                padding: "10px 16px",
                fontSize: 12,
                color: COLORS.textSecondary,
                maxWidth: 160,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              },
              children: s.motivo || "—"
            }), /* @__PURE__ */ jsx("td", {
              style: {
                padding: "10px 16px",
                fontSize: 12,
                color: COLORS.textSecondary
              },
              children: s.aprovado_por_nome ? `${s.aprovado_por_nome} (${fmtDateTime(s.aprovado_em)})` : "—"
            }), /* @__PURE__ */ jsx("td", {
              style: {
                padding: "10px 16px"
              },
              children: s.status === "pendente" && /* @__PURE__ */ jsxs("div", {
                style: {
                  display: "flex",
                  gap: 6
                },
                children: [/* @__PURE__ */ jsx("button", {
                  onClick: () => aprovar(s.id),
                  style: {
                    ...btnBase,
                    background: COLORS.greenLight,
                    color: COLORS.greenDark,
                    padding: "4px 10px",
                    fontSize: 12
                  },
                  children: "Aprovar"
                }), /* @__PURE__ */ jsx("button", {
                  onClick: () => recusar(s.id),
                  style: {
                    ...btnBase,
                    background: COLORS.redLight,
                    color: COLORS.redDark,
                    padding: "4px 10px",
                    fontSize: 12
                  },
                  children: "Recusar"
                })]
              })
            })]
          }, s.id))
        })]
      })]
    }), /* @__PURE__ */ jsxs("div", {
      style: {
        ...cardStyle$2,
        padding: 0
      },
      children: [/* @__PURE__ */ jsxs("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 20px",
          borderBottom: `1px solid ${COLORS.border}`
        },
        children: [/* @__PURE__ */ jsx("button", {
          onClick: () => navegarMes(-1),
          style: {
            ...btnBase,
            background: COLORS.borderLight,
            color: COLORS.textPrimary,
            padding: "6px 14px"
          },
          children: "←"
        }), /* @__PURE__ */ jsxs("h2", {
          style: {
            fontSize: 16,
            fontWeight: 600,
            color: COLORS.textPrimary,
            margin: 0
          },
          children: [mesesNome[calMes.mes], " ", calMes.ano]
        }), /* @__PURE__ */ jsx("button", {
          onClick: () => navegarMes(1),
          style: {
            ...btnBase,
            background: COLORS.borderLight,
            color: COLORS.textPrimary,
            padding: "6px 14px"
          },
          children: "→"
        })]
      }), /* @__PURE__ */ jsxs("div", {
        style: {
          padding: 20
        },
        children: [/* @__PURE__ */ jsx("div", {
          style: {
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 4,
            marginBottom: 4
          },
          children: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"].map((d) => /* @__PURE__ */ jsx("div", {
            style: {
              textAlign: "center",
              fontSize: 11,
              fontWeight: 600,
              color: COLORS.textSecondary,
              padding: "4px 0"
            },
            children: d
          }, d))
        }), /* @__PURE__ */ jsxs("div", {
          style: {
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 4
          },
          children: [Array.from({
            length: primeiroDia
          }).map((_, i) => /* @__PURE__ */ jsx("div", {
            style: {
              minHeight: 60
            }
          }, `empty-${i}`)), Array.from({
            length: diasNoMes
          }).map((_, i) => {
            const dia = i + 1;
            const diaStr = `${calMes.ano}-${String(calMes.mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
            const dow = new Date(calMes.ano, calMes.mes, dia).getDay();
            const isWeekend = dow === 0 || dow === 6;
            const pessoasNoDia = feriasCalendario.filter((s) => s.data_inicio <= diaStr && s.data_fim >= diaStr);
            return /* @__PURE__ */ jsxs("div", {
              style: {
                minHeight: 60,
                border: `1px solid ${COLORS.borderLight}`,
                borderRadius: 6,
                padding: 4,
                background: isWeekend ? "#f8fafc" : "#fff"
              },
              children: [/* @__PURE__ */ jsx("div", {
                style: {
                  fontSize: 12,
                  fontWeight: 500,
                  color: isWeekend ? COLORS.textSecondary : COLORS.textPrimary,
                  marginBottom: 2
                },
                children: dia
              }), pessoasNoDia.map((s) => /* @__PURE__ */ jsx("div", {
                style: {
                  background: COLORS.green,
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 500,
                  padding: "1px 4px",
                  borderRadius: 3,
                  marginBottom: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap"
                },
                children: s.operator_nome || "—"
              }, s.id))]
            }, dia);
          })]
        })]
      })]
    })]
  });
});
const route7 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: standalone_ferias
}, Symbol.toStringTag, { value: "Module" }));
const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MESES_FULL = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
function fmt(v) {
  if (v == null || isNaN(v)) return "R$ 0,00";
  return Number(v).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}
const standalone_folha = UNSAFE_withComponentProps(function FolhaSalarial() {
  const {
    operator
  } = useAuth();
  const toast = useToast();
  const {
    confirm
  } = useConfirm();
  const isAdmin2 = (operator == null ? void 0 : operator.cargo) === "admin" || (operator == null ? void 0 : operator.cargo) === "rh";
  const [ano, setAno] = useState((/* @__PURE__ */ new Date()).getFullYear());
  const [mesSelecionado, setMesSelecionado] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [folhaFuncs, setFolhaFuncs] = useState([]);
  const [extras, setExtras] = useState([]);
  const [operadores, setOperadores] = useState([]);
  const [ocultos, setOcultos] = useState(/* @__PURE__ */ new Set());
  const [mostraFormFunc, setMostraFormFunc] = useState(false);
  const [editandoFunc, setEditandoFunc] = useState(null);
  const [formFunc, setFormFunc] = useState({
    operator_id: "",
    salario_base: "",
    vale_alimentacao: ""
  });
  const [mostraFormExtra, setMostraFormExtra] = useState(false);
  const [editandoExtra, setEditandoExtra] = useState(null);
  const [formExtra, setFormExtra] = useState({
    descricao: "",
    valor: "",
    tipo: "todos",
    mes: (/* @__PURE__ */ new Date()).getMonth() + 1
  });
  const [salvando, setSalvando] = useState(false);
  const carregar = useCallback(async () => {
    setCarregando(true);
    const [{
      data: funcs
    }, {
      data: exts
    }, {
      data: ops
    }] = await Promise.all([supabase.from("folha_funcionarios").select("*, operadores(nome, avatar_url)").eq("ativo", true).order("created_at"), supabase.from("folha_extras").select("*").order("created_at"), supabase.from("operadores").select("id, nome").in("status", ["aprovado", "active"]).order("nome")]);
    setFolhaFuncs(funcs || []);
    setExtras(exts || []);
    setOperadores(ops || []);
    setCarregando(false);
  }, []);
  useEffect(() => {
    carregar();
  }, [carregar]);
  function extraApareceMes(ex, mes) {
    const excluidos = ex.meses_excluidos || [];
    if (excluidos.includes(mes)) return false;
    if (ex.recorrente) return true;
    return ex.mes === mes && ex.ano === ano;
  }
  function getExtrasMes(mes) {
    return extras.filter((e) => extraApareceMes(e, mes));
  }
  function calcMes(mes, ignorarOcultos = false) {
    let totalSalarios = 0;
    let totalVA = 0;
    let total13 = 0;
    let totalFerias = 0;
    let totalExtras = 0;
    for (const f of folhaFuncs) {
      const sal = Number(f.salario_base) || 0;
      const va = Number(f.vale_alimentacao) || 0;
      totalSalarios += sal;
      totalVA += va;
      total13 += sal / 12;
      totalFerias += (sal + sal / 3) / 12;
    }
    for (const e of getExtrasMes(mes)) {
      if (!ignorarOcultos && ocultos.has(e.id + "-" + mes)) continue;
      totalExtras += Number(e.valor) || 0;
    }
    return {
      salarios: totalSalarios,
      va: totalVA,
      prov13: total13,
      provFerias: totalFerias,
      extras: totalExtras,
      total: totalSalarios + totalVA + total13 + totalFerias + totalExtras
    };
  }
  const totalAnual = (() => {
    let t = 0;
    for (let m = 1; m <= 12; m++) t += calcMes(m).total;
    return t;
  })();
  const mesAtual2 = (/* @__PURE__ */ new Date()).getMonth();
  function toggleOculto(exId, mes) {
    const key = exId + "-" + mes;
    setOcultos((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }
  async function excluirDoMes(ex, mes) {
    const excluidos = [...ex.meses_excluidos || []];
    if (!excluidos.includes(mes)) excluidos.push(mes);
    const {
      error
    } = await supabase.from("folha_extras").update({
      meses_excluidos: excluidos
    }).eq("id", ex.id);
    if (error) toast.error("Erro: " + error.message);
    else {
      toast.success(`Removido de ${MESES_FULL[mes - 1]}.`);
      carregar();
    }
  }
  async function restaurarNoMes(ex, mes) {
    const excluidos = (ex.meses_excluidos || []).filter((m) => m !== mes);
    const {
      error
    } = await supabase.from("folha_extras").update({
      meses_excluidos: excluidos
    }).eq("id", ex.id);
    if (error) toast.error("Erro: " + error.message);
    else {
      toast.success(`Restaurado em ${MESES_FULL[mes - 1]}.`);
      carregar();
    }
  }
  function abrirNovoFunc() {
    setEditandoFunc(null);
    setFormFunc({
      operator_id: "",
      salario_base: "",
      vale_alimentacao: ""
    });
    setMostraFormFunc(true);
  }
  function abrirEditarFunc(f) {
    setEditandoFunc(f.id);
    setFormFunc({
      operator_id: f.operator_id,
      salario_base: f.salario_base ?? "",
      vale_alimentacao: f.vale_alimentacao ?? ""
    });
    setMostraFormFunc(true);
  }
  async function salvarFunc(e) {
    e.preventDefault();
    if (!formFunc.operator_id) {
      toast.warn("Selecione um funcionário.");
      return;
    }
    setSalvando(true);
    const dados = {
      operator_id: formFunc.operator_id,
      salario_base: Number(formFunc.salario_base) || 0,
      vale_alimentacao: Number(formFunc.vale_alimentacao) || 0,
      ativo: true
    };
    if (editandoFunc) {
      const {
        error
      } = await supabase.from("folha_funcionarios").update(dados).eq("id", editandoFunc);
      if (error) toast.error("Erro: " + error.message);
      else toast.success("Atualizado!");
    } else {
      const {
        error
      } = await supabase.from("folha_funcionarios").insert(dados);
      if (error) toast.error("Erro: " + error.message);
      else toast.success("Funcionário adicionado à folha!");
    }
    setSalvando(false);
    setMostraFormFunc(false);
    carregar();
  }
  async function removerFunc(f) {
    var _a;
    const nome = ((_a = f.operadores) == null ? void 0 : _a.nome) || "funcionário";
    const ok = await confirm(`Remover ${nome} da folha salarial?`, {
      title: "Remover da folha",
      confirmText: "Remover",
      danger: true
    });
    if (!ok) return;
    await supabase.from("folha_funcionarios").update({
      ativo: false
    }).eq("id", f.id);
    toast.success("Removido da folha.");
    carregar();
  }
  function abrirNovoExtra(mesDefault) {
    setEditandoExtra(null);
    setFormExtra({
      descricao: "",
      valor: "",
      tipo: mesDefault ? "avulso" : "todos",
      mes: mesDefault || (/* @__PURE__ */ new Date()).getMonth() + 1
    });
    setMostraFormExtra(true);
  }
  function abrirEditarExtra(ex) {
    setEditandoExtra(ex.id);
    setFormExtra({
      descricao: ex.descricao,
      valor: ex.valor ?? "",
      tipo: ex.recorrente ? "todos" : "avulso",
      mes: ex.mes || 1
    });
    setMostraFormExtra(true);
  }
  async function salvarExtra(e) {
    e.preventDefault();
    if (!formExtra.descricao.trim()) {
      toast.warn("Informe a descrição.");
      return;
    }
    setSalvando(true);
    const recorrente = formExtra.tipo === "todos";
    const dados = {
      descricao: formExtra.descricao.trim(),
      valor: Number(formExtra.valor) || 0,
      mes: recorrente ? 1 : Number(formExtra.mes),
      ano,
      recorrente
    };
    if (editandoExtra) {
      const {
        error
      } = await supabase.from("folha_extras").update(dados).eq("id", editandoExtra);
      if (error) toast.error("Erro: " + error.message);
      else toast.success("Atualizado!");
    } else {
      const {
        error
      } = await supabase.from("folha_extras").insert(dados);
      if (error) toast.error("Erro: " + error.message);
      else toast.success("Gasto adicionado!");
    }
    setSalvando(false);
    setMostraFormExtra(false);
    carregar();
  }
  async function excluirExtra(ex) {
    const ok = await confirm(`Excluir "${ex.descricao}" permanentemente?`, {
      title: "Excluir gasto",
      confirmText: "Excluir",
      danger: true
    });
    if (!ok) return;
    await supabase.from("folha_extras").delete().eq("id", ex.id);
    toast.success("Excluído.");
    carregar();
  }
  if (carregando) {
    return /* @__PURE__ */ jsxs("div", {
      children: [/* @__PURE__ */ jsx("h1", {
        style: {
          fontSize: 22,
          fontWeight: 700,
          marginBottom: 20
        },
        children: "Folha Salarial"
      }), /* @__PURE__ */ jsx("p", {
        style: {
          color: "#94a3b8"
        },
        children: "Carregando..."
      })]
    });
  }
  const detalheMes = mesSelecionado !== null ? calcMes(mesSelecionado + 1) : null;
  return /* @__PURE__ */ jsxs("div", {
    children: [/* @__PURE__ */ jsxs("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 24
      },
      children: [/* @__PURE__ */ jsx("h1", {
        style: {
          fontSize: 22,
          fontWeight: 700,
          margin: 0
        },
        children: "Folha Salarial"
      }), /* @__PURE__ */ jsxs("div", {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 8
        },
        children: [/* @__PURE__ */ jsx("button", {
          onClick: () => setAno(ano - 1),
          style: btnNav$1,
          children: "←"
        }), /* @__PURE__ */ jsx("span", {
          style: {
            fontSize: 18,
            fontWeight: 700,
            minWidth: 60,
            textAlign: "center"
          },
          children: ano
        }), /* @__PURE__ */ jsx("button", {
          onClick: () => setAno(ano + 1),
          style: btnNav$1,
          children: "→"
        })]
      })]
    }), /* @__PURE__ */ jsxs("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
        gap: 14,
        marginBottom: 24
      },
      children: [/* @__PURE__ */ jsxs("div", {
        style: {
          ...cardStyle$1,
          borderLeft: "4px solid rgb(22,134,78)"
        },
        children: [/* @__PURE__ */ jsx("p", {
          style: cardLabel,
          children: "Total Anual"
        }), /* @__PURE__ */ jsx("p", {
          style: {
            ...cardValor,
            color: "rgb(22,134,78)"
          },
          children: fmt(totalAnual)
        })]
      }), /* @__PURE__ */ jsxs("div", {
        style: {
          ...cardStyle$1,
          borderLeft: "4px solid #2563eb"
        },
        children: [/* @__PURE__ */ jsx("p", {
          style: cardLabel,
          children: "Média Mensal"
        }), /* @__PURE__ */ jsx("p", {
          style: {
            ...cardValor,
            color: "#2563eb"
          },
          children: fmt(totalAnual / 12)
        })]
      }), /* @__PURE__ */ jsxs("div", {
        style: {
          ...cardStyle$1,
          borderLeft: "4px solid #7c3aed"
        },
        children: [/* @__PURE__ */ jsx("p", {
          style: cardLabel,
          children: "Funcionários"
        }), /* @__PURE__ */ jsx("p", {
          style: {
            ...cardValor,
            color: "#7c3aed"
          },
          children: folhaFuncs.length
        })]
      }), /* @__PURE__ */ jsxs("div", {
        style: {
          ...cardStyle$1,
          borderLeft: "4px solid #d97706"
        },
        children: [/* @__PURE__ */ jsx("p", {
          style: cardLabel,
          children: "Gastos Extras"
        }), /* @__PURE__ */ jsx("p", {
          style: {
            ...cardValor,
            color: "#d97706"
          },
          children: fmt((() => {
            let t = 0;
            for (let m = 1; m <= 12; m++) t += calcMes(m).extras;
            return t;
          })())
        })]
      })]
    }), /* @__PURE__ */ jsx("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 12,
        marginBottom: 28
      },
      children: MESES.map((nome, i) => {
        const c = calcMes(i + 1);
        const selecionado = mesSelecionado === i;
        const atual = i === mesAtual2 && ano === (/* @__PURE__ */ new Date()).getFullYear();
        return /* @__PURE__ */ jsxs("div", {
          onClick: () => setMesSelecionado(selecionado ? null : i),
          style: {
            background: selecionado ? "#0f172a" : "#fff",
            color: selecionado ? "#fff" : "#1e293b",
            borderRadius: 10,
            padding: "16px 18px",
            cursor: "pointer",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            border: atual && !selecionado ? "2px solid rgb(22,134,78)" : "1px solid #e2e8f0",
            transition: "all 0.15s"
          },
          children: [/* @__PURE__ */ jsxs("div", {
            style: {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8
            },
            children: [/* @__PURE__ */ jsx("span", {
              style: {
                fontSize: 13,
                fontWeight: 600,
                opacity: 0.7
              },
              children: nome
            }), atual && !selecionado && /* @__PURE__ */ jsx("span", {
              style: {
                fontSize: 9,
                background: "rgb(22,134,78)",
                color: "#fff",
                padding: "1px 6px",
                borderRadius: 10,
                fontWeight: 700
              },
              children: "ATUAL"
            })]
          }), /* @__PURE__ */ jsx("p", {
            style: {
              fontSize: 18,
              fontWeight: 700,
              margin: 0
            },
            children: fmt(c.total)
          }), /* @__PURE__ */ jsxs("div", {
            style: {
              display: "flex",
              gap: 8,
              marginTop: 6,
              fontSize: 10,
              opacity: 0.6
            },
            children: [/* @__PURE__ */ jsxs("span", {
              children: [folhaFuncs.length, " func."]
            }), getExtrasMes(i + 1).length > 0 && /* @__PURE__ */ jsxs("span", {
              children: ["+", getExtrasMes(i + 1).length, " extras"]
            })]
          })]
        }, i);
      })
    }), mesSelecionado !== null && detalheMes && /* @__PURE__ */ jsxs("div", {
      style: {
        ...cardStyle$1,
        padding: 28,
        marginBottom: 28
      },
      children: [/* @__PURE__ */ jsxs("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20
        },
        children: [/* @__PURE__ */ jsxs("h2", {
          style: {
            fontSize: 18,
            fontWeight: 700,
            margin: 0
          },
          children: [MESES_FULL[mesSelecionado], " ", ano]
        }), /* @__PURE__ */ jsxs("div", {
          style: {
            textAlign: "right"
          },
          children: [/* @__PURE__ */ jsx("span", {
            style: {
              fontSize: 22,
              fontWeight: 700,
              color: "rgb(22,134,78)"
            },
            children: fmt(detalheMes.total)
          }), ocultos.size > 0 && /* @__PURE__ */ jsx("p", {
            style: {
              fontSize: 10,
              color: "#94a3b8",
              margin: "2px 0 0"
            },
            children: "(com itens ocultos)"
          })]
        })]
      }), /* @__PURE__ */ jsx("div", {
        style: {
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 10,
          marginBottom: 20
        },
        children: [{
          label: "Salários",
          valor: detalheMes.salarios,
          cor: "#1e293b"
        }, {
          label: "Vale Alimentação",
          valor: detalheMes.va,
          cor: "#2563eb"
        }, {
          label: "Provisão 13º",
          valor: detalheMes.prov13,
          cor: "#7c3aed"
        }, {
          label: "Provisão Férias",
          valor: detalheMes.provFerias,
          cor: "#d97706"
        }, {
          label: "Outros Gastos",
          valor: detalheMes.extras,
          cor: "#dc2626"
        }].map((item) => /* @__PURE__ */ jsxs("div", {
          style: {
            background: "#f8fafc",
            borderRadius: 8,
            padding: "10px 14px"
          },
          children: [/* @__PURE__ */ jsx("p", {
            style: {
              fontSize: 11,
              color: "#64748b",
              margin: "0 0 4px"
            },
            children: item.label
          }), /* @__PURE__ */ jsx("p", {
            style: {
              fontSize: 15,
              fontWeight: 700,
              color: item.cor,
              margin: 0
            },
            children: fmt(item.valor)
          })]
        }, item.label))
      }), /* @__PURE__ */ jsx("h3", {
        style: sectionTitle,
        children: "Funcionários"
      }), /* @__PURE__ */ jsxs("table", {
        style: {
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 13,
          marginBottom: 20
        },
        children: [/* @__PURE__ */ jsx("thead", {
          children: /* @__PURE__ */ jsxs("tr", {
            style: {
              borderBottom: "2px solid #e2e8f0"
            },
            children: [/* @__PURE__ */ jsx("th", {
              style: th,
              children: "Nome"
            }), /* @__PURE__ */ jsx("th", {
              style: th,
              children: "Salário"
            }), /* @__PURE__ */ jsx("th", {
              style: th,
              children: "VA"
            }), /* @__PURE__ */ jsx("th", {
              style: th,
              children: "13º (prov.)"
            }), /* @__PURE__ */ jsx("th", {
              style: th,
              children: "Férias (prov.)"
            }), /* @__PURE__ */ jsx("th", {
              style: th,
              children: "Custo Total"
            })]
          })
        }), /* @__PURE__ */ jsx("tbody", {
          children: folhaFuncs.map((f) => {
            var _a;
            const sal = Number(f.salario_base) || 0;
            const va = Number(f.vale_alimentacao) || 0;
            const p13 = sal / 12;
            const pFer = (sal + sal / 3) / 12;
            return /* @__PURE__ */ jsxs("tr", {
              style: {
                borderBottom: "1px solid #f1f5f9"
              },
              children: [/* @__PURE__ */ jsx("td", {
                style: td,
                children: /* @__PURE__ */ jsx("span", {
                  style: {
                    fontWeight: 500
                  },
                  children: ((_a = f.operadores) == null ? void 0 : _a.nome) || "—"
                })
              }), /* @__PURE__ */ jsx("td", {
                style: td,
                children: fmt(sal)
              }), /* @__PURE__ */ jsx("td", {
                style: {
                  ...td,
                  color: "#2563eb"
                },
                children: fmt(va)
              }), /* @__PURE__ */ jsx("td", {
                style: {
                  ...td,
                  color: "#7c3aed"
                },
                children: fmt(p13)
              }), /* @__PURE__ */ jsx("td", {
                style: {
                  ...td,
                  color: "#d97706"
                },
                children: fmt(pFer)
              }), /* @__PURE__ */ jsx("td", {
                style: {
                  ...td,
                  fontWeight: 700
                },
                children: fmt(sal + va + p13 + pFer)
              })]
            }, f.id);
          })
        })]
      }), /* @__PURE__ */ jsxs("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10
        },
        children: [/* @__PURE__ */ jsx("h3", {
          style: {
            ...sectionTitle,
            margin: 0
          },
          children: "Outros Gastos"
        }), isAdmin2 && /* @__PURE__ */ jsx("button", {
          onClick: () => abrirNovoExtra(mesSelecionado + 1),
          style: {
            ...btnSmall,
            background: "#dc2626"
          },
          children: "+ Adicionar Gasto"
        })]
      }), (() => {
        const mesNum = mesSelecionado + 1;
        const extrasDoMes = getExtrasMes(mesNum);
        const excluidos = extras.filter((e) => e.recorrente && (e.meses_excluidos || []).includes(mesNum));
        if (extrasDoMes.length === 0 && excluidos.length === 0) {
          return /* @__PURE__ */ jsx("p", {
            style: {
              fontSize: 13,
              color: "#94a3b8",
              padding: 10
            },
            children: "Nenhum gasto extra neste mês."
          });
        }
        return /* @__PURE__ */ jsxs("table", {
          style: {
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 13
          },
          children: [/* @__PURE__ */ jsx("thead", {
            children: /* @__PURE__ */ jsxs("tr", {
              style: {
                borderBottom: "2px solid #e2e8f0"
              },
              children: [/* @__PURE__ */ jsx("th", {
                style: {
                  ...th,
                  width: 30
                }
              }), /* @__PURE__ */ jsx("th", {
                style: th,
                children: "Descrição"
              }), /* @__PURE__ */ jsx("th", {
                style: th,
                children: "Valor"
              }), /* @__PURE__ */ jsx("th", {
                style: th,
                children: "Tipo"
              }), isAdmin2 && /* @__PURE__ */ jsx("th", {
                style: th,
                children: "Ações"
              })]
            })
          }), /* @__PURE__ */ jsxs("tbody", {
            children: [extrasDoMes.map((ex) => {
              const ocultoKey = ex.id + "-" + mesNum;
              const estaOculto = ocultos.has(ocultoKey);
              return /* @__PURE__ */ jsxs("tr", {
                style: {
                  borderBottom: "1px solid #f1f5f9",
                  opacity: estaOculto ? 0.35 : 1,
                  transition: "opacity 0.15s"
                },
                children: [/* @__PURE__ */ jsx("td", {
                  style: {
                    ...td,
                    width: 30,
                    padding: "10px 6px"
                  },
                  children: /* @__PURE__ */ jsx("button", {
                    onClick: () => toggleOculto(ex.id, mesNum),
                    title: estaOculto ? "Mostrar no total" : "Ocultar do total (temporário)",
                    style: {
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 2,
                      display: "flex",
                      alignItems: "center"
                    },
                    children: /* @__PURE__ */ jsx("span", {
                      className: "material-symbols-outlined",
                      style: {
                        fontSize: 18,
                        color: estaOculto ? "#94a3b8" : "#64748b"
                      },
                      children: estaOculto ? "visibility_off" : "visibility"
                    })
                  })
                }), /* @__PURE__ */ jsx("td", {
                  style: {
                    ...td,
                    textDecoration: estaOculto ? "line-through" : "none"
                  },
                  children: ex.descricao
                }), /* @__PURE__ */ jsx("td", {
                  style: {
                    ...td,
                    fontWeight: 600,
                    color: "#dc2626",
                    textDecoration: estaOculto ? "line-through" : "none"
                  },
                  children: fmt(ex.valor)
                }), /* @__PURE__ */ jsx("td", {
                  style: td,
                  children: /* @__PURE__ */ jsx("span", {
                    style: {
                      fontSize: 11,
                      padding: "2px 8px",
                      borderRadius: 10,
                      fontWeight: 600,
                      background: ex.recorrente ? "#ede9fe" : "#f1f5f9",
                      color: ex.recorrente ? "#7c3aed" : "#64748b"
                    },
                    children: ex.recorrente ? "Todo mês" : "Avulso"
                  })
                }), isAdmin2 && /* @__PURE__ */ jsx("td", {
                  style: td,
                  children: /* @__PURE__ */ jsxs("div", {
                    style: {
                      display: "flex",
                      gap: 6,
                      alignItems: "center"
                    },
                    children: [/* @__PURE__ */ jsx("button", {
                      onClick: () => abrirEditarExtra(ex),
                      style: btnLink,
                      children: "Editar"
                    }), ex.recorrente ? /* @__PURE__ */ jsx("button", {
                      onClick: () => excluirDoMes(ex, mesNum),
                      style: {
                        ...btnLink,
                        color: "#d97706"
                      },
                      title: "Remover só deste mês",
                      children: "Tirar deste mês"
                    }) : /* @__PURE__ */ jsx("button", {
                      onClick: () => excluirExtra(ex),
                      style: {
                        ...btnLink,
                        color: "#dc2626"
                      },
                      children: "Excluir"
                    })]
                  })
                })]
              }, ex.id);
            }), excluidos.map((ex) => /* @__PURE__ */ jsxs("tr", {
              style: {
                borderBottom: "1px solid #f1f5f9",
                opacity: 0.35
              },
              children: [/* @__PURE__ */ jsx("td", {
                style: {
                  ...td,
                  width: 30,
                  padding: "10px 6px"
                },
                children: /* @__PURE__ */ jsx("span", {
                  className: "material-symbols-outlined",
                  style: {
                    fontSize: 18,
                    color: "#94a3b8"
                  },
                  children: "visibility_off"
                })
              }), /* @__PURE__ */ jsx("td", {
                style: {
                  ...td,
                  textDecoration: "line-through"
                },
                children: ex.descricao
              }), /* @__PURE__ */ jsx("td", {
                style: {
                  ...td,
                  fontWeight: 600,
                  color: "#94a3b8",
                  textDecoration: "line-through"
                },
                children: fmt(ex.valor)
              }), /* @__PURE__ */ jsx("td", {
                style: td,
                children: /* @__PURE__ */ jsx("span", {
                  style: {
                    fontSize: 11,
                    padding: "2px 8px",
                    borderRadius: 10,
                    fontWeight: 600,
                    background: "#fef2f2",
                    color: "#dc2626"
                  },
                  children: "Removido"
                })
              }), isAdmin2 && /* @__PURE__ */ jsx("td", {
                style: td,
                children: /* @__PURE__ */ jsx("button", {
                  onClick: () => restaurarNoMes(ex, mesNum),
                  style: {
                    ...btnLink,
                    color: "rgb(22,134,78)"
                  },
                  children: "Restaurar"
                })
              })]
            }, "exc-" + ex.id))]
          })]
        });
      })()]
    }), /* @__PURE__ */ jsxs("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 20
      },
      children: [/* @__PURE__ */ jsxs("div", {
        style: cardStyle$1,
        children: [/* @__PURE__ */ jsxs("div", {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16
          },
          children: [/* @__PURE__ */ jsx("h3", {
            style: {
              fontSize: 15,
              fontWeight: 600,
              margin: 0
            },
            children: "Funcionários na Folha"
          }), isAdmin2 && /* @__PURE__ */ jsx("button", {
            onClick: abrirNovoFunc,
            style: btnSmall,
            children: "+ Adicionar"
          })]
        }), folhaFuncs.length === 0 ? /* @__PURE__ */ jsx("p", {
          style: {
            fontSize: 13,
            color: "#94a3b8"
          },
          children: "Nenhum funcionário na folha."
        }) : /* @__PURE__ */ jsx("div", {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: 8
          },
          children: folhaFuncs.map((f) => {
            var _a, _b, _c, _d;
            return /* @__PURE__ */ jsxs("div", {
              style: {
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: "#f8fafc",
                borderRadius: 8,
                padding: "10px 14px"
              },
              children: [/* @__PURE__ */ jsx("div", {
                style: {
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  flexShrink: 0,
                  background: ((_a = f.operadores) == null ? void 0 : _a.avatar_url) ? "none" : "#e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden"
                },
                children: ((_b = f.operadores) == null ? void 0 : _b.avatar_url) ? /* @__PURE__ */ jsx("img", {
                  src: f.operadores.avatar_url,
                  alt: "",
                  style: {
                    width: "100%",
                    height: "100%",
                    objectFit: "cover"
                  }
                }) : /* @__PURE__ */ jsx("span", {
                  style: {
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#64748b"
                  },
                  children: (((_c = f.operadores) == null ? void 0 : _c.nome) || "?").charAt(0)
                })
              }), /* @__PURE__ */ jsxs("div", {
                style: {
                  flex: 1,
                  minWidth: 0
                },
                children: [/* @__PURE__ */ jsx("p", {
                  style: {
                    fontSize: 13,
                    fontWeight: 600,
                    margin: 0,
                    color: "#1e293b"
                  },
                  children: ((_d = f.operadores) == null ? void 0 : _d.nome) || "—"
                }), /* @__PURE__ */ jsxs("p", {
                  style: {
                    fontSize: 11,
                    color: "#64748b",
                    margin: 0
                  },
                  children: ["Salário: ", fmt(f.salario_base), " · VA: ", fmt(f.vale_alimentacao)]
                })]
              }), isAdmin2 && /* @__PURE__ */ jsxs("div", {
                style: {
                  display: "flex",
                  gap: 4
                },
                children: [/* @__PURE__ */ jsx("button", {
                  onClick: () => abrirEditarFunc(f),
                  title: "Editar",
                  style: btnIcon,
                  children: /* @__PURE__ */ jsx("span", {
                    className: "material-symbols-outlined",
                    style: {
                      fontSize: 16
                    },
                    children: "edit"
                  })
                }), /* @__PURE__ */ jsx("button", {
                  onClick: () => removerFunc(f),
                  title: "Remover",
                  style: {
                    ...btnIcon,
                    color: "#dc2626"
                  },
                  children: /* @__PURE__ */ jsx("span", {
                    className: "material-symbols-outlined",
                    style: {
                      fontSize: 16
                    },
                    children: "close"
                  })
                })]
              })]
            }, f.id);
          })
        })]
      }), /* @__PURE__ */ jsxs("div", {
        style: cardStyle$1,
        children: [/* @__PURE__ */ jsxs("div", {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16
          },
          children: [/* @__PURE__ */ jsx("h3", {
            style: {
              fontSize: 15,
              fontWeight: 600,
              margin: 0
            },
            children: "Gastos Recorrentes"
          }), isAdmin2 && /* @__PURE__ */ jsx("button", {
            onClick: () => {
              setEditandoExtra(null);
              setFormExtra({
                descricao: "",
                valor: "",
                tipo: "todos",
                mes: 1
              });
              setMostraFormExtra(true);
            },
            style: {
              ...btnSmall,
              background: "#d97706"
            },
            children: "+ Adicionar"
          })]
        }), (() => {
          const recorrentes = extras.filter((e) => e.recorrente);
          if (recorrentes.length === 0) return /* @__PURE__ */ jsx("p", {
            style: {
              fontSize: 13,
              color: "#94a3b8"
            },
            children: "Nenhum gasto recorrente."
          });
          return /* @__PURE__ */ jsx("div", {
            style: {
              display: "flex",
              flexDirection: "column",
              gap: 8
            },
            children: recorrentes.map((ex) => {
              const excluidos = ex.meses_excluidos || [];
              return /* @__PURE__ */ jsx("div", {
                style: {
                  background: "#f8fafc",
                  borderRadius: 8,
                  padding: "10px 14px"
                },
                children: /* @__PURE__ */ jsxs("div", {
                  style: {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between"
                  },
                  children: [/* @__PURE__ */ jsxs("div", {
                    children: [/* @__PURE__ */ jsx("p", {
                      style: {
                        fontSize: 13,
                        fontWeight: 600,
                        margin: 0,
                        color: "#1e293b"
                      },
                      children: ex.descricao
                    }), /* @__PURE__ */ jsxs("p", {
                      style: {
                        fontSize: 11,
                        color: "#64748b",
                        margin: 0
                      },
                      children: ["Todos os meses", excluidos.length > 0 && /* @__PURE__ */ jsxs("span", {
                        style: {
                          color: "#d97706"
                        },
                        children: [" (exceto ", excluidos.map((m) => MESES[m - 1]).join(", "), ")"]
                      })]
                    })]
                  }), /* @__PURE__ */ jsxs("div", {
                    style: {
                      display: "flex",
                      alignItems: "center",
                      gap: 8
                    },
                    children: [/* @__PURE__ */ jsx("span", {
                      style: {
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#d97706"
                      },
                      children: fmt(ex.valor)
                    }), isAdmin2 && /* @__PURE__ */ jsxs("div", {
                      style: {
                        display: "flex",
                        gap: 4
                      },
                      children: [/* @__PURE__ */ jsx("button", {
                        onClick: () => abrirEditarExtra(ex),
                        style: btnIcon,
                        children: /* @__PURE__ */ jsx("span", {
                          className: "material-symbols-outlined",
                          style: {
                            fontSize: 16
                          },
                          children: "edit"
                        })
                      }), /* @__PURE__ */ jsx("button", {
                        onClick: () => excluirExtra(ex),
                        style: {
                          ...btnIcon,
                          color: "#dc2626"
                        },
                        children: /* @__PURE__ */ jsx("span", {
                          className: "material-symbols-outlined",
                          style: {
                            fontSize: 16
                          },
                          children: "close"
                        })
                      })]
                    })]
                  })]
                })
              }, ex.id);
            })
          });
        })()]
      })]
    }), mostraFormFunc && /* @__PURE__ */ jsxs(Modal, {
      onClose: () => setMostraFormFunc(false),
      children: [/* @__PURE__ */ jsx("h2", {
        style: modalTitle,
        children: editandoFunc ? "Editar Funcionário" : "Adicionar à Folha"
      }), /* @__PURE__ */ jsxs("form", {
        onSubmit: salvarFunc,
        style: formCol,
        children: [/* @__PURE__ */ jsxs("div", {
          children: [/* @__PURE__ */ jsx("label", {
            style: labelStyle$1,
            children: "Funcionário"
          }), /* @__PURE__ */ jsxs("select", {
            value: formFunc.operator_id,
            onChange: (e) => setFormFunc({
              ...formFunc,
              operator_id: e.target.value
            }),
            required: true,
            style: inputStyle$1,
            children: [/* @__PURE__ */ jsx("option", {
              value: "",
              children: "Selecione..."
            }), operadores.map((o) => /* @__PURE__ */ jsx("option", {
              value: o.id,
              children: o.nome
            }, o.id))]
          })]
        }), /* @__PURE__ */ jsxs("div", {
          children: [/* @__PURE__ */ jsx("label", {
            style: labelStyle$1,
            children: "Salário Base (R$)"
          }), /* @__PURE__ */ jsx("input", {
            type: "number",
            step: "0.01",
            min: "0",
            required: true,
            value: formFunc.salario_base,
            onChange: (e) => setFormFunc({
              ...formFunc,
              salario_base: e.target.value
            }),
            placeholder: "0,00",
            style: inputStyle$1
          })]
        }), /* @__PURE__ */ jsxs("div", {
          children: [/* @__PURE__ */ jsx("label", {
            style: labelStyle$1,
            children: "Vale Alimentação (R$)"
          }), /* @__PURE__ */ jsx("input", {
            type: "number",
            step: "0.01",
            min: "0",
            value: formFunc.vale_alimentacao,
            onChange: (e) => setFormFunc({
              ...formFunc,
              vale_alimentacao: e.target.value
            }),
            placeholder: "0,00",
            style: inputStyle$1
          })]
        }), formFunc.salario_base && /* @__PURE__ */ jsxs("div", {
          style: {
            background: "#f0fdf4",
            borderRadius: 8,
            padding: "10px 14px"
          },
          children: [/* @__PURE__ */ jsx("p", {
            style: {
              fontSize: 11,
              color: "#166534",
              margin: "0 0 4px",
              fontWeight: 600
            },
            children: "Custo mensal estimado"
          }), /* @__PURE__ */ jsx("p", {
            style: {
              fontSize: 16,
              color: "#166534",
              fontWeight: 700,
              margin: 0
            },
            children: fmt((Number(formFunc.salario_base) || 0) + (Number(formFunc.vale_alimentacao) || 0) + (Number(formFunc.salario_base) || 0) / 12 + ((Number(formFunc.salario_base) || 0) + (Number(formFunc.salario_base) || 0) / 3) / 12)
          }), /* @__PURE__ */ jsx("p", {
            style: {
              fontSize: 10,
              color: "#166534",
              margin: "4px 0 0",
              opacity: 0.7
            },
            children: "Salário + VA + Prov. 13º + Prov. Férias"
          })]
        }), /* @__PURE__ */ jsx(ModalButtons, {
          salvando,
          onCancel: () => setMostraFormFunc(false),
          label: editandoFunc ? "Atualizar" : "Adicionar"
        })]
      })]
    }), mostraFormExtra && /* @__PURE__ */ jsxs(Modal, {
      onClose: () => setMostraFormExtra(false),
      children: [/* @__PURE__ */ jsx("h2", {
        style: modalTitle,
        children: editandoExtra ? "Editar Gasto" : "Novo Gasto"
      }), /* @__PURE__ */ jsxs("form", {
        onSubmit: salvarExtra,
        style: formCol,
        children: [/* @__PURE__ */ jsxs("div", {
          children: [/* @__PURE__ */ jsx("label", {
            style: labelStyle$1,
            children: "Descrição"
          }), /* @__PURE__ */ jsx("input", {
            type: "text",
            required: true,
            value: formExtra.descricao,
            onChange: (e) => setFormExtra({
              ...formExtra,
              descricao: e.target.value
            }),
            placeholder: "Ex: Pró-labore, Contador...",
            style: inputStyle$1
          })]
        }), /* @__PURE__ */ jsxs("div", {
          children: [/* @__PURE__ */ jsx("label", {
            style: labelStyle$1,
            children: "Valor (R$)"
          }), /* @__PURE__ */ jsx("input", {
            type: "number",
            step: "0.01",
            min: "0",
            required: true,
            value: formExtra.valor,
            onChange: (e) => setFormExtra({
              ...formExtra,
              valor: e.target.value
            }),
            placeholder: "0,00",
            style: inputStyle$1
          })]
        }), /* @__PURE__ */ jsxs("div", {
          children: [/* @__PURE__ */ jsx("label", {
            style: labelStyle$1,
            children: "Frequência"
          }), /* @__PURE__ */ jsx("div", {
            style: {
              display: "flex",
              gap: 8,
              marginTop: 6
            },
            children: [{
              key: "todos",
              label: "Todos os meses",
              icon: "repeat"
            }, {
              key: "avulso",
              label: "Mês específico",
              icon: "event"
            }].map((opt) => /* @__PURE__ */ jsxs("button", {
              type: "button",
              onClick: () => setFormExtra({
                ...formExtra,
                tipo: opt.key
              }),
              style: {
                flex: 1,
                padding: "10px 12px",
                borderRadius: 8,
                border: formExtra.tipo === opt.key ? "2px solid rgb(22,134,78)" : "1px solid #e2e8f0",
                background: formExtra.tipo === opt.key ? "#f0fdf4" : "#fff",
                color: formExtra.tipo === opt.key ? "rgb(22,134,78)" : "#64748b",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6
              },
              children: [/* @__PURE__ */ jsx("span", {
                className: "material-symbols-outlined",
                style: {
                  fontSize: 16
                },
                children: opt.icon
              }), opt.label]
            }, opt.key))
          })]
        }), formExtra.tipo === "avulso" && /* @__PURE__ */ jsxs("div", {
          children: [/* @__PURE__ */ jsx("label", {
            style: labelStyle$1,
            children: "Mês"
          }), /* @__PURE__ */ jsx("select", {
            value: formExtra.mes,
            onChange: (e) => setFormExtra({
              ...formExtra,
              mes: Number(e.target.value)
            }),
            style: inputStyle$1,
            children: MESES_FULL.map((m, i) => /* @__PURE__ */ jsx("option", {
              value: i + 1,
              children: m
            }, i + 1))
          })]
        }), formExtra.tipo === "todos" && /* @__PURE__ */ jsx("div", {
          style: {
            background: "#eff6ff",
            borderRadius: 8,
            padding: "8px 12px",
            fontSize: 12,
            color: "#1e40af"
          },
          children: 'Esse gasto vai aparecer em todos os 12 meses. Você pode remover de meses específicos depois abrindo o mês e clicando em "Tirar deste mês".'
        }), /* @__PURE__ */ jsx(ModalButtons, {
          salvando,
          onCancel: () => setMostraFormExtra(false),
          label: editandoExtra ? "Atualizar" : "Adicionar"
        })]
      })]
    })]
  });
});
function Modal({
  children,
  onClose
}) {
  return /* @__PURE__ */ jsx("div", {
    onClick: onClose,
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.35)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1e3
    },
    children: /* @__PURE__ */ jsx("div", {
      onClick: (e) => e.stopPropagation(),
      style: {
        background: "#fff",
        borderRadius: 14,
        padding: 28,
        width: 440,
        maxHeight: "90vh",
        overflow: "auto",
        boxShadow: "0 20px 60px rgba(0,0,0,0.18)"
      },
      children
    })
  });
}
function ModalButtons({
  salvando,
  onCancel,
  label
}) {
  return /* @__PURE__ */ jsxs("div", {
    style: {
      display: "flex",
      gap: 10,
      marginTop: 6
    },
    children: [/* @__PURE__ */ jsx("button", {
      type: "button",
      onClick: onCancel,
      style: {
        flex: 1,
        padding: 10,
        borderRadius: 8,
        border: "1px solid #e2e8f0",
        background: "#fff",
        color: "#64748b",
        fontSize: 14,
        fontWeight: 600,
        cursor: "pointer"
      },
      children: "Cancelar"
    }), /* @__PURE__ */ jsx("button", {
      type: "submit",
      disabled: salvando,
      style: {
        flex: 1,
        padding: 10,
        borderRadius: 8,
        border: "none",
        background: "rgb(22,134,78)",
        color: "#fff",
        fontSize: 14,
        fontWeight: 600,
        cursor: "pointer",
        opacity: salvando ? 0.6 : 1
      },
      children: salvando ? "Salvando..." : label
    })]
  });
}
const cardStyle$1 = {
  background: "#fff",
  borderRadius: 12,
  padding: 24,
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
};
const cardLabel = {
  fontSize: 12,
  color: "#64748b",
  margin: "0 0 4px"
};
const cardValor = {
  fontSize: 24,
  fontWeight: 700,
  margin: 0
};
const sectionTitle = {
  fontSize: 14,
  fontWeight: 600,
  color: "#64748b",
  margin: "0 0 10px",
  textTransform: "uppercase",
  letterSpacing: 0.5
};
const th = {
  textAlign: "left",
  padding: "8px 12px",
  fontSize: 11,
  fontWeight: 600,
  color: "#64748b",
  textTransform: "uppercase"
};
const td = {
  padding: "10px 12px",
  fontSize: 13
};
const btnNav$1 = {
  background: "#f1f5f9",
  border: "1px solid #e2e8f0",
  padding: "6px 12px",
  borderRadius: 6,
  fontSize: 14,
  cursor: "pointer",
  fontWeight: 600
};
const btnSmall = {
  padding: "6px 14px",
  borderRadius: 6,
  border: "none",
  background: "rgb(22,134,78)",
  color: "#fff",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer"
};
const btnIcon = {
  background: "none",
  border: "none",
  cursor: "pointer",
  color: "#64748b",
  padding: 4,
  borderRadius: 4,
  display: "flex",
  alignItems: "center"
};
const btnLink = {
  background: "none",
  border: "none",
  cursor: "pointer",
  color: "#2563eb",
  fontSize: 12,
  fontWeight: 500,
  padding: 0
};
const inputStyle$1 = {
  width: "100%",
  padding: "8px 12px",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  fontSize: 14,
  outline: "none",
  marginTop: 4,
  boxSizing: "border-box"
};
const labelStyle$1 = {
  fontSize: 12,
  fontWeight: 600,
  color: "#374151"
};
const modalTitle = {
  fontSize: 18,
  fontWeight: 700,
  margin: "0 0 20px",
  color: "#1e293b"
};
const formCol = {
  display: "flex",
  flexDirection: "column",
  gap: 14
};
const route8 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: standalone_folha
}, Symbol.toStringTag, { value: "Module" }));
function hojeISO() {
  const h = /* @__PURE__ */ new Date();
  return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}-${String(h.getDate()).padStart(2, "0")}`;
}
const standalone_ponto = UNSAFE_withComponentProps(function MetricasHome() {
  const [modo, setModo] = useState("dia");
  const [dataSelecionada, setDataSelecionada] = useState(hojeISO());
  const [pontoData, setPontoData] = useState([]);
  const [resumoData, setResumoData] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  function formatDateParam(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  function formatDataBR(isoStr) {
    const [y, m, d] = isoStr.split("-");
    return `${d}/${m}/${y}`;
  }
  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro("");
    try {
      const [year, month, day] = dataSelecionada.split("-").map(Number);
      const pontoRes = await fetch(`/api/teamlogger/punch_report?year=${year}&month=${month}&day=${day}&timezoneOffsetMinutes=-180`);
      const pontoJson = await pontoRes.json();
      setPontoData(Array.isArray(pontoJson) ? pontoJson : []);
      const baseDate = /* @__PURE__ */ new Date(dataSelecionada + "T12:00:00");
      let startDate, endDate;
      if (modo === "dia") {
        startDate = dataSelecionada;
        endDate = dataSelecionada;
      } else if (modo === "7dias") {
        const d = new Date(baseDate);
        d.setDate(d.getDate() - 6);
        startDate = formatDateParam(d);
        endDate = dataSelecionada;
      } else {
        const d = new Date(baseDate);
        d.setDate(d.getDate() - 29);
        startDate = formatDateParam(d);
        endDate = dataSelecionada;
      }
      const startMs = (/* @__PURE__ */ new Date(startDate + "T00:00:00")).getTime();
      const endMs = (/* @__PURE__ */ new Date(endDate + "T23:59:59")).getTime();
      const resumoRes = await fetch(`/api/teamlogger/summary_report?startTime=${startMs}&endTime=${endMs}`);
      const resumoJson = await resumoRes.json();
      setResumoData(Array.isArray(resumoJson) ? resumoJson : []);
    } catch (e) {
      setErro("Erro ao carregar dados: " + e.message);
    }
    setCarregando(false);
  }, [modo, dataSelecionada]);
  useEffect(() => {
    carregar();
  }, [carregar]);
  function formatHoras(horas) {
    if (horas == null || isNaN(horas) || horas === 0) return "0,0 h";
    return `${horas.toFixed(1).replace(".", ",")} h`;
  }
  function formatMinutos(horas) {
    if (horas == null || isNaN(horas) || horas === 0) return "0 min";
    const min = Math.round(horas * 60);
    return `${min} min`;
  }
  function buildEmployeeCards() {
    return pontoData.map((p) => {
      const presente = p.punchInGMT !== "Absent" && p.totalHours > 0;
      return {
        nome: p.employeeName || "—",
        presente,
        entrada: presente ? p.punchInLocalTime : null,
        saida: presente ? p.punchOutLocalTime : null,
        totalHours: p.totalHours || 0
      };
    }).sort((a, b) => {
      if (a.presente === b.presente) return a.nome.localeCompare(b.nome);
      return a.presente ? 1 : -1;
    });
  }
  const JORNADA_HORAS = 8;
  function buildResumoRows() {
    return resumoData.filter((r) => r.totalHours > 0).sort((a, b) => (b.totalHours || 0) - (a.totalHours || 0)).map((r) => {
      const total = r.totalHours || 0;
      const faltam = Math.max(JORNADA_HORAS - total, 0);
      const jornadaPct = Math.min(total / JORNADA_HORAS * 100, 100);
      return {
        nome: r.title || "—",
        totalHours: total,
        offComputerHours: r.offComputerHours || 0,
        idleHours: r.idleHours || 0,
        atividade: Math.round((r.activeMinutesRatio || 0) * 100),
        faltamHours: faltam,
        jornadaPct: Math.round(jornadaPct)
      };
    });
  }
  const employeeCards = buildEmployeeCards();
  const resumoRows = buildResumoRows();
  const ehHoje = dataSelecionada === hojeISO();
  const dataLabel = ehHoje ? "Hoje" : formatDataBR(dataSelecionada);
  const periodoLabel = modo === "dia" ? dataLabel : modo === "7dias" ? `7 dias até ${dataLabel}` : `30 dias até ${dataLabel}`;
  return /* @__PURE__ */ jsx("div", {
    children: /* @__PURE__ */ jsxs("div", {
      style: {
        background: "#fff",
        borderRadius: 12,
        padding: "24px 28px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
      },
      children: [/* @__PURE__ */ jsxs("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24
        },
        children: [/* @__PURE__ */ jsxs("div", {
          style: {
            display: "flex",
            alignItems: "center",
            gap: 10
          },
          children: [/* @__PURE__ */ jsx("span", {
            style: {
              fontSize: 22
            },
            children: "📊"
          }), /* @__PURE__ */ jsx("h1", {
            style: {
              fontSize: 20,
              fontWeight: 700,
              color: "#1e293b"
            },
            children: "TeamLogger — Monitoramento"
          })]
        }), /* @__PURE__ */ jsxs("div", {
          style: {
            display: "flex",
            gap: 6,
            alignItems: "center",
            flexWrap: "wrap"
          },
          children: [/* @__PURE__ */ jsx("input", {
            type: "date",
            value: dataSelecionada,
            onChange: (e) => setDataSelecionada(e.target.value),
            max: hojeISO(),
            style: {
              padding: "5px 10px",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              fontSize: 13,
              color: "#374151",
              outline: "none",
              cursor: "pointer"
            }
          }), !ehHoje && /* @__PURE__ */ jsx("button", {
            onClick: () => setDataSelecionada(hojeISO()),
            style: {
              padding: "5px 12px",
              borderRadius: 20,
              border: "1px solid #e2e8f0",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              background: "#fff",
              color: "#6366f1"
            },
            children: "Hoje"
          }), /* @__PURE__ */ jsx("span", {
            style: {
              width: 1,
              height: 20,
              background: "#e2e8f0"
            }
          }), [{
            key: "dia",
            label: "Dia"
          }, {
            key: "7dias",
            label: "7 dias"
          }, {
            key: "30dias",
            label: "30 dias"
          }].map((tab) => /* @__PURE__ */ jsx("button", {
            onClick: () => setModo(tab.key),
            style: {
              padding: "6px 18px",
              borderRadius: 20,
              border: modo === tab.key ? "none" : "1px solid #e2e8f0",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              background: modo === tab.key ? "#6366f1" : "#fff",
              color: modo === tab.key ? "#fff" : "#64748b"
            },
            children: tab.label
          }, tab.key)), /* @__PURE__ */ jsx("button", {
            onClick: carregar,
            style: {
              background: "none",
              border: "none",
              fontSize: 18,
              cursor: "pointer",
              color: "#94a3b8",
              marginLeft: 4
            },
            title: "Atualizar",
            children: "↻"
          })]
        })]
      }), erro && /* @__PURE__ */ jsx("div", {
        style: {
          background: "#fef2f2",
          border: "1px solid #fecaca",
          color: "#dc2626",
          padding: "8px 12px",
          borderRadius: 6,
          fontSize: 13,
          marginBottom: 16
        },
        children: erro
      }), /* @__PURE__ */ jsxs("div", {
        style: {
          marginBottom: 32
        },
        children: [/* @__PURE__ */ jsxs("h2", {
          style: {
            fontSize: 12,
            fontWeight: 700,
            color: "#8892a4",
            textTransform: "uppercase",
            letterSpacing: 1.2,
            marginBottom: 14
          },
          children: ["Ponto ", ehHoje ? "de Hoje" : "", " — ", formatDataBR(dataSelecionada)]
        }), carregando ? /* @__PURE__ */ jsx("p", {
          style: {
            color: "#94a3b8",
            fontSize: 14
          },
          children: "Carregando..."
        }) : employeeCards.length === 0 ? /* @__PURE__ */ jsx("p", {
          style: {
            color: "#94a3b8",
            fontSize: 14
          },
          children: "Nenhum funcionário encontrado."
        }) : /* @__PURE__ */ jsx("div", {
          style: {
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12
          },
          children: employeeCards.map((emp, i) => /* @__PURE__ */ jsxs("div", {
            style: {
              background: "#f9fafb",
              border: "1px solid #edf0f3",
              borderRadius: 10,
              padding: "14px 16px",
              minHeight: 70
            },
            children: [/* @__PURE__ */ jsxs("div", {
              style: {
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 4
              },
              children: [/* @__PURE__ */ jsx("span", {
                style: {
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: emp.presente ? "#f59e0b" : "#ef4444",
                  display: "inline-block",
                  flexShrink: 0
                }
              }), /* @__PURE__ */ jsx("span", {
                style: {
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#2d3748"
                },
                children: emp.nome
              })]
            }), emp.presente ? /* @__PURE__ */ jsxs("div", {
              style: {
                fontSize: 13,
                color: "#5a657a",
                lineHeight: 1.7,
                paddingLeft: 18
              },
              children: [/* @__PURE__ */ jsxs("div", {
                children: ["Entrada: ", /* @__PURE__ */ jsx("strong", {
                  style: {
                    color: "#2d3748"
                  },
                  children: emp.entrada
                })]
              }), emp.saida && emp.saida !== "Absent" && /* @__PURE__ */ jsxs("div", {
                children: ["Saída: ", /* @__PURE__ */ jsx("strong", {
                  style: {
                    color: "#2d3748"
                  },
                  children: emp.saida
                })]
              }), /* @__PURE__ */ jsxs("div", {
                children: ["Total: ", /* @__PURE__ */ jsx("strong", {
                  style: {
                    color: "#2d3748"
                  },
                  children: formatHoras(emp.totalHours)
                })]
              })]
            }) : /* @__PURE__ */ jsx("p", {
              style: {
                fontSize: 13,
                color: "#ef4444",
                fontWeight: 500,
                paddingLeft: 18
              },
              children: "Ausente hoje"
            })]
          }, i))
        })]
      }), /* @__PURE__ */ jsxs("div", {
        children: [/* @__PURE__ */ jsxs("h2", {
          style: {
            fontSize: 12,
            fontWeight: 700,
            color: "#8892a4",
            textTransform: "uppercase",
            letterSpacing: 1.2,
            marginBottom: 14
          },
          children: ["Resumo de Atividade — ", periodoLabel]
        }), carregando ? /* @__PURE__ */ jsx("p", {
          style: {
            color: "#94a3b8",
            fontSize: 14
          },
          children: "Carregando..."
        }) : resumoRows.length === 0 ? /* @__PURE__ */ jsx("p", {
          style: {
            color: "#94a3b8",
            fontSize: 14
          },
          children: "Nenhum dado de atividade encontrado."
        }) : /* @__PURE__ */ jsx("div", {
          style: {
            overflowX: "auto"
          },
          children: /* @__PURE__ */ jsxs("table", {
            style: {
              width: "100%",
              borderCollapse: "collapse"
            },
            children: [/* @__PURE__ */ jsx("thead", {
              children: /* @__PURE__ */ jsx("tr", {
                style: {
                  borderBottom: "2px solid #edf0f3"
                },
                children: [{
                  label: "Funcionário",
                  tip: null
                }, {
                  label: "Jornada",
                  tip: "Progresso em relação à jornada de 8 horas"
                }, {
                  label: "Fora do PC",
                  tip: "Tempo que o funcionário esteve longe do computador (reunião, pausa, etc.)"
                }, {
                  label: "Ocioso",
                  tip: "Tempo no computador sem atividade de mouse ou teclado"
                }, {
                  label: "Atividade",
                  tip: "Percentual de tempo com atividade ativa (mouse/teclado) em relação ao tempo total"
                }].map((h) => /* @__PURE__ */ jsxs("th", {
                  title: h.tip || "",
                  style: {
                    textAlign: h.label === "Funcionário" ? "left" : "center",
                    padding: "10px 16px",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#8892a4",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    cursor: h.tip ? "help" : "default"
                  },
                  children: [h.label, h.tip ? " ⓘ" : ""]
                }, h.label))
              })
            }), /* @__PURE__ */ jsx("tbody", {
              children: resumoRows.map((r, i) => {
                let barColor = "#ef4444";
                if (r.atividade >= 75) barColor = "#22c55e";
                else if (r.atividade >= 50) barColor = "#f59e0b";
                else if (r.atividade >= 25) barColor = "#f97316";
                return /* @__PURE__ */ jsxs("tr", {
                  style: {
                    borderBottom: "1px solid #f3f4f6"
                  },
                  children: [/* @__PURE__ */ jsx("td", {
                    style: {
                      padding: "14px 16px",
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#2d3748"
                    },
                    children: r.nome
                  }), /* @__PURE__ */ jsx("td", {
                    style: {
                      padding: "14px 16px",
                      textAlign: "center"
                    },
                    children: /* @__PURE__ */ jsxs("div", {
                      style: {
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 4
                      },
                      children: [/* @__PURE__ */ jsxs("div", {
                        style: {
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          width: "100%"
                        },
                        children: [/* @__PURE__ */ jsx("div", {
                          style: {
                            flex: 1,
                            height: 8,
                            borderRadius: 4,
                            background: "#e5e7eb",
                            overflow: "hidden",
                            minWidth: 80
                          },
                          children: /* @__PURE__ */ jsx("div", {
                            style: {
                              width: `${r.jornadaPct}%`,
                              height: "100%",
                              borderRadius: 4,
                              background: r.jornadaPct >= 100 ? "#22c55e" : r.jornadaPct >= 60 ? "#6366f1" : "#f59e0b"
                            }
                          })
                        }), /* @__PURE__ */ jsxs("span", {
                          style: {
                            fontSize: 13,
                            fontWeight: 700,
                            color: "#2d3748",
                            whiteSpace: "nowrap"
                          },
                          children: [formatHoras(r.totalHours), " / 8h"]
                        })]
                      }), r.faltamHours > 0 && /* @__PURE__ */ jsxs("span", {
                        style: {
                          fontSize: 11,
                          color: "#ef4444",
                          fontWeight: 500
                        },
                        children: ["Faltam ", formatHoras(r.faltamHours)]
                      }), r.faltamHours === 0 && /* @__PURE__ */ jsx("span", {
                        style: {
                          fontSize: 11,
                          color: "#22c55e",
                          fontWeight: 600
                        },
                        children: "Jornada completa"
                      })]
                    })
                  }), /* @__PURE__ */ jsx("td", {
                    style: {
                      padding: "14px 16px",
                      fontSize: 14,
                      color: "#6366f1",
                      fontStyle: "italic",
                      textAlign: "center"
                    },
                    children: formatMinutos(r.offComputerHours)
                  }), /* @__PURE__ */ jsx("td", {
                    style: {
                      padding: "14px 16px",
                      fontSize: 14,
                      color: "#64748b",
                      textAlign: "center"
                    },
                    children: formatMinutos(r.idleHours)
                  }), /* @__PURE__ */ jsx("td", {
                    style: {
                      padding: "14px 16px"
                    },
                    children: /* @__PURE__ */ jsxs("div", {
                      style: {
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 10
                      },
                      children: [/* @__PURE__ */ jsx("div", {
                        style: {
                          width: 80,
                          height: 8,
                          borderRadius: 4,
                          background: "#e5e7eb",
                          overflow: "hidden"
                        },
                        children: /* @__PURE__ */ jsx("div", {
                          style: {
                            width: `${Math.min(r.atividade, 100)}%`,
                            height: "100%",
                            borderRadius: 4,
                            background: barColor
                          }
                        })
                      }), /* @__PURE__ */ jsxs("span", {
                        style: {
                          fontSize: 14,
                          fontWeight: 700,
                          color: barColor,
                          minWidth: 40,
                          textAlign: "right"
                        },
                        children: [r.atividade, " %"]
                      })]
                    })
                  })]
                }, i);
              })
            })]
          })
        })]
      })]
    })
  });
});
const route9 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: standalone_ponto
}, Symbol.toStringTag, { value: "Module" }));
const standalone_funcionarios = UNSAFE_withComponentProps(function Funcionarios() {
  const toast = useToast();
  const {
    confirm
  } = useConfirm();
  const [funcionarios, setFuncionarios] = useState([]);
  const [pendentes, setPendentes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [mostraForm, setMostraForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(formVazio());
  const [salvando, setSalvando] = useState(false);
  const [hoveredRow, setHoveredRow] = useState(null);
  const [senhaModal, setSenhaModal] = useState(null);
  function formVazio() {
    return {
      nome: "",
      email: "",
      telefone: "",
      cpf: "",
      cargo: "colaborador",
      teamlogger_email: "",
      departamento: "",
      data_admissao: "",
      tipo_contrato: "clt",
      salario_base: "",
      status: "aprovado",
      observacoes: "",
      ultimo_exame_periodico: ""
    };
  }
  useEffect(() => {
    carregar();
  }, []);
  async function carregar() {
    setCarregando(true);
    const {
      data,
      error
    } = await supabase.from("operadores").select("*").in("status", ["aprovado", "active"]).order("nome");
    if (!error && data) {
      setFuncionarios(data);
    }
    const {
      data: pend
    } = await supabase.from("operadores").select("*").eq("status", "pendente").order("created_at", {
      ascending: false
    });
    setPendentes(pend || []);
    setCarregando(false);
  }
  async function aprovar(id, nome) {
    const {
      error
    } = await supabase.from("operadores").update({
      status: "aprovado"
    }).eq("id", id);
    if (error) {
      toast.error("Erro ao aprovar: " + error.message);
    } else {
      toast.success("Cadastro aprovado!");
      carregar();
    }
  }
  async function recusar(id) {
    const ok = await confirm("Tem certeza que deseja recusar este cadastro?", {
      title: "Recusar cadastro",
      confirmText: "Recusar",
      danger: true
    });
    if (!ok) return;
    const {
      error
    } = await supabase.from("operadores").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao recusar: " + error.message);
    } else {
      toast.success("Cadastro recusado.");
      carregar();
    }
  }
  const filtrados = funcionarios.filter((f) => {
    var _a, _b, _c, _d;
    return ((_a = f.nome) == null ? void 0 : _a.toLowerCase().includes(busca.toLowerCase())) || ((_b = f.email) == null ? void 0 : _b.toLowerCase().includes(busca.toLowerCase())) || ((_c = f.cargo) == null ? void 0 : _c.toLowerCase().includes(busca.toLowerCase())) || ((_d = f.departamento) == null ? void 0 : _d.toLowerCase().includes(busca.toLowerCase()));
  });
  function abrirEditar(f) {
    setEditando(f.id);
    setForm({
      nome: f.nome || "",
      email: f.email || "",
      telefone: f.telefone || "",
      cpf: f.cpf || "",
      cargo: f.cargo || "colaborador",
      teamlogger_email: f.teamlogger_email || "",
      departamento: f.departamento || "",
      data_admissao: f.data_admissao || "",
      tipo_contrato: f.tipo_contrato || "clt",
      salario_base: f.salario_base || "",
      status: f.status || "aprovado",
      observacoes: f.observacoes || "",
      ultimo_exame_periodico: f.ultimo_exame_periodico || ""
    });
    setMostraForm(true);
  }
  function abrirNovo() {
    setEditando(null);
    setForm(formVazio());
    setMostraForm(true);
  }
  async function salvar(e) {
    e.preventDefault();
    setSalvando(true);
    const dados = {
      ...form
    };
    if (dados.salario_base) dados.salario_base = Number(dados.salario_base);
    else delete dados.salario_base;
    if (!dados.data_admissao) delete dados.data_admissao;
    if (!dados.telefone) delete dados.telefone;
    if (!dados.cpf) delete dados.cpf;
    if (!dados.teamlogger_email) delete dados.teamlogger_email;
    if (!dados.departamento) delete dados.departamento;
    if (!dados.observacoes) delete dados.observacoes;
    if (!dados.ultimo_exame_periodico) delete dados.ultimo_exame_periodico;
    if (editando) {
      const {
        error
      } = await supabase.from("operadores").update(dados).eq("id", editando);
      if (error) toast.error("Erro ao atualizar: " + error.message);
      else toast.success("Funcionário atualizado!");
    } else {
      dados.senha_hash = Math.random().toString(36).slice(2, 10);
      const {
        error
      } = await supabase.from("operadores").insert(dados);
      if (error) toast.error("Erro ao criar: " + error.message);
      else toast.success("Funcionário criado!");
    }
    setSalvando(false);
    setMostraForm(false);
    setEditando(null);
    carregar();
  }
  async function excluir(f) {
    const ok = await confirm(`Tem certeza que deseja excluir ${f.nome}?

Essa ação não pode ser desfeita.`, {
      title: "Excluir funcionário",
      confirmText: "Excluir",
      danger: true
    });
    if (!ok) return;
    const {
      error
    } = await supabase.from("operadores").delete().eq("id", f.id);
    if (error) {
      toast.error("Erro ao excluir: " + error.message);
    } else {
      toast.success("Funcionário excluído.");
      carregar();
    }
  }
  function abrirSenha(f) {
    setSenhaModal({
      id: f.id,
      nome: f.nome,
      senha_atual: f.senha_hash || "",
      nova_senha: ""
    });
  }
  async function salvarNovaSenha() {
    if (!senhaModal || !senhaModal.nova_senha.trim()) {
      toast.warn("Digite a nova senha.");
      return;
    }
    const {
      error
    } = await supabase.from("operadores").update({
      senha_hash: senhaModal.nova_senha.trim()
    }).eq("id", senhaModal.id);
    if (error) toast.error("Erro: " + error.message);
    else {
      toast.success("Senha alterada!");
      setSenhaModal(null);
      carregar();
    }
  }
  const cargoCor = {
    admin: {
      bg: "#ede9fe",
      text: "#7c3aed",
      border: "#c4b5fd",
      label: "Admin"
    },
    rh: {
      bg: "#dbeafe",
      text: "#2563eb",
      border: "#93c5fd",
      label: "RH"
    },
    gestor: {
      bg: "#fef3c7",
      text: "#d97706",
      border: "#fcd34d",
      label: "Gestor"
    },
    colaborador: {
      bg: "#f0fdf4",
      text: "#16a34a",
      border: "#86efac",
      label: "Colaborador"
    }
  };
  const contratoCor = {
    clt: {
      bg: "#eff6ff",
      text: "#1d4ed8",
      label: "CLT"
    },
    pj: {
      bg: "#faf5ff",
      text: "#7c3aed",
      label: "PJ"
    },
    estagio: {
      bg: "#ecfdf5",
      text: "#059669",
      label: "Estágio"
    },
    temporario: {
      bg: "#fff7ed",
      text: "#ea580c",
      label: "Temporário"
    }
  };
  function getIniciais(nome) {
    if (!nome) return "?";
    const partes = nome.trim().split(/\s+/);
    if (partes.length === 1) return partes[0][0].toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  }
  function getAvatarColor(nome) {
    if (!nome) return "#94a3b8";
    const colors = ["#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316", "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6"];
    let hash = 0;
    for (let i = 0; i < nome.length; i++) hash = nome.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }
  function formatDate2(dateStr) {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString("pt-BR");
    } catch {
      return null;
    }
  }
  function diasDesde(dateStr) {
    if (!dateStr) return null;
    try {
      const diff = Date.now() - new Date(dateStr).getTime();
      return Math.floor(diff / (1e3 * 60 * 60 * 24));
    } catch {
      return null;
    }
  }
  function exameStatus(dateStr) {
    const dias = diasDesde(dateStr);
    if (dias === null) return {
      label: "Não informado",
      color: "#94a3b8",
      bg: "#f8fafc"
    };
    if (dias > 365) return {
      label: `${formatDate2(dateStr)} (vencido)`,
      color: "#dc2626",
      bg: "#fef2f2"
    };
    if (dias > 300) return {
      label: `${formatDate2(dateStr)} (vence em breve)`,
      color: "#d97706",
      bg: "#fffbeb"
    };
    return {
      label: formatDate2(dateStr),
      color: "#16a34a",
      bg: "#f0fdf4"
    };
  }
  const inputStyle2 = {
    display: "block",
    width: "100%",
    padding: "10px 14px",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
    marginTop: 4,
    boxSizing: "border-box",
    transition: "border-color 0.2s, box-shadow 0.2s"
  };
  return /* @__PURE__ */ jsxs("div", {
    style: {
      maxWidth: 1200,
      margin: "0 auto"
    },
    children: [/* @__PURE__ */ jsxs("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 24
      },
      children: [/* @__PURE__ */ jsxs("div", {
        children: [/* @__PURE__ */ jsx("h1", {
          style: {
            fontSize: 24,
            fontWeight: 700,
            color: "#0f172a",
            margin: 0
          },
          children: "Funcionários"
        }), /* @__PURE__ */ jsxs("p", {
          style: {
            fontSize: 14,
            color: "#64748b",
            margin: "4px 0 0"
          },
          children: [funcionarios.length, " colaborador", funcionarios.length !== 1 ? "es" : "", " ativo", funcionarios.length !== 1 ? "s" : ""]
        })]
      }), /* @__PURE__ */ jsxs("button", {
        onClick: abrirNovo,
        style: {
          background: "linear-gradient(135deg, #1e40af, #3b82f6)",
          color: "#fff",
          border: "none",
          padding: "10px 20px",
          borderRadius: 10,
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8,
          boxShadow: "0 2px 8px rgba(30,64,175,0.3)",
          transition: "transform 0.15s, box-shadow 0.15s"
        },
        onMouseEnter: (e) => {
          e.currentTarget.style.transform = "translateY(-1px)";
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(30,64,175,0.4)";
        },
        onMouseLeave: (e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 2px 8px rgba(30,64,175,0.3)";
        },
        children: [/* @__PURE__ */ jsx("span", {
          style: {
            fontSize: 18,
            lineHeight: 1
          },
          children: "+"
        }), "Novo Funcionário"]
      })]
    }), pendentes.length > 0 && /* @__PURE__ */ jsxs("div", {
      style: {
        background: "linear-gradient(135deg, #fffbeb, #fef3c7)",
        border: "1px solid #fde68a",
        borderRadius: 12,
        padding: 20,
        marginBottom: 24
      },
      children: [/* @__PURE__ */ jsxs("h3", {
        style: {
          fontSize: 15,
          fontWeight: 700,
          color: "#92400e",
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          gap: 8
        },
        children: [/* @__PURE__ */ jsx("span", {
          style: {
            background: "#dc2626",
            color: "#fff",
            borderRadius: "50%",
            width: 24,
            height: 24,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 700
          },
          children: pendentes.length
        }), "Cadastro", pendentes.length > 1 ? "s" : "", " aguardando aprovação"]
      }), /* @__PURE__ */ jsx("div", {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 10
        },
        children: pendentes.map((p) => /* @__PURE__ */ jsxs("div", {
          style: {
            background: "#fff",
            borderRadius: 10,
            padding: "14px 18px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
          },
          children: [/* @__PURE__ */ jsxs("div", {
            style: {
              display: "flex",
              alignItems: "center",
              gap: 12
            },
            children: [/* @__PURE__ */ jsx("div", {
              style: {
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: getAvatarColor(p.nome),
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 700
              },
              children: getIniciais(p.nome)
            }), /* @__PURE__ */ jsxs("div", {
              children: [/* @__PURE__ */ jsx("span", {
                style: {
                  fontWeight: 600,
                  fontSize: 14,
                  color: "#1e293b"
                },
                children: p.nome
              }), /* @__PURE__ */ jsx("span", {
                style: {
                  color: "#64748b",
                  fontSize: 13,
                  marginLeft: 10
                },
                children: p.email
              })]
            })]
          }), /* @__PURE__ */ jsxs("div", {
            style: {
              display: "flex",
              alignItems: "center",
              gap: 10
            },
            children: [p.created_at && /* @__PURE__ */ jsx("span", {
              style: {
                color: "#94a3b8",
                fontSize: 12
              },
              children: new Date(p.created_at).toLocaleDateString("pt-BR")
            }), /* @__PURE__ */ jsx("button", {
              onClick: () => aprovar(p.id, p.nome),
              style: {
                background: "#16a34a",
                color: "#fff",
                border: "none",
                padding: "6px 16px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer"
              },
              children: "Aprovar"
            }), /* @__PURE__ */ jsx("button", {
              onClick: () => recusar(p.id),
              style: {
                background: "#fef2f2",
                color: "#dc2626",
                border: "1px solid #fecaca",
                padding: "6px 16px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer"
              },
              children: "Recusar"
            })]
          })]
        }, p.id))
      })]
    }), /* @__PURE__ */ jsxs("div", {
      style: {
        position: "relative",
        marginBottom: 20
      },
      children: [/* @__PURE__ */ jsx("span", {
        style: {
          position: "absolute",
          left: 14,
          top: "50%",
          transform: "translateY(-50%)",
          color: "#94a3b8",
          fontSize: 16
        },
        children: /* @__PURE__ */ jsxs("svg", {
          width: "16",
          height: "16",
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          strokeWidth: "2.5",
          strokeLinecap: "round",
          strokeLinejoin: "round",
          children: [/* @__PURE__ */ jsx("circle", {
            cx: "11",
            cy: "11",
            r: "8"
          }), /* @__PURE__ */ jsx("line", {
            x1: "21",
            y1: "21",
            x2: "16.65",
            y2: "16.65"
          })]
        })
      }), /* @__PURE__ */ jsx("input", {
        type: "text",
        placeholder: "Buscar por nome, e-mail, cargo ou departamento...",
        value: busca,
        onChange: (e) => setBusca(e.target.value),
        style: {
          width: "100%",
          maxWidth: 460,
          padding: "11px 14px 11px 40px",
          border: "1px solid #e2e8f0",
          borderRadius: 10,
          fontSize: 14,
          outline: "none",
          boxSizing: "border-box",
          transition: "border-color 0.2s, box-shadow 0.2s",
          background: "#fff"
        },
        onFocus: (e) => {
          e.target.style.borderColor = "#3b82f6";
          e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.1)";
        },
        onBlur: (e) => {
          e.target.style.borderColor = "#e2e8f0";
          e.target.style.boxShadow = "none";
        }
      })]
    }), mostraForm && /* @__PURE__ */ jsx("div", {
      style: {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        zIndex: 1e3,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(4px)"
      },
      onClick: (e) => {
        if (e.target === e.currentTarget) {
          setMostraForm(false);
          setEditando(null);
        }
      },
      children: /* @__PURE__ */ jsxs("form", {
        onSubmit: salvar,
        style: {
          background: "#fff",
          borderRadius: 16,
          padding: 28,
          width: "100%",
          maxWidth: 640,
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          maxHeight: "90vh",
          overflowY: "auto",
          animation: "slideUp 0.2s ease-out"
        },
        onClick: (e) => e.stopPropagation(),
        children: [/* @__PURE__ */ jsxs("div", {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20
          },
          children: [/* @__PURE__ */ jsx("h3", {
            style: {
              fontSize: 18,
              fontWeight: 700,
              color: "#0f172a",
              margin: 0
            },
            children: editando ? "Editar Funcionário" : "Novo Funcionário"
          }), /* @__PURE__ */ jsx("button", {
            type: "button",
            onClick: () => {
              setMostraForm(false);
              setEditando(null);
            },
            style: {
              background: "#f1f5f9",
              border: "none",
              width: 32,
              height: 32,
              borderRadius: 8,
              fontSize: 16,
              cursor: "pointer",
              color: "#64748b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            },
            children: "✕"
          })]
        }), /* @__PURE__ */ jsxs("div", {
          style: {
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 14
          },
          children: [[{
            key: "nome",
            label: "Nome completo",
            type: "text",
            required: true
          }, {
            key: "email",
            label: "E-mail",
            type: "email",
            required: true
          }, {
            key: "telefone",
            label: "Telefone",
            type: "text"
          }, {
            key: "cpf",
            label: "CPF",
            type: "text"
          }, {
            key: "teamlogger_email",
            label: "E-mail TeamLogger",
            type: "email"
          }, {
            key: "departamento",
            label: "Departamento",
            type: "text"
          }, {
            key: "data_admissao",
            label: "Data de Admissão",
            type: "date"
          }, {
            key: "salario_base",
            label: "Salário Base",
            type: "number"
          }, {
            key: "ultimo_exame_periodico",
            label: "Último Exame Periódico",
            type: "date"
          }].map((campo) => /* @__PURE__ */ jsxs("div", {
            children: [/* @__PURE__ */ jsx("label", {
              style: {
                fontSize: 13,
                fontWeight: 600,
                color: "#374151",
                letterSpacing: "0.01em"
              },
              children: campo.label
            }), /* @__PURE__ */ jsx("input", {
              type: campo.type,
              value: form[campo.key],
              onChange: (e) => setForm({
                ...form,
                [campo.key]: e.target.value
              }),
              required: campo.required,
              style: inputStyle2,
              onFocus: (e) => {
                e.target.style.borderColor = "#3b82f6";
                e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.1)";
              },
              onBlur: (e) => {
                e.target.style.borderColor = "#e2e8f0";
                e.target.style.boxShadow = "none";
              }
            })]
          }, campo.key)), /* @__PURE__ */ jsxs("div", {
            children: [/* @__PURE__ */ jsx("label", {
              style: {
                fontSize: 13,
                fontWeight: 600,
                color: "#374151"
              },
              children: "Cargo / Permissão"
            }), /* @__PURE__ */ jsxs("select", {
              value: form.cargo,
              onChange: (e) => setForm({
                ...form,
                cargo: e.target.value
              }),
              style: {
                ...inputStyle2,
                background: "#fff"
              },
              children: [/* @__PURE__ */ jsx("option", {
                value: "colaborador",
                children: "Colaborador"
              }), /* @__PURE__ */ jsx("option", {
                value: "gestor",
                children: "Gestor"
              }), /* @__PURE__ */ jsx("option", {
                value: "rh",
                children: "RH"
              }), /* @__PURE__ */ jsx("option", {
                value: "admin",
                children: "Admin"
              })]
            })]
          }), /* @__PURE__ */ jsxs("div", {
            children: [/* @__PURE__ */ jsx("label", {
              style: {
                fontSize: 13,
                fontWeight: 600,
                color: "#374151"
              },
              children: "Tipo de Contrato"
            }), /* @__PURE__ */ jsxs("select", {
              value: form.tipo_contrato,
              onChange: (e) => setForm({
                ...form,
                tipo_contrato: e.target.value
              }),
              style: {
                ...inputStyle2,
                background: "#fff"
              },
              children: [/* @__PURE__ */ jsx("option", {
                value: "clt",
                children: "CLT"
              }), /* @__PURE__ */ jsx("option", {
                value: "pj",
                children: "PJ"
              }), /* @__PURE__ */ jsx("option", {
                value: "estagio",
                children: "Estágio"
              }), /* @__PURE__ */ jsx("option", {
                value: "temporario",
                children: "Temporário"
              })]
            })]
          })]
        }), /* @__PURE__ */ jsxs("div", {
          style: {
            marginTop: 14
          },
          children: [/* @__PURE__ */ jsx("label", {
            style: {
              fontSize: 13,
              fontWeight: 600,
              color: "#374151"
            },
            children: "Observações"
          }), /* @__PURE__ */ jsx("textarea", {
            value: form.observacoes,
            onChange: (e) => setForm({
              ...form,
              observacoes: e.target.value
            }),
            rows: 2,
            style: {
              ...inputStyle2,
              resize: "vertical"
            },
            onFocus: (e) => {
              e.target.style.borderColor = "#3b82f6";
              e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.1)";
            },
            onBlur: (e) => {
              e.target.style.borderColor = "#e2e8f0";
              e.target.style.boxShadow = "none";
            }
          })]
        }), /* @__PURE__ */ jsxs("div", {
          style: {
            display: "flex",
            gap: 10,
            marginTop: 20,
            justifyContent: "flex-end"
          },
          children: [/* @__PURE__ */ jsx("button", {
            type: "button",
            onClick: () => {
              setMostraForm(false);
              setEditando(null);
            },
            style: {
              background: "#f1f5f9",
              color: "#475569",
              border: "none",
              padding: "10px 20px",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer"
            },
            children: "Cancelar"
          }), /* @__PURE__ */ jsx("button", {
            type: "submit",
            disabled: salvando,
            style: {
              background: salvando ? "#93c5fd" : "linear-gradient(135deg, #1e40af, #3b82f6)",
              color: "#fff",
              border: "none",
              padding: "10px 24px",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: salvando ? "not-allowed" : "pointer",
              boxShadow: "0 2px 8px rgba(30,64,175,0.3)"
            },
            children: salvando ? "Salvando..." : editando ? "Atualizar" : "Cadastrar"
          })]
        })]
      })
    }), /* @__PURE__ */ jsx("div", {
      style: {
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        overflow: "hidden",
        border: "1px solid #e2e8f0"
      },
      children: carregando ? /* @__PURE__ */ jsxs("div", {
        style: {
          padding: 40,
          textAlign: "center"
        },
        children: [/* @__PURE__ */ jsx("div", {
          style: {
            width: 32,
            height: 32,
            border: "3px solid #e2e8f0",
            borderTopColor: "#3b82f6",
            borderRadius: "50%",
            margin: "0 auto 12px",
            animation: "spin 0.8s linear infinite"
          }
        }), /* @__PURE__ */ jsx("p", {
          style: {
            color: "#94a3b8",
            fontSize: 14
          },
          children: "Carregando funcionários..."
        })]
      }) : filtrados.length === 0 ? /* @__PURE__ */ jsx("div", {
        style: {
          padding: 40,
          textAlign: "center"
        },
        children: /* @__PURE__ */ jsx("p", {
          style: {
            color: "#94a3b8",
            fontSize: 14
          },
          children: "Nenhum funcionário encontrado."
        })
      }) : /* @__PURE__ */ jsxs("table", {
        style: {
          width: "100%",
          borderCollapse: "collapse"
        },
        children: [/* @__PURE__ */ jsx("thead", {
          children: /* @__PURE__ */ jsx("tr", {
            style: {
              background: "#f8fafc",
              borderBottom: "2px solid #e2e8f0"
            },
            children: ["Funcionário", "Cargo", "Departamento", "Contrato", "Admissão", "Último Exame", "Ações"].map((h) => /* @__PURE__ */ jsx("th", {
              style: {
                textAlign: "left",
                padding: "14px 16px",
                fontSize: 11,
                fontWeight: 700,
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.05em"
              },
              children: h
            }, h))
          })
        }), /* @__PURE__ */ jsx("tbody", {
          children: filtrados.map((f) => {
            const cc = cargoCor[f.cargo] || cargoCor.colaborador;
            const ct = contratoCor[f.tipo_contrato] || contratoCor.clt;
            const exame = exameStatus(f.ultimo_exame_periodico);
            const isHovered = hoveredRow === f.id;
            return /* @__PURE__ */ jsxs("tr", {
              style: {
                borderBottom: "1px solid #f1f5f9",
                background: isHovered ? "#f8fafc" : "transparent",
                transition: "background 0.15s",
                cursor: "default"
              },
              onMouseEnter: () => setHoveredRow(f.id),
              onMouseLeave: () => setHoveredRow(null),
              children: [/* @__PURE__ */ jsx("td", {
                style: {
                  padding: "14px 16px"
                },
                children: /* @__PURE__ */ jsxs("div", {
                  style: {
                    display: "flex",
                    alignItems: "center",
                    gap: 12
                  },
                  children: [/* @__PURE__ */ jsx("div", {
                    style: {
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      background: f.avatar_url ? "transparent" : getAvatarColor(f.nome),
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 14,
                      fontWeight: 700,
                      flexShrink: 0,
                      overflow: "hidden"
                    },
                    children: f.avatar_url ? /* @__PURE__ */ jsx("img", {
                      src: f.avatar_url,
                      alt: "",
                      style: {
                        width: "100%",
                        height: "100%",
                        objectFit: "cover"
                      }
                    }) : getIniciais(f.nome)
                  }), /* @__PURE__ */ jsxs("div", {
                    children: [/* @__PURE__ */ jsx("div", {
                      style: {
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#0f172a",
                        lineHeight: 1.3
                      },
                      children: f.nome
                    }), /* @__PURE__ */ jsx("div", {
                      style: {
                        fontSize: 12,
                        color: "#94a3b8",
                        marginTop: 2
                      },
                      children: f.email
                    })]
                  })]
                })
              }), /* @__PURE__ */ jsx("td", {
                style: {
                  padding: "14px 16px"
                },
                children: /* @__PURE__ */ jsx("span", {
                  style: {
                    background: cc.bg,
                    color: cc.text,
                    border: `1px solid ${cc.border}`,
                    padding: "4px 12px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 600,
                    whiteSpace: "nowrap"
                  },
                  children: cc.label
                })
              }), /* @__PURE__ */ jsx("td", {
                style: {
                  padding: "14px 16px",
                  fontSize: 14,
                  color: f.departamento ? "#334155" : "#cbd5e1"
                },
                children: f.departamento || "—"
              }), /* @__PURE__ */ jsx("td", {
                style: {
                  padding: "14px 16px"
                },
                children: /* @__PURE__ */ jsx("span", {
                  style: {
                    background: ct.bg,
                    color: ct.text,
                    padding: "4px 10px",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    whiteSpace: "nowrap"
                  },
                  children: ct.label
                })
              }), /* @__PURE__ */ jsx("td", {
                style: {
                  padding: "14px 16px",
                  fontSize: 13,
                  color: "#475569"
                },
                children: formatDate2(f.data_admissao) || /* @__PURE__ */ jsx("span", {
                  style: {
                    color: "#cbd5e1"
                  },
                  children: "—"
                })
              }), /* @__PURE__ */ jsx("td", {
                style: {
                  padding: "14px 16px"
                },
                children: /* @__PURE__ */ jsx("span", {
                  style: {
                    fontSize: 12,
                    fontWeight: 500,
                    color: exame.color,
                    background: exame.bg,
                    padding: "3px 8px",
                    borderRadius: 6,
                    whiteSpace: "nowrap"
                  },
                  children: exame.label
                })
              }), /* @__PURE__ */ jsx("td", {
                style: {
                  padding: "14px 16px"
                },
                children: /* @__PURE__ */ jsxs("div", {
                  style: {
                    display: "flex",
                    gap: 6,
                    opacity: isHovered ? 1 : 0.6,
                    transition: "opacity 0.15s"
                  },
                  children: [/* @__PURE__ */ jsx("button", {
                    onClick: () => abrirEditar(f),
                    style: {
                      background: "#f1f5f9",
                      border: "1px solid #e2e8f0",
                      padding: "6px 14px",
                      borderRadius: 6,
                      fontSize: 12,
                      cursor: "pointer",
                      fontWeight: 600,
                      color: "#475569",
                      transition: "all 0.15s"
                    },
                    onMouseEnter: (e) => {
                      e.currentTarget.style.background = "#e2e8f0";
                    },
                    onMouseLeave: (e) => {
                      e.currentTarget.style.background = "#f1f5f9";
                    },
                    children: "Editar"
                  }), /* @__PURE__ */ jsx("button", {
                    onClick: () => abrirSenha(f),
                    style: {
                      background: "#eff6ff",
                      border: "1px solid #bfdbfe",
                      padding: "6px 14px",
                      borderRadius: 6,
                      fontSize: 12,
                      cursor: "pointer",
                      fontWeight: 600,
                      color: "#1e40af",
                      transition: "all 0.15s"
                    },
                    onMouseEnter: (e) => {
                      e.currentTarget.style.background = "#dbeafe";
                    },
                    onMouseLeave: (e) => {
                      e.currentTarget.style.background = "#eff6ff";
                    },
                    children: "Senha"
                  }), /* @__PURE__ */ jsx("button", {
                    onClick: () => excluir(f),
                    style: {
                      background: "#fef2f2",
                      border: "1px solid #fecaca",
                      padding: "6px 14px",
                      borderRadius: 6,
                      fontSize: 12,
                      cursor: "pointer",
                      fontWeight: 600,
                      color: "#dc2626",
                      transition: "all 0.15s"
                    },
                    onMouseEnter: (e) => {
                      e.currentTarget.style.background = "#fee2e2";
                    },
                    onMouseLeave: (e) => {
                      e.currentTarget.style.background = "#fef2f2";
                    },
                    children: "Excluir"
                  })]
                })
              })]
            }, f.id);
          })
        })]
      })
    }), /* @__PURE__ */ jsxs("p", {
      style: {
        fontSize: 12,
        color: "#94a3b8",
        marginTop: 12,
        textAlign: "right"
      },
      children: [filtrados.length, " de ", funcionarios.length, " funcionário", funcionarios.length !== 1 ? "s" : ""]
    }), senhaModal && /* @__PURE__ */ jsx("div", {
      onClick: () => setSenhaModal(null),
      style: {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1e3
      },
      children: /* @__PURE__ */ jsxs("div", {
        onClick: (e) => e.stopPropagation(),
        style: {
          background: "#fff",
          borderRadius: 14,
          padding: 28,
          width: 400,
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
          animation: "slideUp 0.2s ease-out"
        },
        children: [/* @__PURE__ */ jsxs("h2", {
          style: {
            fontSize: 18,
            fontWeight: 700,
            margin: "0 0 6px",
            color: "#1e293b"
          },
          children: ["Senha — ", senhaModal.nome]
        }), /* @__PURE__ */ jsx("p", {
          style: {
            fontSize: 12,
            color: "#64748b",
            margin: "0 0 20px"
          },
          children: "Visualize ou altere a senha deste funcionário."
        }), /* @__PURE__ */ jsxs("div", {
          style: {
            marginBottom: 16
          },
          children: [/* @__PURE__ */ jsx("label", {
            style: {
              fontSize: 12,
              fontWeight: 600,
              color: "#374151",
              display: "block",
              marginBottom: 4
            },
            children: "Senha atual"
          }), /* @__PURE__ */ jsxs("div", {
            style: {
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 6,
              padding: "10px 14px"
            },
            children: [/* @__PURE__ */ jsx("code", {
              style: {
                flex: 1,
                fontSize: 15,
                fontWeight: 600,
                color: "#0f172a",
                fontFamily: "monospace",
                letterSpacing: 1
              },
              children: senhaModal.senha_atual || "(sem senha)"
            }), /* @__PURE__ */ jsx("button", {
              onClick: () => {
                navigator.clipboard.writeText(senhaModal.senha_atual);
                toast.success("Senha copiada!");
              },
              title: "Copiar",
              style: {
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#64748b",
                display: "flex",
                alignItems: "center",
                padding: 4
              },
              children: /* @__PURE__ */ jsx("span", {
                className: "material-symbols-outlined",
                style: {
                  fontSize: 18
                },
                children: "content_copy"
              })
            })]
          })]
        }), /* @__PURE__ */ jsxs("div", {
          style: {
            marginBottom: 20
          },
          children: [/* @__PURE__ */ jsx("label", {
            style: {
              fontSize: 12,
              fontWeight: 600,
              color: "#374151",
              display: "block",
              marginBottom: 4
            },
            children: "Nova senha"
          }), /* @__PURE__ */ jsx("input", {
            type: "text",
            value: senhaModal.nova_senha,
            onChange: (e) => setSenhaModal({
              ...senhaModal,
              nova_senha: e.target.value
            }),
            placeholder: "Digite a nova senha...",
            style: {
              width: "100%",
              padding: "10px 14px",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              fontSize: 14,
              outline: "none",
              boxSizing: "border-box"
            },
            onKeyDown: (e) => e.key === "Enter" && salvarNovaSenha()
          })]
        }), /* @__PURE__ */ jsxs("div", {
          style: {
            display: "flex",
            gap: 10
          },
          children: [/* @__PURE__ */ jsx("button", {
            onClick: () => setSenhaModal(null),
            style: {
              flex: 1,
              padding: 10,
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              background: "#fff",
              color: "#64748b",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer"
            },
            children: "Fechar"
          }), /* @__PURE__ */ jsx("button", {
            onClick: salvarNovaSenha,
            disabled: !senhaModal.nova_senha.trim(),
            style: {
              flex: 1,
              padding: 10,
              borderRadius: 8,
              border: "none",
              background: senhaModal.nova_senha.trim() ? "#1e40af" : "#e2e8f0",
              color: senhaModal.nova_senha.trim() ? "#fff" : "#94a3b8",
              fontSize: 14,
              fontWeight: 600,
              cursor: senhaModal.nova_senha.trim() ? "pointer" : "default"
            },
            children: "Alterar Senha"
          })]
        })]
      })
    }), /* @__PURE__ */ jsx("style", {
      children: `
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `
    })]
  });
});
const route10 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: standalone_funcionarios
}, Symbol.toStringTag, { value: "Module" }));
const standalone_aprovacoes = UNSAFE_withComponentProps(function Aprovacoes() {
  useAuth();
  const toast = useToast();
  const {
    confirm,
    prompt
  } = useConfirm();
  const [pendentes, setPendentes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const carregar = useCallback(async () => {
    setCarregando(true);
    const {
      data
    } = await supabase.from("operadores").select("id, nome, email, created_at, status").eq("status", "pendente").order("created_at", {
      ascending: true
    });
    setPendentes(data || []);
    setCarregando(false);
  }, []);
  useEffect(() => {
    carregar();
  }, [carregar]);
  async function aprovar(id) {
    const {
      error
    } = await supabase.from("operadores").update({
      status: "aprovado"
    }).eq("id", id);
    if (error) toast.error("Erro ao aprovar: " + error.message);
    else {
      toast.success("Cadastro aprovado!");
      carregar();
    }
  }
  async function recusar(id) {
    const motivo = await prompt("Motivo da recusa (opcional):", {
      title: "Recusar cadastro",
      placeholder: "Ex: dados incompletos...",
      confirmText: "Recusar",
      danger: true
    });
    if (motivo === null) return;
    const {
      error
    } = await supabase.from("operadores").update({
      status: "recusado"
    }).eq("id", id);
    if (error) toast.error("Erro ao recusar: " + error.message);
    else {
      toast.success("Cadastro recusado.");
      carregar();
    }
  }
  function formatData(dateStr) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }
  return /* @__PURE__ */ jsxs("div", {
    children: [/* @__PURE__ */ jsx("h1", {
      style: {
        fontSize: 22,
        fontWeight: 700,
        marginBottom: 20
      },
      children: "Aprovação de Cadastros"
    }), carregando ? /* @__PURE__ */ jsx("p", {
      style: {
        color: "#94a3b8"
      },
      children: "Carregando..."
    }) : pendentes.length === 0 ? /* @__PURE__ */ jsx("div", {
      style: {
        background: "#f0fdf4",
        borderRadius: 8,
        padding: 20,
        textAlign: "center",
        color: "#166534",
        fontSize: 14
      },
      children: "Nenhum cadastro pendente de aprovação."
    }) : /* @__PURE__ */ jsxs("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 12
      },
      children: [/* @__PURE__ */ jsxs("p", {
        style: {
          fontSize: 14,
          color: "#64748b",
          margin: 0
        },
        children: [pendentes.length, " cadastro", pendentes.length > 1 ? "s" : "", " aguardando aprovação"]
      }), pendentes.map((p) => /* @__PURE__ */ jsxs("div", {
        style: {
          background: "#fff",
          borderRadius: 10,
          padding: 20,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap"
        },
        children: [/* @__PURE__ */ jsxs("div", {
          children: [/* @__PURE__ */ jsx("p", {
            style: {
              fontSize: 16,
              fontWeight: 600,
              color: "#1e293b",
              margin: 0
            },
            children: p.nome
          }), /* @__PURE__ */ jsx("p", {
            style: {
              fontSize: 13,
              color: "#64748b",
              margin: "4px 0 0"
            },
            children: p.email
          }), /* @__PURE__ */ jsxs("p", {
            style: {
              fontSize: 11,
              color: "#94a3b8",
              margin: "2px 0 0"
            },
            children: ["Cadastro em ", formatData(p.created_at)]
          })]
        }), /* @__PURE__ */ jsxs("div", {
          style: {
            display: "flex",
            gap: 8
          },
          children: [/* @__PURE__ */ jsx("button", {
            onClick: () => aprovar(p.id),
            style: {
              padding: "8px 20px",
              borderRadius: 6,
              border: "none",
              background: "#16a34a",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer"
            },
            children: "Aprovar"
          }), /* @__PURE__ */ jsx("button", {
            onClick: () => recusar(p.id),
            style: {
              padding: "8px 20px",
              borderRadius: 6,
              border: "1px solid #fecaca",
              background: "#fff",
              color: "#dc2626",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer"
            },
            children: "Recusar"
          })]
        })]
      }, p.id))]
    })]
  });
});
const route11 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: standalone_aprovacoes
}, Symbol.toStringTag, { value: "Module" }));
const PRIORIDADE_COR = {
  normal: {
    bg: "#eff6ff",
    border: "#bfdbfe",
    text: "#1e40af",
    label: "Normal"
  },
  importante: {
    bg: "#fffbeb",
    border: "#fde68a",
    text: "#92400e",
    label: "Importante"
  },
  urgente: {
    bg: "#fef2f2",
    border: "#fecaca",
    text: "#dc2626",
    label: "Urgente"
  }
};
const standalone_mural = UNSAFE_withComponentProps(function Mural() {
  const {
    operator
  } = useAuth();
  const toast = useToast();
  const {
    confirm
  } = useConfirm();
  const [comunicados, setComunicados] = useState([]);
  const [lidos, setLidos] = useState(/* @__PURE__ */ new Set());
  const [carregando, setCarregando] = useState(true);
  const [mostraForm, setMostraForm] = useState(false);
  const [form, setForm] = useState({
    titulo: "",
    conteudo: "",
    prioridade: "normal"
  });
  const [salvando, setSalvando] = useState(false);
  const isAdmin2 = (operator == null ? void 0 : operator.cargo) === "admin" || (operator == null ? void 0 : operator.cargo) === "rh" || (operator == null ? void 0 : operator.cargo) === "gestor";
  const carregar = useCallback(async () => {
    setCarregando(true);
    const {
      data
    } = await supabase.from("comunicados").select("*").eq("ativo", true).order("created_at", {
      ascending: false
    });
    const autorIds = [...new Set((data || []).map((c) => c.created_by).filter(Boolean))];
    let avatarMap = {};
    if (autorIds.length > 0) {
      const {
        data: autores
      } = await supabase.from("operadores").select("id, avatar_url").in("id", autorIds);
      (autores || []).forEach((a) => {
        avatarMap[a.id] = a.avatar_url;
      });
    }
    setComunicados((data || []).map((c) => ({
      ...c,
      autor_avatar: avatarMap[c.created_by] || null
    })));
    if (operator) {
      const {
        data: lidosData
      } = await supabase.from("comunicados_lidos").select("comunicado_id").eq("operator_id", operator.id);
      setLidos(new Set((lidosData || []).map((l) => l.comunicado_id)));
    }
    setCarregando(false);
  }, [operator]);
  useEffect(() => {
    carregar();
  }, [carregar]);
  async function marcarLido(comunicadoId) {
    if (lidos.has(comunicadoId)) return;
    await supabase.from("comunicados_lidos").insert({
      comunicado_id: comunicadoId,
      operator_id: operator.id
    });
    setLidos((prev) => /* @__PURE__ */ new Set([...prev, comunicadoId]));
  }
  async function publicar(e) {
    e.preventDefault();
    if (!form.titulo.trim() || !form.conteudo.trim()) return;
    setSalvando(true);
    await supabase.from("comunicados").insert({
      titulo: form.titulo.trim(),
      conteudo: form.conteudo.trim(),
      prioridade: form.prioridade,
      created_by: operator.id,
      created_by_nome: operator.nome
    });
    setForm({
      titulo: "",
      conteudo: "",
      prioridade: "normal"
    });
    setMostraForm(false);
    setSalvando(false);
    carregar();
  }
  async function arquivar(id) {
    const ok = await confirm("Arquivar este comunicado? Ele não aparecerá mais no mural.", {
      title: "Arquivar comunicado",
      confirmText: "Arquivar",
      danger: false
    });
    if (!ok) return;
    await supabase.from("comunicados").update({
      ativo: false
    }).eq("id", id);
    toast.success("Comunicado arquivado.");
    carregar();
  }
  function tempoAtras(dateStr) {
    const agora = /* @__PURE__ */ new Date();
    const data = new Date(dateStr);
    const diff = Math.floor((agora - data) / 1e3);
    if (diff < 60) return "agora";
    if (diff < 3600) return `${Math.floor(diff / 60)} min atrás`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
    const dias = Math.floor(diff / 86400);
    if (dias === 1) return "ontem";
    if (dias < 7) return `${dias} dias atrás`;
    return data.toLocaleDateString("pt-BR");
  }
  const naoLidos = comunicados.filter((c) => !lidos.has(c.id)).length;
  const inputStyle2 = {
    display: "block",
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box"
  };
  return /* @__PURE__ */ jsxs("div", {
    style: {
      maxWidth: 700
    },
    children: [/* @__PURE__ */ jsxs("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20
      },
      children: [/* @__PURE__ */ jsxs("div", {
        children: [/* @__PURE__ */ jsx("h1", {
          style: {
            fontSize: 22,
            fontWeight: 700,
            marginBottom: 2
          },
          children: "Mural de Comunicados"
        }), naoLidos > 0 && /* @__PURE__ */ jsxs("p", {
          style: {
            fontSize: 13,
            color: "#dc2626",
            fontWeight: 600,
            margin: 0
          },
          children: [naoLidos, " comunicado", naoLidos > 1 ? "s" : "", " não lido", naoLidos > 1 ? "s" : ""]
        })]
      }), isAdmin2 && /* @__PURE__ */ jsx("button", {
        onClick: () => setMostraForm(!mostraForm),
        style: {
          background: "#1e40af",
          color: "#fff",
          border: "none",
          padding: "8px 16px",
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer"
        },
        children: mostraForm ? "Cancelar" : "+ Novo comunicado"
      })]
    }), mostraForm && /* @__PURE__ */ jsxs("form", {
      onSubmit: publicar,
      style: {
        background: "#fff",
        borderRadius: 10,
        padding: 24,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        marginBottom: 20
      },
      children: [/* @__PURE__ */ jsx("h3", {
        style: {
          fontSize: 15,
          fontWeight: 600,
          marginBottom: 14
        },
        children: "Novo Comunicado"
      }), /* @__PURE__ */ jsxs("div", {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 12
        },
        children: [/* @__PURE__ */ jsxs("div", {
          style: {
            display: "flex",
            gap: 12
          },
          children: [/* @__PURE__ */ jsxs("div", {
            style: {
              flex: 1
            },
            children: [/* @__PURE__ */ jsx("label", {
              style: {
                fontSize: 13,
                fontWeight: 500,
                color: "#374151",
                display: "block",
                marginBottom: 4
              },
              children: "Título"
            }), /* @__PURE__ */ jsx("input", {
              type: "text",
              value: form.titulo,
              onChange: (e) => setForm({
                ...form,
                titulo: e.target.value
              }),
              required: true,
              placeholder: "Título do comunicado",
              style: inputStyle2
            })]
          }), /* @__PURE__ */ jsxs("div", {
            style: {
              width: 160
            },
            children: [/* @__PURE__ */ jsx("label", {
              style: {
                fontSize: 13,
                fontWeight: 500,
                color: "#374151",
                display: "block",
                marginBottom: 4
              },
              children: "Prioridade"
            }), /* @__PURE__ */ jsxs("select", {
              value: form.prioridade,
              onChange: (e) => setForm({
                ...form,
                prioridade: e.target.value
              }),
              style: {
                ...inputStyle2,
                background: "#fff"
              },
              children: [/* @__PURE__ */ jsx("option", {
                value: "normal",
                children: "Normal"
              }), /* @__PURE__ */ jsx("option", {
                value: "importante",
                children: "Importante"
              }), /* @__PURE__ */ jsx("option", {
                value: "urgente",
                children: "Urgente"
              })]
            })]
          })]
        }), /* @__PURE__ */ jsxs("div", {
          children: [/* @__PURE__ */ jsx("label", {
            style: {
              fontSize: 13,
              fontWeight: 500,
              color: "#374151",
              display: "block",
              marginBottom: 4
            },
            children: "Conteúdo"
          }), /* @__PURE__ */ jsx("textarea", {
            value: form.conteudo,
            onChange: (e) => setForm({
              ...form,
              conteudo: e.target.value
            }),
            required: true,
            rows: 4,
            placeholder: "Escreva o comunicado...",
            style: {
              ...inputStyle2,
              resize: "vertical"
            }
          })]
        })]
      }), /* @__PURE__ */ jsx("button", {
        type: "submit",
        disabled: salvando,
        style: {
          marginTop: 14,
          background: salvando ? "#93c5fd" : "#1e40af",
          color: "#fff",
          border: "none",
          padding: "10px 24px",
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600,
          cursor: salvando ? "not-allowed" : "pointer"
        },
        children: salvando ? "Publicando..." : "Publicar comunicado"
      })]
    }), carregando ? /* @__PURE__ */ jsx("p", {
      style: {
        color: "#94a3b8"
      },
      children: "Carregando..."
    }) : comunicados.length === 0 ? /* @__PURE__ */ jsx("div", {
      style: {
        background: "#f8fafc",
        borderRadius: 10,
        padding: 30,
        textAlign: "center",
        color: "#94a3b8"
      },
      children: "Nenhum comunicado publicado."
    }) : /* @__PURE__ */ jsx("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 12
      },
      children: comunicados.map((c) => {
        const cor = PRIORIDADE_COR[c.prioridade] || PRIORIDADE_COR.normal;
        const jaLeu = lidos.has(c.id);
        return /* @__PURE__ */ jsxs("div", {
          onClick: () => marcarLido(c.id),
          style: {
            background: "#fff",
            borderRadius: 10,
            padding: 20,
            boxShadow: jaLeu ? "0 1px 2px rgba(0,0,0,0.04)" : "0 2px 8px rgba(0,0,0,0.1)",
            borderLeft: `4px solid ${cor.text}`,
            opacity: jaLeu ? 0.85 : 1,
            cursor: jaLeu ? "default" : "pointer",
            position: "relative",
            transition: "all 0.15s"
          },
          children: [!jaLeu && /* @__PURE__ */ jsx("span", {
            style: {
              position: "absolute",
              top: 12,
              right: 12,
              background: "#ef4444",
              color: "#fff",
              fontSize: 9,
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: 10
            },
            children: "NOVO"
          }), /* @__PURE__ */ jsxs("div", {
            style: {
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 8
            },
            children: [/* @__PURE__ */ jsx("span", {
              style: {
                background: cor.bg,
                color: cor.text,
                border: `1px solid ${cor.border}`,
                padding: "2px 10px",
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 600
              },
              children: cor.label
            }), /* @__PURE__ */ jsx("span", {
              style: {
                fontSize: 12,
                color: "#94a3b8"
              },
              children: tempoAtras(c.created_at)
            })]
          }), /* @__PURE__ */ jsx("h3", {
            style: {
              fontSize: 16,
              fontWeight: 700,
              color: "#1e293b",
              marginBottom: 6
            },
            children: c.titulo
          }), /* @__PURE__ */ jsx("p", {
            style: {
              fontSize: 14,
              color: "#475569",
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
              margin: 0
            },
            children: c.conteudo
          }), /* @__PURE__ */ jsxs("div", {
            style: {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 12
            },
            children: [/* @__PURE__ */ jsxs("span", {
              style: {
                fontSize: 12,
                color: "#94a3b8",
                display: "flex",
                alignItems: "center",
                gap: 6
              },
              children: [/* @__PURE__ */ jsx("span", {
                style: {
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  overflow: "hidden",
                  background: "#e2e8f0",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                },
                children: c.autor_avatar ? /* @__PURE__ */ jsx("img", {
                  src: c.autor_avatar,
                  alt: "",
                  style: {
                    width: "100%",
                    height: "100%",
                    objectFit: "cover"
                  }
                }) : /* @__PURE__ */ jsx("span", {
                  style: {
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#94a3b8"
                  },
                  children: (c.created_by_nome || "?").charAt(0).toUpperCase()
                })
              }), "Publicado por ", c.created_by_nome || "—"]
            }), isAdmin2 && /* @__PURE__ */ jsx("button", {
              onClick: (e) => {
                e.stopPropagation();
                arquivar(c.id);
              },
              style: {
                background: "none",
                border: "1px solid #e2e8f0",
                padding: "3px 10px",
                borderRadius: 4,
                fontSize: 11,
                cursor: "pointer",
                color: "#94a3b8"
              },
              children: "Arquivar"
            })]
          })]
        }, c.id);
      })
    })]
  });
});
const route12 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: standalone_mural
}, Symbol.toStringTag, { value: "Module" }));
const TIPOS = [{
  value: "admissao",
  label: "Admissão",
  color: "#16a34a"
}, {
  value: "promocao",
  label: "Promoção",
  color: "#1e40af"
}, {
  value: "advertencia",
  label: "Advertência",
  color: "#dc2626"
}, {
  value: "ferias",
  label: "Férias",
  color: "#0891b2"
}, {
  value: "afastamento",
  label: "Afastamento",
  color: "#ea580c"
}, {
  value: "documento",
  label: "Documento",
  color: "#64748b"
}, {
  value: "salario",
  label: "Reajuste Salarial",
  color: "#7c3aed"
}, {
  value: "desligamento",
  label: "Desligamento",
  color: "#991b1b"
}, {
  value: "observacao",
  label: "Observação",
  color: "#94a3b8"
}];
function corDoTipo(tipo) {
  var _a;
  return ((_a = TIPOS.find((t) => t.value === tipo)) == null ? void 0 : _a.color) || "#94a3b8";
}
function labelDoTipo(tipo) {
  var _a;
  return ((_a = TIPOS.find((t) => t.value === tipo)) == null ? void 0 : _a.label) || tipo;
}
function formatarData(dateStr) {
  if (!dateStr) return "";
  const d = /* @__PURE__ */ new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("pt-BR");
}
function hoje() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}
const standalone_timeline = UNSAFE_withComponentProps(function Timeline() {
  const {
    operator,
    loading: authLoading
  } = useAuth();
  const [funcionarios, setFuncionarios] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [eventos, setEventos] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [formAberto, setFormAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({
    tipo: "observacao",
    titulo: "",
    descricao: "",
    data: hoje()
  });
  const [calAno, setCalAno] = useState((/* @__PURE__ */ new Date()).getFullYear());
  const [calMes, setCalMes] = useState((/* @__PURE__ */ new Date()).getMonth());
  const [diaFiltro, setDiaFiltro] = useState(null);
  const podeAdicionarEvento = (operator == null ? void 0 : operator.cargo) === "admin" || (operator == null ? void 0 : operator.cargo) === "rh" || (operator == null ? void 0 : operator.cargo) === "gestor";
  useEffect(() => {
    carregarFuncionarios();
  }, []);
  const carregarEventos = useCallback(async (funcId) => {
    if (!funcId) {
      setEventos([]);
      return;
    }
    setCarregando(true);
    const {
      data,
      error
    } = await supabase.from("employee_timeline").select("*").eq("operator_id", funcId).order("data", {
      ascending: false
    });
    if (!error && data) {
      setEventos(data);
    }
    setCarregando(false);
  }, []);
  async function carregarFuncionarios() {
    const {
      data,
      error
    } = await supabase.from("operadores").select("id, nome").in("status", ["aprovado", "active"]).order("nome");
    if (!error && data) {
      setFuncionarios(data);
    }
  }
  function handleSelectFuncionario(e) {
    const id = e.target.value;
    setSelectedId(id);
    carregarEventos(id);
    setFormAberto(false);
  }
  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.titulo.trim() || !selectedId) return;
    setSalvando(true);
    const {
      error
    } = await supabase.from("employee_timeline").insert({
      operator_id: selectedId,
      tipo: form.tipo,
      titulo: form.titulo.trim(),
      descricao: form.descricao.trim() || null,
      data: form.data,
      created_by: operator.id
    });
    if (!error) {
      setForm({
        tipo: "observacao",
        titulo: "",
        descricao: "",
        data: hoje()
      });
      setFormAberto(false);
      carregarEventos(selectedId);
    }
    setSalvando(false);
  }
  if (authLoading) return null;
  return /* @__PURE__ */ jsx("div", {
    style: {
      minHeight: "100vh",
      background: "#f8fafc"
    },
    children: /* @__PURE__ */ jsxs("div", {
      style: {
        maxWidth: 800,
        margin: "0 auto",
        padding: "32px 16px"
      },
      children: [/* @__PURE__ */ jsx("h1", {
        style: {
          fontSize: 22,
          fontWeight: 700,
          marginBottom: 24
        },
        children: "Timeline do Funcionário"
      }), /* @__PURE__ */ jsxs("div", {
        style: {
          background: "#fff",
          borderRadius: 8,
          padding: 20,
          marginBottom: 24,
          border: "1px solid #e2e8f0"
        },
        children: [/* @__PURE__ */ jsx("label", {
          style: {
            display: "block",
            fontSize: 13,
            fontWeight: 600,
            color: "#475569",
            marginBottom: 6
          },
          children: "Funcionário"
        }), /* @__PURE__ */ jsxs("select", {
          value: selectedId,
          onChange: handleSelectFuncionario,
          style: {
            width: "100%",
            maxWidth: 400,
            padding: "10px 14px",
            border: "1px solid #d1d5db",
            borderRadius: 6,
            fontSize: 14,
            outline: "none",
            background: "#fff"
          },
          children: [/* @__PURE__ */ jsx("option", {
            value: "",
            children: "Selecione um funcionário..."
          }), funcionarios.map((f) => /* @__PURE__ */ jsx("option", {
            value: f.id,
            children: f.nome
          }, f.id))]
        })]
      }), podeAdicionarEvento && selectedId && /* @__PURE__ */ jsxs("div", {
        style: {
          marginBottom: 24
        },
        children: [/* @__PURE__ */ jsx("button", {
          onClick: () => setFormAberto(!formAberto),
          style: {
            background: formAberto ? "#64748b" : "#1e40af",
            color: "#fff",
            border: "none",
            padding: "8px 16px",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer"
          },
          children: formAberto ? "Cancelar" : "Adicionar evento"
        }), formAberto && /* @__PURE__ */ jsxs("form", {
          onSubmit: handleSubmit,
          style: {
            background: "#fff",
            borderRadius: 8,
            padding: 20,
            marginTop: 12,
            border: "1px solid #e2e8f0",
            display: "flex",
            flexDirection: "column",
            gap: 14
          },
          children: [/* @__PURE__ */ jsxs("div", {
            style: {
              display: "flex",
              gap: 14,
              flexWrap: "wrap"
            },
            children: [/* @__PURE__ */ jsxs("div", {
              style: {
                flex: 1,
                minWidth: 180
              },
              children: [/* @__PURE__ */ jsx("label", {
                style: labelStyle,
                children: "Tipo"
              }), /* @__PURE__ */ jsx("select", {
                value: form.tipo,
                onChange: (e) => setForm({
                  ...form,
                  tipo: e.target.value
                }),
                style: inputStyle,
                children: TIPOS.map((t) => /* @__PURE__ */ jsx("option", {
                  value: t.value,
                  children: t.label
                }, t.value))
              })]
            }), /* @__PURE__ */ jsxs("div", {
              style: {
                flex: 1,
                minWidth: 180
              },
              children: [/* @__PURE__ */ jsx("label", {
                style: labelStyle,
                children: "Data"
              }), /* @__PURE__ */ jsx("input", {
                type: "date",
                value: form.data,
                onChange: (e) => setForm({
                  ...form,
                  data: e.target.value
                }),
                style: inputStyle
              })]
            })]
          }), /* @__PURE__ */ jsxs("div", {
            children: [/* @__PURE__ */ jsx("label", {
              style: labelStyle,
              children: "Título"
            }), /* @__PURE__ */ jsx("input", {
              type: "text",
              value: form.titulo,
              onChange: (e) => setForm({
                ...form,
                titulo: e.target.value
              }),
              placeholder: "Ex: Promoção para Analista Sênior",
              required: true,
              style: inputStyle
            })]
          }), /* @__PURE__ */ jsxs("div", {
            children: [/* @__PURE__ */ jsx("label", {
              style: labelStyle,
              children: "Descrição (opcional)"
            }), /* @__PURE__ */ jsx("textarea", {
              value: form.descricao,
              onChange: (e) => setForm({
                ...form,
                descricao: e.target.value
              }),
              placeholder: "Detalhes adicionais...",
              rows: 3,
              style: {
                ...inputStyle,
                resize: "vertical"
              }
            })]
          }), /* @__PURE__ */ jsx("button", {
            type: "submit",
            disabled: salvando || !form.titulo.trim(),
            style: {
              background: salvando || !form.titulo.trim() ? "#94a3b8" : "#1e40af",
              color: "#fff",
              border: "none",
              padding: "10px 20px",
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 600,
              cursor: salvando || !form.titulo.trim() ? "not-allowed" : "pointer",
              alignSelf: "flex-start"
            },
            children: salvando ? "Salvando..." : "Salvar evento"
          })]
        })]
      }), selectedId && eventos.length > 0 && (() => {
        const DIAS_SEMANA2 = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
        const MESES_NOME = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        const primeiroDia = new Date(calAno, calMes, 1).getDay();
        const diasNoMes = new Date(calAno, calMes + 1, 0).getDate();
        const eventosPorDia = {};
        for (const ev of eventos) {
          if (!ev.data) continue;
          if (!eventosPorDia[ev.data]) eventosPorDia[ev.data] = [];
          eventosPorDia[ev.data].push(ev);
        }
        function navMes(dir) {
          let m = calMes + dir;
          let a = calAno;
          if (m < 0) {
            m = 11;
            a--;
          }
          if (m > 11) {
            m = 0;
            a++;
          }
          setCalMes(m);
          setCalAno(a);
          setDiaFiltro(null);
        }
        return /* @__PURE__ */ jsxs("div", {
          style: {
            background: "#fff",
            borderRadius: 8,
            padding: 20,
            marginBottom: 24,
            border: "1px solid #e2e8f0"
          },
          children: [/* @__PURE__ */ jsxs("div", {
            style: {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14
            },
            children: [/* @__PURE__ */ jsx("button", {
              onClick: () => navMes(-1),
              style: calNavBtn,
              children: "←"
            }), /* @__PURE__ */ jsxs("span", {
              style: {
                fontSize: 15,
                fontWeight: 600
              },
              children: [MESES_NOME[calMes], " ", calAno]
            }), /* @__PURE__ */ jsx("button", {
              onClick: () => navMes(1),
              style: calNavBtn,
              children: "→"
            })]
          }), /* @__PURE__ */ jsx("div", {
            style: {
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 2,
              marginBottom: 4
            },
            children: DIAS_SEMANA2.map((d) => /* @__PURE__ */ jsx("div", {
              style: {
                textAlign: "center",
                fontSize: 11,
                fontWeight: 600,
                color: "#94a3b8",
                padding: 4
              },
              children: d
            }, d))
          }), /* @__PURE__ */ jsxs("div", {
            style: {
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 2
            },
            children: [Array.from({
              length: primeiroDia
            }).map((_, i) => /* @__PURE__ */ jsx("div", {
              style: {
                minHeight: 48
              }
            }, `e-${i}`)), Array.from({
              length: diasNoMes
            }).map((_, i) => {
              const dia = i + 1;
              const diaStr = `${calAno}-${String(calMes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
              const evsDia = eventosPorDia[diaStr] || [];
              const selecionado = diaFiltro === diaStr;
              const temEvento = evsDia.length > 0;
              return /* @__PURE__ */ jsxs("div", {
                onClick: () => {
                  if (temEvento) setDiaFiltro(selecionado ? null : diaStr);
                },
                style: {
                  minHeight: 48,
                  borderRadius: 6,
                  padding: "4px 2px",
                  textAlign: "center",
                  cursor: temEvento ? "pointer" : "default",
                  background: selecionado ? "#0f172a" : temEvento ? "#f8fafc" : "transparent",
                  border: selecionado ? "2px solid #0f172a" : temEvento ? "1px solid #e2e8f0" : "1px solid transparent",
                  transition: "all 0.12s"
                },
                children: [/* @__PURE__ */ jsx("span", {
                  style: {
                    fontSize: 12,
                    fontWeight: temEvento ? 700 : 400,
                    color: selecionado ? "#fff" : temEvento ? "#1e293b" : "#94a3b8"
                  },
                  children: dia
                }), temEvento && /* @__PURE__ */ jsxs("div", {
                  style: {
                    display: "flex",
                    justifyContent: "center",
                    gap: 3,
                    marginTop: 4,
                    flexWrap: "wrap"
                  },
                  children: [evsDia.slice(0, 4).map((ev, j) => /* @__PURE__ */ jsx("span", {
                    style: {
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: selecionado ? "#fff" : corDoTipo(ev.tipo),
                      display: "inline-block"
                    }
                  }, j)), evsDia.length > 4 && /* @__PURE__ */ jsxs("span", {
                    style: {
                      fontSize: 8,
                      color: selecionado ? "#fff" : "#94a3b8",
                      fontWeight: 700
                    },
                    children: ["+", evsDia.length - 4]
                  })]
                })]
              }, dia);
            })]
          }), /* @__PURE__ */ jsx("div", {
            style: {
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              marginTop: 14,
              paddingTop: 12,
              borderTop: "1px solid #f1f5f9"
            },
            children: TIPOS.filter((t) => eventos.some((ev) => ev.tipo === t.value)).map((t) => /* @__PURE__ */ jsxs("span", {
              style: {
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 11,
                color: "#64748b"
              },
              children: [/* @__PURE__ */ jsx("span", {
                style: {
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: t.color,
                  display: "inline-block"
                }
              }), t.label]
            }, t.value))
          }), diaFiltro && /* @__PURE__ */ jsxs("div", {
            style: {
              marginTop: 12,
              padding: "8px 14px",
              background: "#0f172a",
              borderRadius: 6,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            },
            children: [/* @__PURE__ */ jsxs("span", {
              style: {
                fontSize: 13,
                color: "#fff",
                fontWeight: 500
              },
              children: ["Mostrando eventos de ", formatarData(diaFiltro)]
            }), /* @__PURE__ */ jsx("button", {
              onClick: () => setDiaFiltro(null),
              style: {
                background: "rgba(255,255,255,0.15)",
                border: "none",
                color: "#fff",
                padding: "3px 10px",
                borderRadius: 4,
                fontSize: 12,
                cursor: "pointer",
                fontWeight: 600
              },
              children: "Limpar filtro"
            })]
          })]
        });
      })(), selectedId && /* @__PURE__ */ jsx("div", {
        style: {
          background: "#fff",
          borderRadius: 8,
          padding: 24,
          border: "1px solid #e2e8f0"
        },
        children: carregando ? /* @__PURE__ */ jsx("p", {
          style: {
            color: "#64748b",
            fontSize: 14
          },
          children: "Carregando..."
        }) : eventos.length === 0 ? /* @__PURE__ */ jsx("p", {
          style: {
            color: "#64748b",
            fontSize: 14
          },
          children: "Nenhum evento registrado."
        }) : (() => {
          const eventosFiltrados = diaFiltro ? eventos.filter((ev) => ev.data === diaFiltro) : eventos;
          if (eventosFiltrados.length === 0) {
            return /* @__PURE__ */ jsx("p", {
              style: {
                color: "#64748b",
                fontSize: 14
              },
              children: "Nenhum evento neste dia."
            });
          }
          return /* @__PURE__ */ jsxs("div", {
            style: {
              position: "relative",
              paddingLeft: 28
            },
            children: [/* @__PURE__ */ jsx("div", {
              style: {
                position: "absolute",
                left: 7,
                top: 4,
                bottom: 4,
                width: 2,
                background: "#e2e8f0"
              }
            }), eventosFiltrados.map((ev, i) => {
              const cor = corDoTipo(ev.tipo);
              return /* @__PURE__ */ jsxs("div", {
                style: {
                  position: "relative",
                  paddingBottom: i < eventos.length - 1 ? 24 : 0
                },
                children: [/* @__PURE__ */ jsx("div", {
                  style: {
                    position: "absolute",
                    left: -24,
                    top: 3,
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    background: cor,
                    border: "2px solid #fff",
                    boxShadow: "0 0 0 2px " + cor + "40"
                  }
                }), /* @__PURE__ */ jsx("span", {
                  style: {
                    display: "inline-block",
                    fontSize: 11,
                    fontWeight: 600,
                    color: cor,
                    background: cor + "15",
                    padding: "2px 8px",
                    borderRadius: 4,
                    marginBottom: 4,
                    textTransform: "uppercase",
                    letterSpacing: 0.5
                  },
                  children: labelDoTipo(ev.tipo)
                }), /* @__PURE__ */ jsx("div", {
                  style: {
                    fontSize: 15,
                    fontWeight: 600,
                    color: "#1e293b",
                    marginBottom: 2
                  },
                  children: ev.titulo
                }), ev.descricao && /* @__PURE__ */ jsx("div", {
                  style: {
                    fontSize: 13,
                    color: "#64748b",
                    marginBottom: 2,
                    lineHeight: 1.5
                  },
                  children: ev.descricao
                }), /* @__PURE__ */ jsx("div", {
                  style: {
                    fontSize: 12,
                    color: "#94a3b8",
                    marginTop: 2
                  },
                  children: formatarData(ev.data)
                })]
              }, ev.id || i);
            })]
          });
        })()
      })]
    })
  });
});
const labelStyle = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "#475569",
  marginBottom: 4
};
const inputStyle = {
  width: "100%",
  padding: "10px 14px",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  fontSize: 14,
  outline: "none",
  background: "#fff",
  boxSizing: "border-box"
};
const calNavBtn = {
  background: "#f1f5f9",
  border: "1px solid #e2e8f0",
  padding: "4px 12px",
  borderRadius: 6,
  fontSize: 14,
  cursor: "pointer",
  fontWeight: 600
};
const route13 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: standalone_timeline
}, Symbol.toStringTag, { value: "Module" }));
function getSegundaFeira(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
function formatDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function formatDateBR(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
const standalone_relatorios = UNSAFE_withComponentProps(function Relatorios() {
  const [modo, setModo] = useState("semana");
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [semanaOffset, setSemanaOffset] = useState(0);
  const [mesOffset, setMesOffset] = useState(0);
  function getPeriodo() {
    if (modo === "semana") {
      const hoje2 = /* @__PURE__ */ new Date();
      const seg = getSegundaFeira(hoje2);
      seg.setDate(seg.getDate() + semanaOffset * 7);
      const sex = new Date(seg);
      sex.setDate(seg.getDate() + 4);
      return {
        inicio: formatDate(seg),
        fim: formatDate(sex),
        label: `${formatDateBR(formatDate(seg))} — ${formatDateBR(formatDate(sex))}`
      };
    } else {
      const hoje2 = /* @__PURE__ */ new Date();
      const ano = hoje2.getFullYear();
      const mes = hoje2.getMonth() + mesOffset;
      const d = new Date(ano, mes, 1);
      const ultimo = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const label = d.toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric"
      });
      return {
        inicio: formatDate(d),
        fim: formatDate(ultimo),
        label
      };
    }
  }
  const carregar = useCallback(async () => {
    setCarregando(true);
    const {
      inicio,
      fim
    } = getPeriodo();
    const {
      data: escalas
    } = await supabase.from("home_office_schedule").select("date, operator_id, operator_name, operator_email").gte("date", inicio).lte("date", fim);
    if (!escalas || escalas.length === 0) {
      setDados({
        resumo: [],
        totalEscalas: 0,
        totalUsou: 0,
        totalNaoUsou: 0,
        porPessoa: [],
        diasAnalisados: []
      });
      setCarregando(false);
      return;
    }
    let emailToName = {};
    try {
      const usersRes = await fetch("/api/teamlogger/list_users");
      const usersJson = await usersRes.json();
      for (const u of Array.isArray(usersJson) ? usersJson : []) {
        if (u.email) emailToName[u.email.toLowerCase()] = u.name || u.username;
      }
    } catch {
    }
    const diasUnicos = [...new Set(escalas.map((e) => e.date))].sort();
    const hoje2 = formatDate(/* @__PURE__ */ new Date());
    const tlData = {};
    const diasParaBuscar = diasUnicos.filter((d) => d <= hoje2);
    const chunks = [];
    for (let i = 0; i < diasParaBuscar.length; i += 5) {
      chunks.push(diasParaBuscar.slice(i, i + 5));
    }
    for (const chunk of chunks) {
      await Promise.all(chunk.map(async (dateStr) => {
        const [y, m, d] = dateStr.split("-").map(Number);
        try {
          const res = await fetch(`/api/teamlogger/punch_report?year=${y}&month=${m}&day=${d}&timezoneOffsetMinutes=-180`);
          const json = await res.json();
          const dayMap = {};
          for (const p of Array.isArray(json) ? json : []) {
            dayMap[p.employeeName || ""] = {
              presente: p.punchInGMT !== "Absent" && p.totalHours > 0,
              totalHours: p.totalHours || 0
            };
          }
          tlData[dateStr] = dayMap;
        } catch {
        }
      }));
    }
    let totalEscalas = 0;
    let totalUsou = 0;
    let totalNaoUsou = 0;
    const pessoaMap = {};
    const diasAnalisados = [];
    for (const dateStr of diasUnicos) {
      const escalasDia = escalas.filter((e) => e.date === dateStr);
      const dayTL = tlData[dateStr];
      const isFuturo = dateStr > hoje2;
      const diaInfo = {
        date: dateStr,
        pessoas: []
      };
      for (const esc of escalasDia) {
        totalEscalas++;
        const nome = esc.operator_name || "—";
        const email = (esc.operator_email || "").toLowerCase();
        if (!pessoaMap[nome]) pessoaMap[nome] = {
          escalas: 0,
          usou: 0,
          naoUsou: 0,
          horasTotal: 0
        };
        pessoaMap[nome].escalas++;
        if (isFuturo || !dayTL) {
          diaInfo.pessoas.push({
            nome,
            status: "futuro",
            horas: 0
          });
          continue;
        }
        const tlName = email ? emailToName[email] : null;
        const tlEntry = tlName && dayTL[tlName] || dayTL[nome];
        if (tlEntry && tlEntry.presente) {
          totalUsou++;
          pessoaMap[nome].usou++;
          pessoaMap[nome].horasTotal += tlEntry.totalHours;
          diaInfo.pessoas.push({
            nome,
            status: "usou",
            horas: tlEntry.totalHours
          });
        } else {
          totalNaoUsou++;
          pessoaMap[nome].naoUsou++;
          diaInfo.pessoas.push({
            nome,
            status: "nao_usou",
            horas: 0
          });
        }
      }
      diasAnalisados.push(diaInfo);
    }
    const porPessoa = Object.entries(pessoaMap).map(([nome, d]) => ({
      nome,
      escalas: d.escalas,
      usou: d.usou,
      naoUsou: d.naoUsou,
      horasTotal: d.horasTotal,
      pctUso: d.escalas > 0 ? Math.round(d.usou / d.escalas * 100) : 0
    })).sort((a, b) => a.pctUso - b.pctUso);
    setDados({
      totalEscalas,
      totalUsou,
      totalNaoUsou,
      porPessoa,
      diasAnalisados
    });
    setCarregando(false);
  }, [modo, semanaOffset, mesOffset]);
  useEffect(() => {
    carregar();
  }, [carregar]);
  const periodo = getPeriodo();
  const pctGeral = dados && dados.totalEscalas > 0 ? Math.round(dados.totalUsou / dados.totalEscalas * 100) : 0;
  const pctNaoUsou = dados && dados.totalEscalas > 0 ? Math.round(dados.totalNaoUsou / dados.totalEscalas * 100) : 0;
  function navegar(delta) {
    if (modo === "semana") setSemanaOffset((p) => p + delta);
    else setMesOffset((p) => p + delta);
  }
  function corPct(pct) {
    if (pct >= 80) return "#16a34a";
    if (pct >= 50) return "#f59e0b";
    return "#dc2626";
  }
  return /* @__PURE__ */ jsxs("div", {
    children: [/* @__PURE__ */ jsx("h1", {
      style: {
        fontSize: 22,
        fontWeight: 700,
        marginBottom: 6
      },
      children: "Relatórios"
    }), /* @__PURE__ */ jsx("p", {
      style: {
        fontSize: 14,
        color: "#64748b",
        marginBottom: 20
      },
      children: "Home Office × TeamLogger — Quem usou, quem não usou"
    }), /* @__PURE__ */ jsxs("div", {
      style: {
        display: "flex",
        gap: 8,
        alignItems: "center",
        marginBottom: 20,
        flexWrap: "wrap"
      },
      children: [[{
        key: "semana",
        label: "Semana"
      }, {
        key: "mes",
        label: "Mês"
      }].map((t) => /* @__PURE__ */ jsx("button", {
        onClick: () => {
          setModo(t.key);
          setSemanaOffset(0);
          setMesOffset(0);
        },
        style: {
          padding: "6px 18px",
          borderRadius: 20,
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          border: modo === t.key ? "none" : "1px solid #e2e8f0",
          background: modo === t.key ? "#1e40af" : "#fff",
          color: modo === t.key ? "#fff" : "#64748b"
        },
        children: t.label
      }, t.key)), /* @__PURE__ */ jsx("span", {
        style: {
          width: 1,
          height: 20,
          background: "#e2e8f0"
        }
      }), /* @__PURE__ */ jsx("button", {
        onClick: () => navegar(-1),
        style: btnNav,
        children: "← Anterior"
      }), /* @__PURE__ */ jsx("span", {
        style: {
          fontSize: 14,
          fontWeight: 600,
          minWidth: 180,
          textAlign: "center",
          textTransform: "capitalize"
        },
        children: periodo.label
      }), /* @__PURE__ */ jsx("button", {
        onClick: () => navegar(1),
        style: btnNav,
        children: "Próximo →"
      })]
    }), carregando ? /* @__PURE__ */ jsx("p", {
      style: {
        color: "#94a3b8"
      },
      children: "Carregando relatório..."
    }) : !dados || dados.totalEscalas === 0 ? /* @__PURE__ */ jsx("div", {
      style: {
        background: "#f8fafc",
        borderRadius: 10,
        padding: 30,
        textAlign: "center",
        color: "#94a3b8"
      },
      children: "Nenhuma escala de home office neste período."
    }) : /* @__PURE__ */ jsxs(Fragment, {
      children: [/* @__PURE__ */ jsxs("div", {
        style: {
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 24
        },
        children: [/* @__PURE__ */ jsxs("div", {
          style: cardStyle,
          children: [/* @__PURE__ */ jsx("div", {
            style: {
              fontSize: 12,
              color: "#64748b",
              fontWeight: 600,
              textTransform: "uppercase",
              marginBottom: 4
            },
            children: "Total de Escalas"
          }), /* @__PURE__ */ jsx("div", {
            style: {
              fontSize: 28,
              fontWeight: 700,
              color: "#1e293b"
            },
            children: dados.totalEscalas
          }), /* @__PURE__ */ jsx("div", {
            style: {
              fontSize: 12,
              color: "#94a3b8"
            },
            children: "pessoa-dia no período"
          })]
        }), /* @__PURE__ */ jsxs("div", {
          style: cardStyle,
          children: [/* @__PURE__ */ jsx("div", {
            style: {
              fontSize: 12,
              color: "#64748b",
              fontWeight: 600,
              textTransform: "uppercase",
              marginBottom: 4
            },
            children: "Usaram TeamLogger"
          }), /* @__PURE__ */ jsx("div", {
            style: {
              fontSize: 28,
              fontWeight: 700,
              color: "#16a34a"
            },
            children: dados.totalUsou
          }), /* @__PURE__ */ jsxs("div", {
            style: {
              fontSize: 12,
              color: "#94a3b8"
            },
            children: [pctGeral, "% do total"]
          })]
        }), /* @__PURE__ */ jsxs("div", {
          style: cardStyle,
          children: [/* @__PURE__ */ jsx("div", {
            style: {
              fontSize: 12,
              color: "#64748b",
              fontWeight: 600,
              textTransform: "uppercase",
              marginBottom: 4
            },
            children: "Não Usaram"
          }), /* @__PURE__ */ jsx("div", {
            style: {
              fontSize: 28,
              fontWeight: 700,
              color: "#dc2626"
            },
            children: dados.totalNaoUsou
          }), /* @__PURE__ */ jsxs("div", {
            style: {
              fontSize: 12,
              color: "#94a3b8"
            },
            children: [pctNaoUsou, "% da equipe não usou"]
          })]
        }), /* @__PURE__ */ jsxs("div", {
          style: cardStyle,
          children: [/* @__PURE__ */ jsx("div", {
            style: {
              fontSize: 12,
              color: "#64748b",
              fontWeight: 600,
              textTransform: "uppercase",
              marginBottom: 4
            },
            children: "Taxa de Uso"
          }), /* @__PURE__ */ jsxs("div", {
            style: {
              fontSize: 28,
              fontWeight: 700,
              color: corPct(pctGeral)
            },
            children: [pctGeral, "%"]
          }), /* @__PURE__ */ jsx("div", {
            style: {
              width: "100%",
              height: 6,
              borderRadius: 3,
              background: "#e5e7eb",
              marginTop: 6
            },
            children: /* @__PURE__ */ jsx("div", {
              style: {
                width: `${pctGeral}%`,
                height: "100%",
                borderRadius: 3,
                background: corPct(pctGeral),
                transition: "width 0.3s"
              }
            })
          })]
        })]
      }), /* @__PURE__ */ jsxs("div", {
        style: {
          background: "#fff",
          borderRadius: 10,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          overflow: "auto",
          marginBottom: 24
        },
        children: [/* @__PURE__ */ jsx("div", {
          style: {
            padding: "16px 20px",
            borderBottom: "1px solid #e2e8f0"
          },
          children: /* @__PURE__ */ jsx("h3", {
            style: {
              fontSize: 14,
              fontWeight: 600,
              color: "#1e293b",
              margin: 0
            },
            children: "Uso por Funcionário"
          })
        }), /* @__PURE__ */ jsxs("table", {
          style: {
            width: "100%",
            borderCollapse: "collapse"
          },
          children: [/* @__PURE__ */ jsx("thead", {
            children: /* @__PURE__ */ jsx("tr", {
              style: {
                borderBottom: "1px solid #e2e8f0"
              },
              children: ["Funcionário", "Escalas", "Usou TL", "Não usou", "Horas Total", "Taxa"].map((h) => /* @__PURE__ */ jsx("th", {
                style: {
                  textAlign: "left",
                  padding: "10px 16px",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#64748b",
                  textTransform: "uppercase"
                },
                children: h
              }, h))
            })
          }), /* @__PURE__ */ jsx("tbody", {
            children: dados.porPessoa.map((p) => /* @__PURE__ */ jsxs("tr", {
              style: {
                borderBottom: "1px solid #f1f5f9"
              },
              children: [/* @__PURE__ */ jsx("td", {
                style: {
                  padding: "10px 16px",
                  fontSize: 14,
                  fontWeight: 500
                },
                children: p.nome
              }), /* @__PURE__ */ jsx("td", {
                style: {
                  padding: "10px 16px",
                  fontSize: 14,
                  color: "#64748b"
                },
                children: p.escalas
              }), /* @__PURE__ */ jsx("td", {
                style: {
                  padding: "10px 16px",
                  fontSize: 14,
                  color: "#16a34a",
                  fontWeight: 600
                },
                children: p.usou
              }), /* @__PURE__ */ jsx("td", {
                style: {
                  padding: "10px 16px",
                  fontSize: 14,
                  color: p.naoUsou > 0 ? "#dc2626" : "#94a3b8",
                  fontWeight: p.naoUsou > 0 ? 600 : 400
                },
                children: p.naoUsou
              }), /* @__PURE__ */ jsxs("td", {
                style: {
                  padding: "10px 16px",
                  fontSize: 14,
                  color: "#64748b"
                },
                children: [p.horasTotal.toFixed(1).replace(".", ","), "h"]
              }), /* @__PURE__ */ jsx("td", {
                style: {
                  padding: "10px 16px"
                },
                children: /* @__PURE__ */ jsxs("div", {
                  style: {
                    display: "flex",
                    alignItems: "center",
                    gap: 8
                  },
                  children: [/* @__PURE__ */ jsx("div", {
                    style: {
                      width: 60,
                      height: 6,
                      borderRadius: 3,
                      background: "#e5e7eb",
                      overflow: "hidden"
                    },
                    children: /* @__PURE__ */ jsx("div", {
                      style: {
                        width: `${p.pctUso}%`,
                        height: "100%",
                        borderRadius: 3,
                        background: corPct(p.pctUso)
                      }
                    })
                  }), /* @__PURE__ */ jsxs("span", {
                    style: {
                      fontSize: 13,
                      fontWeight: 600,
                      color: corPct(p.pctUso)
                    },
                    children: [p.pctUso, "%"]
                  })]
                })
              })]
            }, p.nome))
          })]
        })]
      }), /* @__PURE__ */ jsxs("div", {
        style: {
          background: "#fff",
          borderRadius: 10,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          overflow: "auto"
        },
        children: [/* @__PURE__ */ jsx("div", {
          style: {
            padding: "16px 20px",
            borderBottom: "1px solid #e2e8f0"
          },
          children: /* @__PURE__ */ jsx("h3", {
            style: {
              fontSize: 14,
              fontWeight: 600,
              color: "#1e293b",
              margin: 0
            },
            children: "Detalhamento por Dia"
          })
        }), /* @__PURE__ */ jsxs("table", {
          style: {
            width: "100%",
            borderCollapse: "collapse"
          },
          children: [/* @__PURE__ */ jsx("thead", {
            children: /* @__PURE__ */ jsx("tr", {
              style: {
                borderBottom: "1px solid #e2e8f0"
              },
              children: ["Dia", "Funcionário", "Status", "Horas"].map((h) => /* @__PURE__ */ jsx("th", {
                style: {
                  textAlign: "left",
                  padding: "10px 16px",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#64748b",
                  textTransform: "uppercase"
                },
                children: h
              }, h))
            })
          }), /* @__PURE__ */ jsx("tbody", {
            children: dados.diasAnalisados.map((dia) => dia.pessoas.map((p, i) => /* @__PURE__ */ jsxs("tr", {
              style: {
                borderBottom: "1px solid #f1f5f9"
              },
              children: [i === 0 && /* @__PURE__ */ jsx("td", {
                rowSpan: dia.pessoas.length,
                style: {
                  padding: "10px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#374151",
                  verticalAlign: "top"
                },
                children: formatDateBR(dia.date)
              }), /* @__PURE__ */ jsx("td", {
                style: {
                  padding: "10px 16px",
                  fontSize: 14
                },
                children: p.nome
              }), /* @__PURE__ */ jsxs("td", {
                style: {
                  padding: "10px 16px"
                },
                children: [p.status === "usou" && /* @__PURE__ */ jsx("span", {
                  style: {
                    background: "#dcfce7",
                    color: "#166534",
                    padding: "2px 10px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 600
                  },
                  children: "Usou TL"
                }), p.status === "nao_usou" && /* @__PURE__ */ jsx("span", {
                  style: {
                    background: "#fef2f2",
                    color: "#dc2626",
                    padding: "2px 10px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 600
                  },
                  children: "Não ligou"
                }), p.status === "futuro" && /* @__PURE__ */ jsx("span", {
                  style: {
                    background: "#f1f5f9",
                    color: "#94a3b8",
                    padding: "2px 10px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 500
                  },
                  children: "Agendado"
                })]
              }), /* @__PURE__ */ jsx("td", {
                style: {
                  padding: "10px 16px",
                  fontSize: 14,
                  color: "#64748b"
                },
                children: p.horas > 0 ? `${p.horas.toFixed(1).replace(".", ",")}h` : "—"
              })]
            }, `${dia.date}-${p.nome}`)))
          })]
        })]
      })]
    })]
  });
});
const btnNav = {
  background: "#f1f5f9",
  border: "1px solid #e2e8f0",
  padding: "6px 14px",
  borderRadius: 6,
  fontSize: 13,
  cursor: "pointer",
  fontWeight: 500
};
const cardStyle = {
  background: "#fff",
  borderRadius: 10,
  padding: 20,
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
};
const route14 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: standalone_relatorios
}, Symbol.toStringTag, { value: "Module" }));
const standalone_minhaConta = UNSAFE_withComponentProps(function MinhaConta() {
  const {
    operator,
    login
  } = useAuth();
  const [form, setForm] = useState({
    nome: "",
    telefone: "",
    cpf: "",
    teamlogger_email: ""
  });
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState("");
  const [senhaNova, setSenhaNova] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState({
    tipo: "",
    texto: ""
  });
  useEffect(() => {
    if (!operator) return;
    carregarDados();
  }, [operator]);
  async function carregarDados() {
    const {
      data
    } = await supabase.from("operadores").select("nome, telefone, cpf, teamlogger_email, avatar_url").eq("id", operator.id).single();
    if (data) {
      setForm({
        nome: data.nome || "",
        telefone: data.telefone || "",
        cpf: data.cpf || "",
        teamlogger_email: data.teamlogger_email || ""
      });
      setAvatarUrl(data.avatar_url || "");
    }
  }
  async function uploadAvatar(e) {
    var _a;
    const file = (_a = e.target.files) == null ? void 0 : _a[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setMsg({
        tipo: "erro",
        texto: "Imagem muito grande. Máximo 2MB."
      });
      return;
    }
    setUploadingAvatar(true);
    setMsg({
      tipo: "",
      texto: ""
    });
    const ext = file.name.split(".").pop();
    const path = `avatars/${operator.id}.${ext}`;
    const {
      error: uploadError
    } = await supabase.storage.from("Avatars").upload(path, file, {
      upsert: true
    });
    if (uploadError) {
      setMsg({
        tipo: "erro",
        texto: "Erro no upload: " + uploadError.message
      });
      setUploadingAvatar(false);
      return;
    }
    const {
      data: urlData
    } = supabase.storage.from("Avatars").getPublicUrl(path);
    const url = urlData.publicUrl + "?t=" + Date.now();
    const {
      error: dbError
    } = await supabase.from("operadores").update({
      avatar_url: url
    }).eq("id", operator.id);
    if (dbError) {
      setMsg({
        tipo: "erro",
        texto: "Erro ao salvar foto: " + dbError.message
      });
    } else {
      setAvatarUrl(url);
      const updated = {
        ...operator,
        avatar_url: url
      };
      localStorage.setItem("rh_operator", JSON.stringify(updated));
      login(updated);
      setMsg({
        tipo: "ok",
        texto: "Foto atualizada!"
      });
    }
    setUploadingAvatar(false);
  }
  async function salvarDados(e) {
    e.preventDefault();
    setSalvando(true);
    setMsg({
      tipo: "",
      texto: ""
    });
    const dados = {};
    if (form.nome.trim()) dados.nome = form.nome.trim();
    if (form.telefone.trim()) dados.telefone = form.telefone.trim();
    else dados.telefone = null;
    if (form.cpf.trim()) dados.cpf = form.cpf.trim();
    else dados.cpf = null;
    if (form.teamlogger_email.trim()) dados.teamlogger_email = form.teamlogger_email.trim().toLowerCase();
    else dados.teamlogger_email = null;
    const {
      error
    } = await supabase.from("operadores").update(dados).eq("id", operator.id);
    if (error) {
      setMsg({
        tipo: "erro",
        texto: "Erro ao salvar: " + error.message
      });
    } else {
      const updated = {
        ...operator,
        nome: dados.nome,
        teamlogger_email: dados.teamlogger_email || ""
      };
      localStorage.setItem("rh_operator", JSON.stringify(updated));
      login(updated);
      setMsg({
        tipo: "ok",
        texto: "Dados atualizados com sucesso!"
      });
    }
    setSalvando(false);
  }
  async function trocarSenha(e) {
    e.preventDefault();
    setSalvando(true);
    setMsg({
      tipo: "",
      texto: ""
    });
    if (!senhaNova || senhaNova.length < 4) {
      setMsg({
        tipo: "erro",
        texto: "A nova senha deve ter pelo menos 4 caracteres."
      });
      setSalvando(false);
      return;
    }
    const {
      data
    } = await supabase.from("operadores").select("senha_hash").eq("id", operator.id).single();
    if (!data || data.senha_hash !== senhaAtual) {
      setMsg({
        tipo: "erro",
        texto: "Senha atual incorreta."
      });
      setSalvando(false);
      return;
    }
    const {
      error
    } = await supabase.from("operadores").update({
      senha_hash: senhaNova
    }).eq("id", operator.id);
    if (error) {
      setMsg({
        tipo: "erro",
        texto: "Erro ao trocar senha: " + error.message
      });
    } else {
      setMsg({
        tipo: "ok",
        texto: "Senha alterada com sucesso!"
      });
      setSenhaAtual("");
      setSenhaNova("");
    }
    setSalvando(false);
  }
  const inputStyle2 = {
    display: "block",
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box"
  };
  const labelStyle2 = {
    fontSize: 13,
    fontWeight: 500,
    color: "#374151",
    marginBottom: 4,
    display: "block"
  };
  return /* @__PURE__ */ jsxs("div", {
    style: {
      maxWidth: 560
    },
    children: [/* @__PURE__ */ jsx("h1", {
      style: {
        fontSize: 22,
        fontWeight: 700,
        marginBottom: 6
      },
      children: "Minha Conta"
    }), /* @__PURE__ */ jsxs("p", {
      style: {
        fontSize: 14,
        color: "#64748b",
        marginBottom: 24
      },
      children: [operator == null ? void 0 : operator.email, " — ", operator == null ? void 0 : operator.cargo]
    }), msg.texto && /* @__PURE__ */ jsx("div", {
      style: {
        background: msg.tipo === "ok" ? "#f0fdf4" : "#fef2f2",
        border: `1px solid ${msg.tipo === "ok" ? "#bbf7d0" : "#fecaca"}`,
        color: msg.tipo === "ok" ? "#166534" : "#dc2626",
        padding: "8px 14px",
        borderRadius: 8,
        fontSize: 13,
        marginBottom: 20
      },
      children: msg.texto
    }), /* @__PURE__ */ jsxs("form", {
      onSubmit: salvarDados,
      style: {
        background: "#fff",
        borderRadius: 10,
        padding: 24,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        marginBottom: 20
      },
      children: [/* @__PURE__ */ jsx("h3", {
        style: {
          fontSize: 15,
          fontWeight: 600,
          marginBottom: 16,
          color: "#1e293b"
        },
        children: "Dados Pessoais"
      }), /* @__PURE__ */ jsxs("div", {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginBottom: 20
        },
        children: [/* @__PURE__ */ jsx("div", {
          style: {
            width: 72,
            height: 72,
            borderRadius: "50%",
            overflow: "hidden",
            background: "#f1f5f9",
            border: "2px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            position: "relative"
          },
          children: avatarUrl ? /* @__PURE__ */ jsx("img", {
            src: avatarUrl,
            alt: "Avatar",
            style: {
              width: "100%",
              height: "100%",
              objectFit: "cover"
            }
          }) : /* @__PURE__ */ jsx("span", {
            style: {
              fontSize: 28,
              fontWeight: 700,
              color: "#94a3b8"
            },
            children: ((operator == null ? void 0 : operator.nome) || "?").charAt(0).toUpperCase()
          })
        }), /* @__PURE__ */ jsxs("div", {
          children: [/* @__PURE__ */ jsx("label", {
            htmlFor: "avatar-upload",
            style: {
              display: "inline-block",
              padding: "7px 16px",
              borderRadius: 6,
              background: "#1e40af",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: uploadingAvatar ? "wait" : "pointer",
              opacity: uploadingAvatar ? 0.6 : 1
            },
            children: uploadingAvatar ? "Enviando..." : "Alterar foto"
          }), /* @__PURE__ */ jsx("input", {
            id: "avatar-upload",
            type: "file",
            accept: "image/*",
            onChange: uploadAvatar,
            disabled: uploadingAvatar,
            style: {
              display: "none"
            }
          }), /* @__PURE__ */ jsx("p", {
            style: {
              fontSize: 11,
              color: "#94a3b8",
              marginTop: 4
            },
            children: "JPG ou PNG, máx 2MB"
          })]
        })]
      }), /* @__PURE__ */ jsxs("div", {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 14
        },
        children: [/* @__PURE__ */ jsxs("div", {
          children: [/* @__PURE__ */ jsx("label", {
            style: labelStyle2,
            children: "Nome completo"
          }), /* @__PURE__ */ jsx("input", {
            type: "text",
            value: form.nome,
            onChange: (e) => setForm({
              ...form,
              nome: e.target.value
            }),
            required: true,
            style: inputStyle2
          })]
        }), /* @__PURE__ */ jsxs("div", {
          children: [/* @__PURE__ */ jsx("label", {
            style: labelStyle2,
            children: "Telefone"
          }), /* @__PURE__ */ jsx("input", {
            type: "text",
            value: form.telefone,
            onChange: (e) => setForm({
              ...form,
              telefone: e.target.value
            }),
            placeholder: "(11) 99999-9999",
            style: inputStyle2
          })]
        }), /* @__PURE__ */ jsxs("div", {
          children: [/* @__PURE__ */ jsx("label", {
            style: labelStyle2,
            children: "CPF"
          }), /* @__PURE__ */ jsx("input", {
            type: "text",
            value: form.cpf,
            onChange: (e) => setForm({
              ...form,
              cpf: e.target.value
            }),
            placeholder: "000.000.000-00",
            style: inputStyle2
          })]
        }), /* @__PURE__ */ jsxs("div", {
          children: [/* @__PURE__ */ jsx("label", {
            style: labelStyle2,
            children: "E-mail do TeamLogger"
          }), /* @__PURE__ */ jsx("input", {
            type: "email",
            value: form.teamlogger_email,
            onChange: (e) => setForm({
              ...form,
              teamlogger_email: e.target.value
            }),
            placeholder: "seu@email-do-teamlogger.com",
            style: inputStyle2
          }), /* @__PURE__ */ jsx("p", {
            style: {
              fontSize: 11,
              color: "#94a3b8",
              marginTop: 4
            },
            children: "Usado para cruzar seus dados de home office com o TeamLogger."
          })]
        })]
      }), /* @__PURE__ */ jsx("button", {
        type: "submit",
        disabled: salvando,
        style: {
          marginTop: 18,
          background: salvando ? "#93c5fd" : "#1e40af",
          color: "#fff",
          border: "none",
          padding: "10px 24px",
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600,
          cursor: salvando ? "not-allowed" : "pointer"
        },
        children: salvando ? "Salvando..." : "Salvar alterações"
      })]
    }), /* @__PURE__ */ jsxs("form", {
      onSubmit: trocarSenha,
      style: {
        background: "#fff",
        borderRadius: 10,
        padding: 24,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
      },
      children: [/* @__PURE__ */ jsx("h3", {
        style: {
          fontSize: 15,
          fontWeight: 600,
          marginBottom: 16,
          color: "#1e293b"
        },
        children: "Alterar Senha"
      }), /* @__PURE__ */ jsxs("div", {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 14
        },
        children: [/* @__PURE__ */ jsxs("div", {
          children: [/* @__PURE__ */ jsx("label", {
            style: labelStyle2,
            children: "Senha atual"
          }), /* @__PURE__ */ jsx("input", {
            type: "password",
            value: senhaAtual,
            onChange: (e) => setSenhaAtual(e.target.value),
            required: true,
            style: inputStyle2
          })]
        }), /* @__PURE__ */ jsxs("div", {
          children: [/* @__PURE__ */ jsx("label", {
            style: labelStyle2,
            children: "Nova senha"
          }), /* @__PURE__ */ jsx("input", {
            type: "password",
            value: senhaNova,
            onChange: (e) => setSenhaNova(e.target.value),
            required: true,
            minLength: 4,
            style: inputStyle2
          })]
        })]
      }), /* @__PURE__ */ jsx("button", {
        type: "submit",
        disabled: salvando,
        style: {
          marginTop: 18,
          background: salvando ? "#fca5a5" : "#dc2626",
          color: "#fff",
          border: "none",
          padding: "10px 24px",
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600,
          cursor: salvando ? "not-allowed" : "pointer"
        },
        children: salvando ? "Alterando..." : "Alterar senha"
      })]
    })]
  });
});
const route15 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: standalone_minhaConta
}, Symbol.toStringTag, { value: "Module" }));
function cargoBorda(cargo) {
  if (cargo === "admin") return "#7c3aed";
  if (cargo === "gestor") return "#2563eb";
  if (cargo === "rh") return "#0891b2";
  return "#e2e8f0";
}
function cargoCorTexto(cargo) {
  if (cargo === "admin") return "#7c3aed";
  if (cargo === "gestor") return "#2563eb";
  if (cargo === "rh") return "#0891b2";
  return "#94a3b8";
}
function cargoLabel(cargo) {
  if (cargo === "admin") return "Admin";
  if (cargo === "gestor") return "Gestor";
  if (cargo === "rh") return "RH";
  return "Colaborador";
}
const TEMPERAMENTOS = [{
  value: "sanguineo",
  label: "Sanguíneo",
  emoji: "🔥",
  desc: "Extrovertido, otimista, comunicativo"
}, {
  value: "colerico",
  label: "Colérico",
  emoji: "⚡",
  desc: "Determinado, líder, objetivo"
}, {
  value: "melancolico",
  label: "Melancólico",
  emoji: "🎭",
  desc: "Analítico, detalhista, perfeccionista"
}, {
  value: "fleumatico",
  label: "Fleumático",
  emoji: "🌊",
  desc: "Calmo, paciente, diplomata"
}];
const MBTI_TYPES = ["INTJ", "INTP", "ENTJ", "ENTP", "INFJ", "INFP", "ENFJ", "ENFP", "ISTJ", "ISFJ", "ESTJ", "ESFJ", "ISTP", "ISFP", "ESTP", "ESFP"];
const MBTI_DESC = {
  INTJ: "O Arquiteto — estrategista visionário",
  INTP: "O Lógico — inventor analítico",
  ENTJ: "O Comandante — líder nato e decisivo",
  ENTP: "O Inovador — debatedor criativo",
  INFJ: "O Advogado — idealista misterioso",
  INFP: "O Mediador — sonhador empático",
  ENFJ: "O Protagonista — líder carismático",
  ENFP: "O Ativista — espírito livre criativo",
  ISTJ: "O Logístico — confiável e organizado",
  ISFJ: "O Defensor — protetor dedicado",
  ESTJ: "O Executivo — administrador prático",
  ESFJ: "O Cônsul — cuidador social",
  ISTP: "O Virtuoso — mecânico destemido",
  ISFP: "O Aventureiro — artista sensível",
  ESTP: "O Empresário — ação e energia",
  ESFP: "O Animador — espontâneo e divertido"
};
const standalone_tropa = UNSAFE_withComponentProps(function TropaDaCYG() {
  var _a, _b, _c, _d;
  const {
    operator
  } = useAuth();
  const [membros, setMembros] = useState([]);
  const [meuPerfil, setMeuPerfil] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [selecionado, setSelecionado] = useState(null);
  const [tab, setTab] = useState("galeria");
  const [quizStep, setQuizStep] = useState(0);
  const [quizRespostas, setQuizRespostas] = useState({});
  const [formInfo, setFormInfo] = useState({
    cargo_descricao: "",
    aniversario: "",
    time_torce: "",
    temperamento: "",
    comida_favorita: "",
    musica_favorita: "",
    hobby: "",
    frase: "",
    curiosidade: "",
    filme_serie: "",
    superpoder: ""
  });
  const [salvando, setSalvando] = useState(false);
  const carregar = useCallback(async () => {
    setCarregando(true);
    const {
      data: ops
    } = await supabase.from("operadores").select("id, nome, email, cargo, avatar_url").in("status", ["aprovado", "active"]);
    const {
      data: perfis
    } = await supabase.from("perfil_social").select("*");
    const perfilMap = {};
    (perfis || []).forEach((p) => {
      perfilMap[p.operator_id] = p;
    });
    const lista = (ops || []).map((o) => ({
      ...o,
      perfil: perfilMap[o.id] || null
    }));
    setMembros(lista);
    if (operator) {
      const meu = perfilMap[operator.id];
      setMeuPerfil(meu || null);
      if (meu) {
        setFormInfo({
          cargo_descricao: meu.cargo_descricao || "",
          aniversario: meu.aniversario || "",
          time_torce: meu.time_torce || "",
          temperamento: meu.temperamento || "",
          comida_favorita: meu.comida_favorita || "",
          musica_favorita: meu.musica_favorita || "",
          hobby: meu.hobby || "",
          frase: meu.frase || "",
          curiosidade: meu.curiosidade || "",
          filme_serie: meu.filme_serie || "",
          superpoder: meu.superpoder || ""
        });
      }
    }
    setCarregando(false);
  }, [operator]);
  useEffect(() => {
    carregar();
  }, [carregar]);
  async function salvarQuiz() {
    setSalvando(true);
    const dados = {
      operator_id: operator.id,
      personalidade: quizRespostas.mbti || null,
      ...formInfo,
      quiz_completo: true,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (meuPerfil) {
      await supabase.from("perfil_social").update(dados).eq("operator_id", operator.id);
    } else {
      await supabase.from("perfil_social").insert(dados);
    }
    setSalvando(false);
    setTab("galeria");
    carregar();
  }
  function formatData(d) {
    if (!d) return "—";
    const [y, m, day] = d.split("-");
    return `${day}/${m}`;
  }
  const inputStyle2 = {
    display: "block",
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
    background: "#fff"
  };
  const labelStyle2 = {
    fontSize: 12,
    fontWeight: 600,
    color: "#475569",
    marginBottom: 4,
    display: "block"
  };
  if (carregando) return /* @__PURE__ */ jsx("p", {
    style: {
      color: "#94a3b8"
    },
    children: "Carregando..."
  });
  const modal = selecionado && /* @__PURE__ */ jsx("div", {
    style: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,0.5)",
      zIndex: 9999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20
    },
    onClick: () => setSelecionado(null),
    children: /* @__PURE__ */ jsxs("div", {
      onClick: (e) => e.stopPropagation(),
      style: {
        background: "#fff",
        borderRadius: 16,
        padding: 28,
        maxWidth: 440,
        width: "100%",
        maxHeight: "85vh",
        overflowY: "auto",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
      },
      children: [/* @__PURE__ */ jsxs("div", {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginBottom: 20
        },
        children: [/* @__PURE__ */ jsx("div", {
          style: {
            width: 64,
            height: 64,
            borderRadius: "50%",
            overflow: "hidden",
            background: "#f1f5f9",
            border: "3px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0
          },
          children: selecionado.avatar_url ? /* @__PURE__ */ jsx("img", {
            src: selecionado.avatar_url,
            alt: "",
            style: {
              width: "100%",
              height: "100%",
              objectFit: "cover"
            }
          }) : /* @__PURE__ */ jsx("span", {
            style: {
              fontSize: 24,
              fontWeight: 700,
              color: "#94a3b8"
            },
            children: (selecionado.nome || "?").charAt(0).toUpperCase()
          })
        }), /* @__PURE__ */ jsxs("div", {
          children: [/* @__PURE__ */ jsx("h2", {
            style: {
              fontSize: 18,
              fontWeight: 700,
              color: "#0f172a",
              margin: 0
            },
            children: selecionado.nome
          }), /* @__PURE__ */ jsx("p", {
            style: {
              fontSize: 13,
              color: "#64748b",
              margin: 0
            },
            children: selecionado.cargo
          })]
        }), /* @__PURE__ */ jsx("button", {
          onClick: () => setSelecionado(null),
          style: {
            marginLeft: "auto",
            background: "none",
            border: "none",
            fontSize: 22,
            color: "#94a3b8",
            cursor: "pointer"
          },
          children: "×"
        })]
      }), ((_a = selecionado.perfil) == null ? void 0 : _a.quiz_completo) ? /* @__PURE__ */ jsxs("div", {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 12
        },
        children: [selecionado.perfil.personalidade && /* @__PURE__ */ jsxs("div", {
          style: {
            background: "#f0f9ff",
            padding: "12px 16px",
            borderRadius: 10,
            border: "1px solid #bae6fd"
          },
          children: [/* @__PURE__ */ jsx("p", {
            style: {
              fontSize: 11,
              fontWeight: 600,
              color: "#0369a1",
              marginBottom: 2
            },
            children: "PERSONALIDADE"
          }), /* @__PURE__ */ jsxs("p", {
            style: {
              fontSize: 16,
              fontWeight: 700,
              color: "#0c4a6e",
              margin: 0
            },
            children: [selecionado.perfil.personalidade, /* @__PURE__ */ jsx("span", {
              style: {
                fontSize: 12,
                fontWeight: 400,
                color: "#64748b",
                marginLeft: 8
              },
              children: MBTI_DESC[selecionado.perfil.personalidade] || ""
            })]
          })]
        }), selecionado.perfil.temperamento && /* @__PURE__ */ jsxs("div", {
          style: {
            background: "#fefce8",
            padding: "12px 16px",
            borderRadius: 10,
            border: "1px solid #fde68a"
          },
          children: [/* @__PURE__ */ jsx("p", {
            style: {
              fontSize: 11,
              fontWeight: 600,
              color: "#a16207",
              marginBottom: 2
            },
            children: "TEMPERAMENTO"
          }), /* @__PURE__ */ jsxs("p", {
            style: {
              fontSize: 15,
              fontWeight: 600,
              color: "#78350f",
              margin: 0
            },
            children: [(_b = TEMPERAMENTOS.find((t) => t.value === selecionado.perfil.temperamento)) == null ? void 0 : _b.emoji, " ", ((_c = TEMPERAMENTOS.find((t) => t.value === selecionado.perfil.temperamento)) == null ? void 0 : _c.label) || selecionado.perfil.temperamento]
          }), /* @__PURE__ */ jsx("p", {
            style: {
              fontSize: 12,
              color: "#92400e",
              margin: 0
            },
            children: ((_d = TEMPERAMENTOS.find((t) => t.value === selecionado.perfil.temperamento)) == null ? void 0 : _d.desc) || ""
          })]
        }), /* @__PURE__ */ jsx("div", {
          style: {
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8
          },
          children: [{
            label: "Aniversário",
            value: formatData(selecionado.perfil.aniversario),
            icon: "🎂"
          }, {
            label: "Time",
            value: selecionado.perfil.time_torce,
            icon: "⚽"
          }, {
            label: "Comida favorita",
            value: selecionado.perfil.comida_favorita,
            icon: "🍕"
          }, {
            label: "Música / Artista",
            value: selecionado.perfil.musica_favorita,
            icon: "🎵"
          }, {
            label: "Filme / Série",
            value: selecionado.perfil.filme_serie,
            icon: "🎬"
          }, {
            label: "Hobby",
            value: selecionado.perfil.hobby,
            icon: "🎯"
          }, {
            label: "Superpoder",
            value: selecionado.perfil.superpoder,
            icon: "💪"
          }].filter((item) => item.value).map((item, i) => /* @__PURE__ */ jsxs("div", {
            style: {
              background: "#f8fafc",
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #e2e8f0"
            },
            children: [/* @__PURE__ */ jsxs("p", {
              style: {
                fontSize: 10,
                fontWeight: 600,
                color: "#94a3b8",
                margin: 0
              },
              children: [item.icon, " ", item.label]
            }), /* @__PURE__ */ jsx("p", {
              style: {
                fontSize: 13,
                fontWeight: 500,
                color: "#1e293b",
                margin: "2px 0 0"
              },
              children: item.value
            })]
          }, i))
        }), selecionado.perfil.frase && /* @__PURE__ */ jsx("div", {
          style: {
            background: "#f5f3ff",
            padding: "12px 16px",
            borderRadius: 10,
            border: "1px solid #ddd6fe",
            textAlign: "center"
          },
          children: /* @__PURE__ */ jsxs("p", {
            style: {
              fontSize: 14,
              fontStyle: "italic",
              color: "#5b21b6",
              margin: 0
            },
            children: ['"', selecionado.perfil.frase, '"']
          })
        }), selecionado.perfil.curiosidade && /* @__PURE__ */ jsxs("div", {
          style: {
            background: "#fff7ed",
            padding: "12px 16px",
            borderRadius: 10,
            border: "1px solid #fed7aa"
          },
          children: [/* @__PURE__ */ jsx("p", {
            style: {
              fontSize: 11,
              fontWeight: 600,
              color: "#c2410c",
              marginBottom: 2
            },
            children: "CURIOSIDADE"
          }), /* @__PURE__ */ jsx("p", {
            style: {
              fontSize: 13,
              color: "#7c2d12",
              margin: 0
            },
            children: selecionado.perfil.curiosidade
          })]
        })]
      }) : /* @__PURE__ */ jsxs("div", {
        style: {
          textAlign: "center",
          padding: "20px 0",
          color: "#94a3b8"
        },
        children: [/* @__PURE__ */ jsx("p", {
          style: {
            fontSize: 40,
            margin: 0
          },
          children: "🤫"
        }), /* @__PURE__ */ jsx("p", {
          style: {
            fontSize: 14,
            marginTop: 8
          },
          children: "Ainda não preencheu o perfil"
        })]
      })]
    })
  });
  return /* @__PURE__ */ jsxs("div", {
    children: [modal, /* @__PURE__ */ jsxs("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 24
      },
      children: [/* @__PURE__ */ jsxs("div", {
        children: [/* @__PURE__ */ jsx("h1", {
          style: {
            fontSize: 22,
            fontWeight: 700,
            color: "#0f172a",
            margin: 0
          },
          children: "Tropa da CYG"
        }), /* @__PURE__ */ jsx("p", {
          style: {
            fontSize: 14,
            color: "#64748b",
            margin: "4px 0 0"
          },
          children: "Conheça quem faz a Cygnuss acontecer"
        })]
      }), /* @__PURE__ */ jsxs("div", {
        style: {
          display: "flex",
          gap: 6
        },
        children: [/* @__PURE__ */ jsx("button", {
          onClick: () => setTab("galeria"),
          style: {
            padding: "8px 18px",
            borderRadius: 8,
            border: "none",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            background: tab === "galeria" ? "rgb(22,134,78)" : "#f1f5f9",
            color: tab === "galeria" ? "#fff" : "#64748b"
          },
          children: "Equipe"
        }), /* @__PURE__ */ jsx("button", {
          onClick: () => {
            setTab("meu-quiz");
            setQuizStep(0);
          },
          style: {
            padding: "8px 18px",
            borderRadius: 8,
            border: "none",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            background: tab === "meu-quiz" ? "rgb(22,134,78)" : "#f1f5f9",
            color: tab === "meu-quiz" ? "#fff" : "#64748b"
          },
          children: (meuPerfil == null ? void 0 : meuPerfil.quiz_completo) ? "Editar meu perfil" : "Preencher meu perfil"
        })]
      })]
    }), tab === "galeria" && /* @__PURE__ */ jsx("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
        gap: 16
      },
      children: membros.map((m) => {
        var _a2, _b2, _c2, _d2, _e, _f, _g;
        return /* @__PURE__ */ jsxs("div", {
          onClick: () => setSelecionado(m),
          style: {
            background: "#fff",
            borderRadius: 12,
            padding: 20,
            textAlign: "center",
            cursor: "pointer",
            transition: "all 0.15s",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            border: `2px solid ${cargoBorda(m.cargo)}`
          },
          onMouseEnter: (e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
          },
          onMouseLeave: (e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)";
          },
          children: [/* @__PURE__ */ jsx("div", {
            style: {
              width: 72,
              height: 72,
              borderRadius: "50%",
              overflow: "hidden",
              background: "#f1f5f9",
              margin: "0 auto 10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: `3px solid ${cargoBorda(m.cargo)}`
            },
            children: m.avatar_url ? /* @__PURE__ */ jsx("img", {
              src: m.avatar_url,
              alt: "",
              style: {
                width: "100%",
                height: "100%",
                objectFit: "cover"
              }
            }) : /* @__PURE__ */ jsx("span", {
              style: {
                fontSize: 26,
                fontWeight: 700,
                color: "#94a3b8"
              },
              children: (m.nome || "?").charAt(0).toUpperCase()
            })
          }), /* @__PURE__ */ jsx("p", {
            style: {
              fontSize: 14,
              fontWeight: 600,
              color: "#1e293b",
              margin: 0
            },
            children: m.nome
          }), /* @__PURE__ */ jsx("p", {
            style: {
              fontSize: 11,
              color: ((_a2 = m.perfil) == null ? void 0 : _a2.cargo_descricao) ? "#475569" : cargoCorTexto(m.cargo),
              margin: "2px 0 0",
              fontWeight: 500
            },
            children: ((_b2 = m.perfil) == null ? void 0 : _b2.cargo_descricao) || cargoLabel(m.cargo)
          }), ((_c2 = m.perfil) == null ? void 0 : _c2.personalidade) && /* @__PURE__ */ jsx("span", {
            style: {
              display: "inline-block",
              marginTop: 6,
              padding: "2px 8px",
              borderRadius: 10,
              background: "#f0f9ff",
              color: "#0369a1",
              fontSize: 10,
              fontWeight: 700
            },
            children: m.perfil.personalidade
          }), ((_d2 = m.perfil) == null ? void 0 : _d2.temperamento) && /* @__PURE__ */ jsxs("span", {
            style: {
              display: "inline-block",
              marginTop: 4,
              padding: "2px 8px",
              borderRadius: 10,
              background: "#fefce8",
              color: "#a16207",
              fontSize: 10,
              fontWeight: 600
            },
            children: [(_e = TEMPERAMENTOS.find((t) => t.value === m.perfil.temperamento)) == null ? void 0 : _e.emoji, " ", (_f = TEMPERAMENTOS.find((t) => t.value === m.perfil.temperamento)) == null ? void 0 : _f.label]
          }), !((_g = m.perfil) == null ? void 0 : _g.quiz_completo) && /* @__PURE__ */ jsx("p", {
            style: {
              fontSize: 10,
              color: "#cbd5e1",
              marginTop: 6
            },
            children: "Perfil pendente"
          })]
        }, m.id);
      })
    }), tab === "meu-quiz" && /* @__PURE__ */ jsxs("div", {
      style: {
        maxWidth: 520,
        margin: "0 auto"
      },
      children: [quizStep === 0 && /* @__PURE__ */ jsxs("div", {
        style: {
          background: "#fff",
          borderRadius: 12,
          padding: 28,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
        },
        children: [/* @__PURE__ */ jsx("h2", {
          style: {
            fontSize: 18,
            fontWeight: 700,
            color: "#0f172a",
            marginBottom: 4
          },
          children: "Teste de Personalidade"
        }), /* @__PURE__ */ jsx("p", {
          style: {
            fontSize: 13,
            color: "#64748b",
            marginBottom: 20
          },
          children: "Faça o teste no site oficial e depois selecione seu resultado aqui"
        }), /* @__PURE__ */ jsxs("a", {
          href: "https://www.16personalities.com/br/teste-de-personalidade",
          target: "_blank",
          rel: "noopener noreferrer",
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "14px 20px",
            borderRadius: 10,
            textDecoration: "none",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            marginBottom: 20,
            boxShadow: "0 4px 12px rgba(99,102,241,0.3)",
            transition: "transform 0.12s"
          },
          onMouseEnter: (e) => e.currentTarget.style.transform = "translateY(-1px)",
          onMouseLeave: (e) => e.currentTarget.style.transform = "translateY(0)",
          children: ["Fazer o teste de personalidade →", /* @__PURE__ */ jsxs("svg", {
            width: "14",
            height: "14",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2",
            children: [/* @__PURE__ */ jsx("path", {
              d: "M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"
            }), /* @__PURE__ */ jsx("polyline", {
              points: "15 3 21 3 21 9"
            }), /* @__PURE__ */ jsx("line", {
              x1: "10",
              y1: "14",
              x2: "21",
              y2: "3"
            })]
          })]
        }), /* @__PURE__ */ jsx("div", {
          style: {
            background: "#f8fafc",
            borderRadius: 8,
            padding: 14,
            marginBottom: 20
          },
          children: /* @__PURE__ */ jsx("p", {
            style: {
              fontSize: 12,
              color: "#64748b",
              margin: 0,
              lineHeight: 1.5
            },
            children: "O teste leva cerca de 10 minutos. No final, você vai receber um resultado com 4 letras (ex: ENFP, INTJ, ISFJ...). Selecione abaixo o resultado que você obteve."
          })
        }), /* @__PURE__ */ jsxs("div", {
          style: {
            marginBottom: 20
          },
          children: [/* @__PURE__ */ jsx("label", {
            style: {
              fontSize: 13,
              fontWeight: 600,
              color: "#1e293b",
              marginBottom: 8,
              display: "block"
            },
            children: "Qual foi seu resultado?"
          }), /* @__PURE__ */ jsx("div", {
            style: {
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 6
            },
            children: MBTI_TYPES.map((tipo) => /* @__PURE__ */ jsx("button", {
              onClick: () => setQuizRespostas({
                ...quizRespostas,
                mbti: tipo
              }),
              style: {
                padding: "10px 4px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.12s",
                textAlign: "center",
                border: quizRespostas.mbti === tipo ? "2px solid rgb(22,134,78)" : "1px solid #e2e8f0",
                background: quizRespostas.mbti === tipo ? "rgba(22,134,78,0.08)" : "#fff",
                color: quizRespostas.mbti === tipo ? "rgb(22,134,78)" : "#475569"
              },
              children: tipo
            }, tipo))
          }), quizRespostas.mbti && /* @__PURE__ */ jsxs("p", {
            style: {
              fontSize: 12,
              color: "#166534",
              marginTop: 8,
              background: "#f0fdf4",
              padding: "8px 12px",
              borderRadius: 6
            },
            children: [quizRespostas.mbti, " — ", MBTI_DESC[quizRespostas.mbti] || ""]
          })]
        }), /* @__PURE__ */ jsx("button", {
          onClick: () => setQuizStep(1),
          disabled: !quizRespostas.mbti,
          style: {
            width: "100%",
            padding: "12px 0",
            borderRadius: 8,
            border: "none",
            background: quizRespostas.mbti ? "rgb(22,134,78)" : "#e2e8f0",
            color: quizRespostas.mbti ? "#fff" : "#94a3b8",
            fontSize: 14,
            fontWeight: 600,
            cursor: quizRespostas.mbti ? "pointer" : "not-allowed"
          },
          children: "Próximo passo →"
        })]
      }), quizStep === 1 && /* @__PURE__ */ jsxs("div", {
        style: {
          background: "#fff",
          borderRadius: 12,
          padding: 28,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
        },
        children: [/* @__PURE__ */ jsx("h2", {
          style: {
            fontSize: 18,
            fontWeight: 700,
            color: "#0f172a",
            marginBottom: 4
          },
          children: "Sobre Você"
        }), /* @__PURE__ */ jsx("p", {
          style: {
            fontSize: 13,
            color: "#64748b",
            marginBottom: 20
          },
          children: "Preencha o que quiser — só aparece o que você completar"
        }), /* @__PURE__ */ jsxs("div", {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: 14
          },
          children: [/* @__PURE__ */ jsxs("div", {
            children: [/* @__PURE__ */ jsx("label", {
              style: labelStyle2,
              children: "Seu cargo / função"
            }), /* @__PURE__ */ jsx("input", {
              type: "text",
              value: formInfo.cargo_descricao,
              onChange: (e) => setFormInfo({
                ...formInfo,
                cargo_descricao: e.target.value
              }),
              placeholder: "Ex: Designer, Atendimento, Supervisora",
              style: inputStyle2
            }), /* @__PURE__ */ jsx("p", {
              style: {
                fontSize: 11,
                color: "#94a3b8",
                margin: "4px 0 0"
              },
              children: "Aparece no seu card na Tropa da CYG"
            })]
          }), /* @__PURE__ */ jsxs("div", {
            children: [/* @__PURE__ */ jsx("label", {
              style: labelStyle2,
              children: "Aniversário"
            }), /* @__PURE__ */ jsx("input", {
              type: "date",
              value: formInfo.aniversario,
              onChange: (e) => setFormInfo({
                ...formInfo,
                aniversario: e.target.value
              }),
              style: inputStyle2
            })]
          }), /* @__PURE__ */ jsxs("div", {
            children: [/* @__PURE__ */ jsx("label", {
              style: labelStyle2,
              children: "Temperamento"
            }), /* @__PURE__ */ jsx("div", {
              style: {
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 6
              },
              children: TEMPERAMENTOS.map((t) => /* @__PURE__ */ jsxs("button", {
                onClick: () => setFormInfo({
                  ...formInfo,
                  temperamento: t.value
                }),
                style: {
                  padding: "8px 10px",
                  borderRadius: 8,
                  fontSize: 12,
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "all 0.12s",
                  border: formInfo.temperamento === t.value ? "2px solid rgb(22,134,78)" : "1px solid #e2e8f0",
                  background: formInfo.temperamento === t.value ? "rgba(22,134,78,0.08)" : "#fff",
                  color: formInfo.temperamento === t.value ? "rgb(22,134,78)" : "#475569",
                  fontWeight: formInfo.temperamento === t.value ? 600 : 400
                },
                children: [t.emoji, " ", t.label, /* @__PURE__ */ jsx("span", {
                  style: {
                    display: "block",
                    fontSize: 10,
                    color: "#94a3b8",
                    fontWeight: 400
                  },
                  children: t.desc
                })]
              }, t.value))
            })]
          }), /* @__PURE__ */ jsxs("div", {
            children: [/* @__PURE__ */ jsx("label", {
              style: labelStyle2,
              children: "Time que torce"
            }), /* @__PURE__ */ jsx("input", {
              type: "text",
              value: formInfo.time_torce,
              onChange: (e) => setFormInfo({
                ...formInfo,
                time_torce: e.target.value
              }),
              placeholder: "Ex: Corinthians",
              style: inputStyle2
            })]
          }), /* @__PURE__ */ jsxs("div", {
            style: {
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12
            },
            children: [/* @__PURE__ */ jsxs("div", {
              children: [/* @__PURE__ */ jsx("label", {
                style: labelStyle2,
                children: "Comida favorita"
              }), /* @__PURE__ */ jsx("input", {
                type: "text",
                value: formInfo.comida_favorita,
                onChange: (e) => setFormInfo({
                  ...formInfo,
                  comida_favorita: e.target.value
                }),
                placeholder: "Ex: Pizza",
                style: inputStyle2
              })]
            }), /* @__PURE__ */ jsxs("div", {
              children: [/* @__PURE__ */ jsx("label", {
                style: labelStyle2,
                children: "Música / Artista favorito"
              }), /* @__PURE__ */ jsx("input", {
                type: "text",
                value: formInfo.musica_favorita,
                onChange: (e) => setFormInfo({
                  ...formInfo,
                  musica_favorita: e.target.value
                }),
                placeholder: "Ex: Jorge & Mateus",
                style: inputStyle2
              })]
            })]
          }), /* @__PURE__ */ jsxs("div", {
            style: {
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12
            },
            children: [/* @__PURE__ */ jsxs("div", {
              children: [/* @__PURE__ */ jsx("label", {
                style: labelStyle2,
                children: "Filme / Série favorita"
              }), /* @__PURE__ */ jsx("input", {
                type: "text",
                value: formInfo.filme_serie,
                onChange: (e) => setFormInfo({
                  ...formInfo,
                  filme_serie: e.target.value
                }),
                placeholder: "Ex: Breaking Bad",
                style: inputStyle2
              })]
            }), /* @__PURE__ */ jsxs("div", {
              children: [/* @__PURE__ */ jsx("label", {
                style: labelStyle2,
                children: "Hobby"
              }), /* @__PURE__ */ jsx("input", {
                type: "text",
                value: formInfo.hobby,
                onChange: (e) => setFormInfo({
                  ...formInfo,
                  hobby: e.target.value
                }),
                placeholder: "Ex: Jogar futebol",
                style: inputStyle2
              })]
            })]
          }), /* @__PURE__ */ jsxs("div", {
            children: [/* @__PURE__ */ jsx("label", {
              style: labelStyle2,
              children: "Se pudesse ter um superpoder, qual seria?"
            }), /* @__PURE__ */ jsx("input", {
              type: "text",
              value: formInfo.superpoder,
              onChange: (e) => setFormInfo({
                ...formInfo,
                superpoder: e.target.value
              }),
              placeholder: "Ex: Teletransporte",
              style: inputStyle2
            })]
          }), /* @__PURE__ */ jsxs("div", {
            children: [/* @__PURE__ */ jsx("label", {
              style: labelStyle2,
              children: "Uma frase que te define"
            }), /* @__PURE__ */ jsx("input", {
              type: "text",
              value: formInfo.frase,
              onChange: (e) => setFormInfo({
                ...formInfo,
                frase: e.target.value
              }),
              placeholder: "Ex: Feito é melhor que perfeito",
              style: inputStyle2
            })]
          }), /* @__PURE__ */ jsxs("div", {
            children: [/* @__PURE__ */ jsx("label", {
              style: labelStyle2,
              children: "Uma curiosidade sobre você que ninguém sabe"
            }), /* @__PURE__ */ jsx("textarea", {
              value: formInfo.curiosidade,
              onChange: (e) => setFormInfo({
                ...formInfo,
                curiosidade: e.target.value
              }),
              placeholder: "Ex: Já morei em 5 cidades diferentes",
              rows: 2,
              style: {
                ...inputStyle2,
                resize: "vertical"
              }
            })]
          })]
        }), /* @__PURE__ */ jsxs("div", {
          style: {
            display: "flex",
            gap: 8,
            marginTop: 20
          },
          children: [!(meuPerfil == null ? void 0 : meuPerfil.quiz_completo) && /* @__PURE__ */ jsx("button", {
            onClick: () => setQuizStep(0),
            style: {
              flex: 1,
              padding: "12px 0",
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              background: "#fff",
              color: "#64748b",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer"
            },
            children: "← Voltar ao quiz"
          }), /* @__PURE__ */ jsx("button", {
            onClick: salvarQuiz,
            disabled: salvando,
            style: {
              flex: 2,
              padding: "12px 0",
              borderRadius: 8,
              border: "none",
              background: "rgb(22,134,78)",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              opacity: salvando ? 0.6 : 1
            },
            children: salvando ? "Salvando..." : "Salvar perfil"
          })]
        })]
      })]
    })]
  });
});
const route16 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: standalone_tropa
}, Symbol.toStringTag, { value: "Module" }));
const serverManifest = { "entry": { "module": "/assets/entry.client-aGOyU4rf.js", "imports": ["/assets/jsx-runtime-D_zvdyIk.js", "/assets/chunk-LFPYN7LY-WBqmoi8u.js"], "css": [] }, "routes": { "root": { "id": "root", "parentId": void 0, "path": "", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": true, "module": "/assets/root-CvhjKsQM.js", "imports": ["/assets/jsx-runtime-D_zvdyIk.js", "/assets/chunk-LFPYN7LY-WBqmoi8u.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/redirect-login": { "id": "routes/redirect-login", "parentId": "root", "path": "/", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/redirect-login-C0-h-7sQ.js", "imports": ["/assets/chunk-LFPYN7LY-WBqmoi8u.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/api.teamlogger.$": { "id": "routes/api.teamlogger.$", "parentId": "root", "path": "api/teamlogger/*", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": false, "hasErrorBoundary": false, "module": "/assets/api.teamlogger._-l0sNRNKZ.js", "imports": [], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/standalone": { "id": "routes/standalone", "parentId": "root", "path": void 0, "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/standalone-UsHab4sl.js", "imports": ["/assets/chunk-LFPYN7LY-WBqmoi8u.js", "/assets/jsx-runtime-D_zvdyIk.js", "/assets/useAuth-DPuk-X-i.js", "/assets/supabase-C_zMzzCB.js", "/assets/useConfirm-CcFvbdLC.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/standalone._index": { "id": "routes/standalone._index", "parentId": "routes/standalone", "path": "standalone", "index": true, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/standalone._index-DKV_W6G1.js", "imports": ["/assets/chunk-LFPYN7LY-WBqmoi8u.js", "/assets/jsx-runtime-D_zvdyIk.js", "/assets/supabase-C_zMzzCB.js", "/assets/useAuth-DPuk-X-i.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/standalone.entrar": { "id": "routes/standalone.entrar", "parentId": "routes/standalone", "path": "standalone/entrar", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/standalone.entrar-CIw0a8xS.js", "imports": ["/assets/chunk-LFPYN7LY-WBqmoi8u.js", "/assets/jsx-runtime-D_zvdyIk.js", "/assets/supabase-C_zMzzCB.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/standalone.home-office": { "id": "routes/standalone.home-office", "parentId": "routes/standalone", "path": "standalone/home-office", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/standalone.home-office-DxX4AL14.js", "imports": ["/assets/chunk-LFPYN7LY-WBqmoi8u.js", "/assets/jsx-runtime-D_zvdyIk.js", "/assets/supabase-C_zMzzCB.js", "/assets/useAuth-DPuk-X-i.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/standalone.ferias": { "id": "routes/standalone.ferias", "parentId": "routes/standalone", "path": "standalone/ferias", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/standalone.ferias-BYU-rO0V.js", "imports": ["/assets/chunk-LFPYN7LY-WBqmoi8u.js", "/assets/jsx-runtime-D_zvdyIk.js", "/assets/supabase-C_zMzzCB.js", "/assets/useAuth-DPuk-X-i.js", "/assets/useConfirm-CcFvbdLC.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/standalone.folha": { "id": "routes/standalone.folha", "parentId": "routes/standalone", "path": "standalone/folha", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/standalone.folha-9jX-GABG.js", "imports": ["/assets/chunk-LFPYN7LY-WBqmoi8u.js", "/assets/jsx-runtime-D_zvdyIk.js", "/assets/supabase-C_zMzzCB.js", "/assets/useAuth-DPuk-X-i.js", "/assets/useConfirm-CcFvbdLC.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/standalone.ponto": { "id": "routes/standalone.ponto", "parentId": "routes/standalone", "path": "standalone/ponto", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/standalone.ponto-CWYcgOJx.js", "imports": ["/assets/chunk-LFPYN7LY-WBqmoi8u.js", "/assets/jsx-runtime-D_zvdyIk.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/standalone.funcionarios": { "id": "routes/standalone.funcionarios", "parentId": "routes/standalone", "path": "standalone/funcionarios", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/standalone.funcionarios-CuowoFNK.js", "imports": ["/assets/chunk-LFPYN7LY-WBqmoi8u.js", "/assets/jsx-runtime-D_zvdyIk.js", "/assets/supabase-C_zMzzCB.js", "/assets/useConfirm-CcFvbdLC.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/standalone.aprovacoes": { "id": "routes/standalone.aprovacoes", "parentId": "routes/standalone", "path": "standalone/aprovacoes", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/standalone.aprovacoes-SXWWEkhj.js", "imports": ["/assets/chunk-LFPYN7LY-WBqmoi8u.js", "/assets/jsx-runtime-D_zvdyIk.js", "/assets/supabase-C_zMzzCB.js", "/assets/useAuth-DPuk-X-i.js", "/assets/useConfirm-CcFvbdLC.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/standalone.mural": { "id": "routes/standalone.mural", "parentId": "routes/standalone", "path": "standalone/mural", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/standalone.mural-CSi4N5Dp.js", "imports": ["/assets/chunk-LFPYN7LY-WBqmoi8u.js", "/assets/jsx-runtime-D_zvdyIk.js", "/assets/supabase-C_zMzzCB.js", "/assets/useAuth-DPuk-X-i.js", "/assets/useConfirm-CcFvbdLC.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/standalone.timeline": { "id": "routes/standalone.timeline", "parentId": "routes/standalone", "path": "standalone/timeline", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/standalone.timeline-DdbhZz_a.js", "imports": ["/assets/chunk-LFPYN7LY-WBqmoi8u.js", "/assets/jsx-runtime-D_zvdyIk.js", "/assets/supabase-C_zMzzCB.js", "/assets/useAuth-DPuk-X-i.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/standalone.relatorios": { "id": "routes/standalone.relatorios", "parentId": "routes/standalone", "path": "standalone/relatorios", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/standalone.relatorios-Cvegj-Ki.js", "imports": ["/assets/chunk-LFPYN7LY-WBqmoi8u.js", "/assets/jsx-runtime-D_zvdyIk.js", "/assets/supabase-C_zMzzCB.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/standalone.minha-conta": { "id": "routes/standalone.minha-conta", "parentId": "routes/standalone", "path": "standalone/minha-conta", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/standalone.minha-conta-CWfCValB.js", "imports": ["/assets/chunk-LFPYN7LY-WBqmoi8u.js", "/assets/jsx-runtime-D_zvdyIk.js", "/assets/supabase-C_zMzzCB.js", "/assets/useAuth-DPuk-X-i.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/standalone.tropa": { "id": "routes/standalone.tropa", "parentId": "routes/standalone", "path": "standalone/tropa", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/standalone.tropa-ARI6WbLf.js", "imports": ["/assets/chunk-LFPYN7LY-WBqmoi8u.js", "/assets/jsx-runtime-D_zvdyIk.js", "/assets/supabase-C_zMzzCB.js", "/assets/useAuth-DPuk-X-i.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 } }, "url": "/assets/manifest-03098130.js", "version": "03098130", "sri": void 0 };
const assetsBuildDirectory = "build\\client";
const basename = "/";
const future = { "unstable_optimizeDeps": false, "unstable_subResourceIntegrity": false, "unstable_trailingSlashAwareDataRequests": false, "unstable_previewServerPrerendering": false, "v8_middleware": false, "v8_splitRouteModules": false, "v8_viteEnvironmentApi": false };
const ssr = true;
const isSpaMode = false;
const prerender = [];
const routeDiscovery = { "mode": "lazy", "manifestPath": "/__manifest" };
const publicPath = "/";
const entry = { module: entryServer };
const routes = {
  "root": {
    id: "root",
    parentId: void 0,
    path: "",
    index: void 0,
    caseSensitive: void 0,
    module: route0
  },
  "routes/redirect-login": {
    id: "routes/redirect-login",
    parentId: "root",
    path: "/",
    index: void 0,
    caseSensitive: void 0,
    module: route1
  },
  "routes/api.teamlogger.$": {
    id: "routes/api.teamlogger.$",
    parentId: "root",
    path: "api/teamlogger/*",
    index: void 0,
    caseSensitive: void 0,
    module: route2
  },
  "routes/standalone": {
    id: "routes/standalone",
    parentId: "root",
    path: void 0,
    index: void 0,
    caseSensitive: void 0,
    module: route3
  },
  "routes/standalone._index": {
    id: "routes/standalone._index",
    parentId: "routes/standalone",
    path: "standalone",
    index: true,
    caseSensitive: void 0,
    module: route4
  },
  "routes/standalone.entrar": {
    id: "routes/standalone.entrar",
    parentId: "routes/standalone",
    path: "standalone/entrar",
    index: void 0,
    caseSensitive: void 0,
    module: route5
  },
  "routes/standalone.home-office": {
    id: "routes/standalone.home-office",
    parentId: "routes/standalone",
    path: "standalone/home-office",
    index: void 0,
    caseSensitive: void 0,
    module: route6
  },
  "routes/standalone.ferias": {
    id: "routes/standalone.ferias",
    parentId: "routes/standalone",
    path: "standalone/ferias",
    index: void 0,
    caseSensitive: void 0,
    module: route7
  },
  "routes/standalone.folha": {
    id: "routes/standalone.folha",
    parentId: "routes/standalone",
    path: "standalone/folha",
    index: void 0,
    caseSensitive: void 0,
    module: route8
  },
  "routes/standalone.ponto": {
    id: "routes/standalone.ponto",
    parentId: "routes/standalone",
    path: "standalone/ponto",
    index: void 0,
    caseSensitive: void 0,
    module: route9
  },
  "routes/standalone.funcionarios": {
    id: "routes/standalone.funcionarios",
    parentId: "routes/standalone",
    path: "standalone/funcionarios",
    index: void 0,
    caseSensitive: void 0,
    module: route10
  },
  "routes/standalone.aprovacoes": {
    id: "routes/standalone.aprovacoes",
    parentId: "routes/standalone",
    path: "standalone/aprovacoes",
    index: void 0,
    caseSensitive: void 0,
    module: route11
  },
  "routes/standalone.mural": {
    id: "routes/standalone.mural",
    parentId: "routes/standalone",
    path: "standalone/mural",
    index: void 0,
    caseSensitive: void 0,
    module: route12
  },
  "routes/standalone.timeline": {
    id: "routes/standalone.timeline",
    parentId: "routes/standalone",
    path: "standalone/timeline",
    index: void 0,
    caseSensitive: void 0,
    module: route13
  },
  "routes/standalone.relatorios": {
    id: "routes/standalone.relatorios",
    parentId: "routes/standalone",
    path: "standalone/relatorios",
    index: void 0,
    caseSensitive: void 0,
    module: route14
  },
  "routes/standalone.minha-conta": {
    id: "routes/standalone.minha-conta",
    parentId: "routes/standalone",
    path: "standalone/minha-conta",
    index: void 0,
    caseSensitive: void 0,
    module: route15
  },
  "routes/standalone.tropa": {
    id: "routes/standalone.tropa",
    parentId: "routes/standalone",
    path: "standalone/tropa",
    index: void 0,
    caseSensitive: void 0,
    module: route16
  }
};
const allowedActionOrigins = false;
export {
  allowedActionOrigins,
  serverManifest as assets,
  assetsBuildDirectory,
  basename,
  entry,
  future,
  isSpaMode,
  prerender,
  publicPath,
  routeDiscovery,
  routes,
  ssr
};
