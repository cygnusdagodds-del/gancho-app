import { Outlet, NavLink, useNavigate, useLocation } from "react-router";
import { useState, useEffect } from "react";
import { useAuth } from "../lib/useAuth";
import { supabase } from "../lib/supabase";
import { ToastProvider } from "../lib/useToast";
import { ConfirmProvider } from "../lib/useConfirm";

// ─── Material Symbol icon helper ───
function MI({ name, size = 20, style = {} }) {
  return (
    <span
      className="material-symbols-outlined"
      style={{ fontSize: size, lineHeight: 1, ...style }}
    >
      {name}
    </span>
  );
}

// ─── Menu config ───
const ADMIN_LINKS = [
  { to: "/standalone", label: "Dashboard", icon: "dashboard", badge: "pendentes" },
  { to: "/standalone/mural", label: "Mural", icon: "chat_bubble_outline", badge: "mural" },
  { to: "/standalone/home-office", label: "Home Office", icon: "home_work" },
  { to: "/standalone/ponto", label: "Métricas Home", icon: "bar_chart" },
  { to: "/standalone/funcionarios", label: "Funcionários", icon: "group" },
  { sep: true },
  { to: "/standalone/ferias", label: "Férias", icon: "event_available" },
  { to: "/standalone/folha", label: "Folha Salarial", icon: "payments" },
  { to: "/standalone/timeline", label: "Timeline", icon: "timeline" },
  { to: "/standalone/relatorios", label: "Relatórios", icon: "assessment" },
  { sep: true },
  { to: "/standalone/tropa", label: "Tropa da CYG", icon: "diversity_3" },
];

const GESTOR_LINKS = [
  { to: "/standalone", label: "Dashboard", icon: "dashboard" },
  { to: "/standalone/mural", label: "Mural", icon: "chat_bubble_outline", badge: "mural" },
  { to: "/standalone/home-office", label: "Home Office", icon: "home_work" },
  { to: "/standalone/ponto", label: "Métricas Home", icon: "bar_chart" },
  { to: "/standalone/ferias", label: "Férias", icon: "event_available" },
  { to: "/standalone/timeline", label: "Timeline", icon: "timeline" },
  { sep: true },
  { to: "/standalone/tropa", label: "Tropa da CYG", icon: "diversity_3" },
];

const FUNC_LINKS = [
  { to: "/standalone/mural", label: "Mural", icon: "chat_bubble_outline", badge: "mural" },
  { to: "/standalone/home-office", label: "Home Office", icon: "home_work" },
  { to: "/standalone/ferias", label: "Férias", icon: "event_available" },
  { to: "/standalone/tropa", label: "Tropa da CYG", icon: "diversity_3" },
];

function isAdminCargo(cargo) {
  return cargo === "admin" || cargo === "rh";
}

function isGestorCargo(cargo) {
  return cargo === "gestor";
}

// ─── Colors (Design System Cygnuss) ───
const C = {
  bg: "#0a0a0a",
  surface: "#1e1e1e",
  hover: "rgba(255,255,255,0.04)",
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
  pink: "#D4789C",
};

// ─── App Switcher config ───
const SISTEMAS = [
  { label: "RH Cygnuss", icon: "badge", href: null, active: true },
  { label: "Suporte", icon: "headset_mic", href: "https://suporte-cygnuss-production.up.railway.app/standalone/entrar" },
  { label: "Financeiro", icon: "attach_money", href: "https://financeiro-cygnuss-production-550d.up.railway.app/standalone-login" },
  { label: "Studio", icon: "palette", href: "https://cygnuss-studio-production.up.railway.app/catalogo" },
  { label: "Logistica", icon: "local_shipping", href: "https://logistica-cygnuss-production.up.railway.app/painel" },
];

export default function StandaloneLayout() {
  const [pinned, setPinned] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [pendentes, setPendentes] = useState(0);
  const [naoLidos, setNaoLidos] = useState(0);
  const [sistemasOpen, setSistemasOpen] = useState(false);
  const [bannerUrgente, setBannerUrgente] = useState(null);
  const { operator, loading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isEntrar = location.pathname.includes("/entrar");
  const expanded = pinned || hovered;
  const sidebarWidth = expanded ? 220 : 64;

  // Buscar badges
  useEffect(() => {
    if (!operator) return;
    async function buscarBadges() {
      if (isAdminCargo(operator.cargo)) {
        const { count } = await supabase
          .from("operadores")
          .select("id", { count: "exact", head: true })
          .eq("status", "pendente");
        setPendentes(count || 0);
      }
      const { data: comunicados } = await supabase.from("comunicados").select("id, titulo, prioridade").eq("ativo", true);
      const { data: lidosData } = await supabase.from("comunicados_lidos").select("comunicado_id").eq("operator_id", operator.id);
      const lidosSet = new Set((lidosData || []).map((l) => l.comunicado_id));
      const naoLidosList = (comunicados || []).filter((c) => !lidosSet.has(c.id));
      setNaoLidos(naoLidosList.length);

      // Banner para comunicado urgente não lido
      const urgente = naoLidosList.find((c) => c.prioridade === "urgente");
      setBannerUrgente(urgente || null);
    }
    buscarBadges();
    const interval = setInterval(buscarBadges, 30000);
    return () => clearInterval(interval);
  }, [operator]);

  useEffect(() => {
    if (!loading && !operator && !isEntrar) navigate("/standalone/entrar", { replace: true });
  }, [loading, operator, isEntrar, navigate]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0a0a0a" }}>
        <p style={{ color: C.textMuted }}>Carregando...</p>
      </div>
    );
  }

  if (!operator) return <Outlet />;

  const admin = isAdminCargo(operator.cargo);
  const gestor = isGestorCargo(operator.cargo);
  const NAV_LINKS = admin ? ADMIN_LINKS : gestor ? GESTOR_LINKS : FUNC_LINKS;

  function getBadgeCount(badge) {
    if (badge === "pendentes") return pendentes;
    if (badge === "mural") return naoLidos;
    return 0;
  }

  return (
    <ToastProvider>
    <ConfirmProvider>
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      {/* Material Symbols font */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
      />

      {/* ─── Sidebar ─── */}
      <aside
        translate="no"
        className="notranslate"
        onMouseEnter={() => !pinned && setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: sidebarWidth,
          background: C.bg,
          color: C.textPrimary,
          display: "flex",
          flexDirection: "column",
          transition: "width 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
          overflow: "hidden",
          position: "fixed",
          top: 0, left: 0, bottom: 0,
          zIndex: 1000,
          boxShadow: !pinned && hovered ? "4px 0 24px rgba(0,0,0,0.3)" : "none",
        }}
      >
        {/* ─── Header ─── */}
        <div style={{
          padding: expanded ? "8px 14px" : "8px 18px",
          borderBottom: `1px solid ${C.border}`,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: expanded ? "space-between" : "center",
          minHeight: 56,
        }}>
          {expanded ? (
            <>
              <span style={{
                fontWeight: 700, fontSize: 16, color: C.textPrimary,
                whiteSpace: "nowrap", cursor: "default", letterSpacing: -0.3,
              }}>
                RH Cygnuss
              </span>
              <button
                onClick={() => setPinned(!pinned)}
                title={pinned ? "Desafixar menu" : "Fixar menu"}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  padding: 4, borderRadius: 6, display: "flex", alignItems: "center",
                  color: pinned ? C.green : C.textDimmed,
                  transition: "all 0.12s",
                }}
              >
                <MI name="push_pin" size={18} style={{ fontVariationSettings: pinned ? "'FILL' 1" : "'FILL' 0" }} />
              </button>
            </>
          ) : (
            <MI name="menu" size={24} style={{ color: "#9ca3af", cursor: "default" }} />
          )}
        </div>

        {/* ─── App Switcher ─── */}
        {expanded && (
          <div style={{ position: "relative", padding: "6px 14px 0" }}>
            <button
              onClick={() => setSistemasOpen(!sistemasOpen)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 8,
                padding: "6px 6px", borderRadius: 6, border: "none",
                background: "transparent", color: C.textDimmed, fontSize: 11, fontWeight: 500,
                cursor: "pointer", transition: "background .12s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#141414"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
              </svg>
              <span>Sistemas</span>
              <svg
                width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="3"
                style={{ marginLeft: "auto", transition: "transform 0.2s ease", transform: sistemasOpen ? "rotate(180deg)" : "rotate(0)" }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {sistemasOpen && (
              <div style={{
                position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
                background: "#141414", borderRadius: 10, padding: 4,
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)", zIndex: 9999,
                border: `1px solid ${C.borderDropdown}`,
              }}>
                {SISTEMAS.map((s, i) => {
                  if (s.active) {
                    return (
                      <div key={i}>
                        <div style={{
                          padding: "7px 10px", borderRadius: 7, background: C.surface,
                          fontSize: 11, fontWeight: 600, color: C.textPrimary,
                          display: "flex", alignItems: "center", gap: 8,
                        }}>
                          <MI name={s.icon} size={16} style={{ color: C.pink }} />
                          {s.label}
                          <span style={{
                            width: 6, height: 6, borderRadius: "50%",
                            background: "#22c55e", marginLeft: "auto",
                          }} />
                        </div>
                        <div style={{ height: 1, background: C.borderDropdown, margin: "3px 6px" }} />
                      </div>
                    );
                  }
                  return (
                    <a
                      key={i}
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "7px 10px", borderRadius: 7,
                        color: C.textMuted, fontSize: 11, fontWeight: 500,
                        textDecoration: "none", transition: "all .12s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = C.surface; e.currentTarget.style.color = C.textSecondary; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.textMuted; }}
                    >
                      <MI name={s.icon} size={16} />
                      {s.label}
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: "auto", opacity: 0.3 }}>
                        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── Nav Items ─── */}
        <nav style={{
          flex: 1, overflowY: "auto", overflowX: "hidden", padding: "8px 0",
          scrollbarWidth: "none", msOverflowStyle: "none",
        }}>
          <style>{`nav::-webkit-scrollbar { display: none; }`}</style>
          {NAV_LINKS.map((link, i) => {
            if (link.sep) {
              return <div key={`sep-${i}`} style={{ height: 1, background: C.border, margin: "8px 12px" }} />;
            }
            const badgeCount = link.badge ? getBadgeCount(link.badge) : 0;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/standalone"}
                style={({ isActive }) => ({
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
                  background: isActive ? C.active : "transparent",
                })}
              >
                {({ isActive }) => (
                  <>
                    {/* Barra verde lateral ativa */}
                    {isActive && (
                      <span style={{
                        position: "absolute", left: -8, top: 6, bottom: 6,
                        width: 3, borderRadius: "0 3px 3px 0",
                        background: C.green,
                      }} />
                    )}
                    <span style={{ display: "flex", alignItems: "center", flexShrink: 0, position: "relative" }}>
                      <MI name={link.icon} size={20} />
                      {/* Badge no ícone (collapsed) */}
                      {!expanded && badgeCount > 0 && (
                        <span style={{
                          position: "absolute", top: -6, right: -6,
                          background: link.badge === "mural" ? "#f59e0b" : "#ef4444",
                          color: "#fff", fontSize: 8, fontWeight: 700,
                          width: 14, height: 14, borderRadius: "50%",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          border: `2px solid ${C.bg}`,
                        }}>
                          {badgeCount}
                        </span>
                      )}
                    </span>
                    {expanded && (
                      <span style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
                        {link.label}
                        {badgeCount > 0 && (
                          <span style={{
                            marginLeft: "auto",
                            background: link.badge === "mural" ? "#f59e0b" : "#ef4444",
                            color: "#fff", fontSize: 10, fontWeight: 700,
                            padding: "1px 6px", borderRadius: 10, lineHeight: "16px",
                          }}>
                            {badgeCount}
                          </span>
                        )}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* ─── Footer (perfil) ─── */}
        <div style={{ borderTop: `1px solid ${C.border}`, padding: expanded ? "12px 14px" : "12px 8px", flexShrink: 0 }}>
          {/* Avatar + nome */}
          <NavLink
            to="/standalone/minha-conta"
            style={{
              display: "flex", alignItems: "center",
              gap: expanded ? 10 : 0, justifyContent: expanded ? "flex-start" : "center",
              padding: "6px 4px", borderRadius: 8,
              textDecoration: "none", color: C.textPrimary, transition: "background 0.12s",
            }}
          >
            <div style={{
              width: expanded ? 34 : 30, height: expanded ? 34 : 30,
              borderRadius: "50%", flexShrink: 0,
              background: operator.avatar_url ? "none" : C.surface,
              display: "flex", alignItems: "center", justifyContent: "center",
              overflow: "hidden", position: "relative",
            }}>
              {operator.avatar_url ? (
                <img src={operator.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
              ) : (
                <span style={{ fontSize: 14, fontWeight: 600, color: C.textMuted }}>
                  {(operator.nome || "?").charAt(0).toUpperCase()}
                </span>
              )}
              <span style={{
                position: "absolute",
                bottom: expanded ? 0 : -1, right: expanded ? 0 : -1,
                width: expanded ? 8 : 7, height: expanded ? 8 : 7,
                borderRadius: "50%", background: C.greenLight,
                border: `2px solid ${C.bg}`,
              }} />
            </div>
            {expanded && (
              <div style={{ overflow: "hidden", minWidth: 0 }}>
                <p style={{
                  fontSize: 12, fontWeight: 500, color: C.textSecondary,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", margin: 0,
                }}>
                  {operator.nome}
                </p>
                <p style={{ fontSize: 10, color: C.greenLight, margin: 0 }}>Online</p>
              </div>
            )}
          </NavLink>

          {/* Botões: Conta / Sair */}
          {expanded && (
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <NavLink
                to="/standalone/minha-conta"
                style={{
                  flex: 1, padding: "6px 0", borderRadius: 6,
                  background: C.surface, color: "#999", fontSize: 10, fontWeight: 500,
                  textAlign: "center", textDecoration: "none",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                  transition: "all 0.12s",
                }}
              >
                <MI name="person" size={13} /> Conta
              </NavLink>
              <button
                onClick={logout}
                style={{
                  padding: "6px 8px", borderRadius: 6, border: "none",
                  background: C.surface, color: C.textFaint, fontSize: 10, fontWeight: 500,
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                  transition: "all 0.12s",
                }}
              >
                <MI name="logout" size={13} /> Sair
              </button>
            </div>
          )}

          {!expanded && (
            <button
              onClick={logout}
              title="Sair"
              style={{
                display: "flex", margin: "8px auto 0", background: "none",
                border: "none", color: C.textFaint, cursor: "pointer", padding: 4,
              }}
            >
              <MI name="logout" size={18} />
            </button>
          )}
        </div>
      </aside>

      {/* ─── Main content ─── */}
      <main style={{
        flex: 1,
        marginLeft: pinned ? sidebarWidth : 64,
        transition: "margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        minHeight: "100vh",
        position: "relative",
      }}>
        {/* Banner urgente */}
        {bannerUrgente && !location.pathname.includes("/mural") && (
          <div
            onClick={() => navigate("/standalone/mural")}
            style={{
              background: "linear-gradient(90deg, #dc2626, #b91c1c)",
              color: "#fff", padding: "12px 24px",
              display: "flex", alignItems: "center", gap: 10,
              cursor: "pointer", fontSize: 13, fontWeight: 600,
              animation: "bannerPulse 2s ease-in-out infinite",
            }}
          >
            <span style={{ fontSize: 18 }}>⚠️</span>
            <span>COMUNICADO URGENTE: {bannerUrgente.titulo}</span>
            <span style={{ marginLeft: "auto", fontSize: 11, opacity: 0.8 }}>Clique para ver →</span>
          </div>
        )}
        <style>{`@keyframes bannerPulse { 0%,100% { opacity:1; } 50% { opacity:0.85; } }`}</style>

        <div style={{ padding: 24 }}>
          <Outlet />
        </div>
      </main>
    </div>
    </ConfirmProvider>
    </ToastProvider>
  );
}
