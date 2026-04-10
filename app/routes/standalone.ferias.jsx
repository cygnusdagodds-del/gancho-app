import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/useAuth";
import { useToast } from "../lib/useToast";
import { useConfirm } from "../lib/useConfirm";

/* ── helpers ─────────────────────────────────────────────── */

function calcDiasUteis(inicio, fim) {
  if (!inicio || !fim) return 0;
  const d1 = new Date(inicio + "T00:00:00");
  const d2 = new Date(fim + "T00:00:00");
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
  return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function mesAtual() {
  const now = new Date();
  return { ano: now.getFullYear(), mes: now.getMonth() };
}

/* ── styles ──────────────────────────────────────────────── */

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
  blueLight: "#dbeafe",
  textPrimary: "#1e293b",
  textSecondary: "#64748b",
  border: "#e2e8f0",
  borderLight: "#f1f5f9",
};

const statusConfig = {
  pendente: { label: "Pendente", bg: COLORS.yellowLight, color: COLORS.yellowDark },
  aprovado: { label: "Aprovado", bg: COLORS.greenLight, color: COLORS.greenDark },
  recusado: { label: "Recusado", bg: COLORS.redLight, color: COLORS.redDark },
};

const tipoLabels = { ferias: "Ferias", abono: "Abono", licenca: "Licenca" };

const inputStyle = {
  width: "100%",
  padding: "8px 12px",
  border: `1px solid #d1d5db`,
  borderRadius: 6,
  fontSize: 14,
  outline: "none",
  marginTop: 4,
  boxSizing: "border-box",
};

const cardStyle = {
  background: COLORS.card,
  borderRadius: 10,
  padding: 20,
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
};

const btnBase = {
  border: "none",
  borderRadius: 6,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  padding: "8px 16px",
};

/* ── component ───────────────────────────────────────────── */

export default function Ferias() {
  const { operator } = useAuth();
  const toast = useToast();
  const { confirm } = useConfirm();
  const isAdmin = operator?.cargo === "admin" || operator?.cargo === "rh" || operator?.cargo === "gestor";

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
    motivo: "",
  });
  const [enviando, setEnviando] = useState(false);

  /* ── data fetching ── */

  const carregar = useCallback(async () => {
    if (!operator) return;
    setCarregando(true);

    if (isAdmin) {
      const { data } = await supabase
        .from("ferias")
        .select("*")
        .order("created_at", { ascending: false });
      if (data) setSolicitacoes(data);
    }

    const { data: minhas } = await supabase
      .from("ferias")
      .select("*")
      .eq("operator_id", operator.id)
      .order("created_at", { ascending: false });
    if (minhas) setMinhasSolicitacoes(minhas);

    setCarregando(false);
  }, [operator, isAdmin]);

  useEffect(() => {
    if (operator) carregar();
  }, [operator, carregar]);

  /* ── computed values ── */

  const diasUsados = minhasSolicitacoes
    .filter((s) => s.status === "aprovado" && s.tipo === "ferias")
    .reduce((sum, s) => sum + (s.dias || 0), 0);
  const diasTotal = 30;
  const diasRestantes = diasTotal - diasUsados;

  const pendentes = isAdmin ? solicitacoes.filter((s) => s.status === "pendente") : [];
  const aprovadosMes = isAdmin
    ? solicitacoes.filter((s) => {
        if (s.status !== "aprovado" || !s.aprovado_em) return false;
        const d = new Date(s.aprovado_em);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
    : [];
  const emFeriasHoje = isAdmin
    ? solicitacoes.filter((s) => {
        if (s.status !== "aprovado") return false;
        const hoje = new Date().toISOString().slice(0, 10);
        return s.data_inicio <= hoje && s.data_fim >= hoje;
      })
    : [];

  const solicitacoesFiltradas = isAdmin
    ? filtroStatus === "todos"
      ? solicitacoes
      : solicitacoes.filter((s) => s.status === filtroStatus)
    : [];

  /* ── actions ── */

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
    const { error } = await supabase.from("ferias").insert({
      operator_id: operator.id,
      operator_nome: operator.nome,
      data_inicio: form.data_inicio,
      data_fim: form.data_fim,
      dias,
      tipo: form.tipo,
      motivo: form.motivo || null,
      status: "pendente",
    });
    if (error) {
      toast.error("Erro ao enviar solicitação: " + error.message);
    } else {
      toast.success("Solicitação enviada com sucesso!");
      setForm({ data_inicio: "", data_fim: "", tipo: "ferias", motivo: "" });
      setMostraForm(false);
      carregar();
    }
    setEnviando(false);
  }

  async function aprovar(id) {
    const { error } = await supabase
      .from("ferias")
      .update({
        status: "aprovado",
        aprovado_por: operator.id,
        aprovado_por_nome: operator.nome,
        aprovado_em: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) toast.error("Erro ao aprovar: " + error.message);
    else { toast.success("Solicitação aprovada!"); carregar(); }
  }

  async function recusar(id) {
    const { error } = await supabase
      .from("ferias")
      .update({
        status: "recusado",
        aprovado_por: operator.id,
        aprovado_por_nome: operator.nome,
        aprovado_em: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) toast.error("Erro ao recusar: " + error.message);
    else { toast.success("Solicitação recusada."); carregar(); }
  }

  async function cancelar(id) {
    const ok = await confirm("Deseja cancelar esta solicitação?", { title: "Cancelar solicitação", confirmText: "Sim, cancelar", danger: true });
    if (!ok) return;
    const { error } = await supabase.from("ferias").delete().eq("id", id);
    if (error) toast.error("Erro ao cancelar: " + error.message);
    else { toast.success("Solicitação cancelada."); carregar(); }
  }

  /* ── calendar helpers ── */

  function getDiasDoMes(ano, mes) {
    return new Date(ano, mes + 1, 0).getDate();
  }

  function getPrimeiroDiaSemana(ano, mes) {
    return new Date(ano, mes, 1).getDay();
  }

  function navegarMes(dir) {
    setCalMes((prev) => {
      let m = prev.mes + dir;
      let a = prev.ano;
      if (m < 0) { m = 11; a--; }
      if (m > 11) { m = 0; a++; }
      return { ano: a, mes: m };
    });
  }

  const mesesNome = ["Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  function feriasNoMes() {
    if (!isAdmin) return [];
    const anoStr = String(calMes.ano);
    const mesStr = String(calMes.mes + 1).padStart(2, "0");
    const mesPrefix = `${anoStr}-${mesStr}`;
    const primeiroDia = `${mesPrefix}-01`;
    const ultimoDia = `${mesPrefix}-${String(getDiasDoMes(calMes.ano, calMes.mes)).padStart(2, "0")}`;
    return solicitacoes.filter(
      (s) => s.status === "aprovado" && s.data_inicio <= ultimoDia && s.data_fim >= primeiroDia
    );
  }

  /* ── render helpers ── */

  function StatusBadge({ status }) {
    const cfg = statusConfig[status] || statusConfig.pendente;
    return (
      <span style={{ background: cfg.bg, color: cfg.color, padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
        {cfg.label}
      </span>
    );
  }

  function SummaryCard({ label, value, accent }) {
    return (
      <div style={{ ...cardStyle, borderLeft: `4px solid ${accent}`, padding: 16 }}>
        <p style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 }}>{label}</p>
        <p style={{ fontSize: 26, fontWeight: 700, color: accent, margin: 0 }}>{value}</p>
      </div>
    );
  }

  /* ── loading state ── */

  if (carregando && !solicitacoes.length && !minhasSolicitacoes.length) {
    return (
      <div style={{ background: COLORS.bg, minHeight: "100vh", padding: 32 }}>
        <p style={{ color: COLORS.textSecondary, textAlign: "center", marginTop: 60 }}>Carregando...</p>
      </div>
    );
  }

  /* ────────────────────────────────────────────────────────
     EMPLOYEE VIEW
     ──────────────────────────────────────────────────────── */

  if (!isAdmin) {
    const diasCalc = calcDiasUteis(form.data_inicio, form.data_fim);
    return (
      <div style={{ background: COLORS.bg, minHeight: "100vh", padding: 32 }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: COLORS.textPrimary, margin: 0 }}>Ferias</h1>
          <button
            onClick={() => setMostraForm(!mostraForm)}
            style={{ ...btnBase, background: mostraForm ? COLORS.textSecondary : COLORS.green, color: "#fff" }}
          >
            {mostraForm ? "Cancelar" : "+ Nova Solicitacao"}
          </button>
        </div>

        {/* Balance card */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14, marginBottom: 24 }}>
          <SummaryCard label="Direito Total" value={`${diasTotal} dias`} accent={COLORS.blue} />
          <SummaryCard label="Dias Usados" value={`${diasUsados} dias`} accent={COLORS.red} />
          <SummaryCard label="Dias Restantes" value={`${diasRestantes} dias`} accent={COLORS.green} />
        </div>

        {/* Request form */}
        {mostraForm && (
          <form onSubmit={enviarSolicitacao} style={{ ...cardStyle, marginBottom: 24, display: "flex", flexDirection: "column", gap: 14 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: COLORS.textPrimary }}>Nova Solicitacao</h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: COLORS.textPrimary }}>Data Inicio</label>
                <input
                  type="date"
                  value={form.data_inicio}
                  onChange={(e) => setForm({ ...form, data_inicio: e.target.value })}
                  required
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: COLORS.textPrimary }}>Data Fim</label>
                <input
                  type="date"
                  value={form.data_fim}
                  onChange={(e) => setForm({ ...form, data_fim: e.target.value })}
                  required
                  style={inputStyle}
                />
              </div>
            </div>

            {form.data_inicio && form.data_fim && (
              <p style={{ fontSize: 13, color: COLORS.textSecondary, margin: 0 }}>
                Dias uteis: <strong style={{ color: COLORS.textPrimary }}>{diasCalc}</strong>
                {form.tipo === "ferias" && diasCalc > 0 && diasCalc < 5 && (
                  <span style={{ color: COLORS.red, marginLeft: 8 }}>(minimo 5 dias para ferias)</span>
                )}
              </p>
            )}

            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: COLORS.textPrimary }}>Tipo</label>
              <select
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                style={{ ...inputStyle, background: "#fff" }}
              >
                <option value="ferias">Ferias</option>
                <option value="abono">Abono</option>
                <option value="licenca">Licenca</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: COLORS.textPrimary }}>Motivo (opcional)</label>
              <textarea
                value={form.motivo}
                onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                rows={3}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </div>

            <button
              type="submit"
              disabled={enviando}
              style={{
                ...btnBase,
                background: enviando ? "#86efac" : COLORS.green,
                color: "#fff",
                padding: "10px 20px",
                alignSelf: "flex-start",
                cursor: enviando ? "not-allowed" : "pointer",
              }}
            >
              {enviando ? "Enviando..." : "Enviar Solicitacao"}
            </button>
          </form>
        )}

        {/* My requests table */}
        <div style={{ ...cardStyle, padding: 0, overflow: "auto" }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, padding: "16px 20px", margin: 0, borderBottom: `1px solid ${COLORS.border}`, color: COLORS.textPrimary }}>
            Minhas Solicitacoes
          </h3>
          {minhasSolicitacoes.length === 0 ? (
            <p style={{ padding: 24, color: COLORS.textSecondary, textAlign: "center" }}>Nenhuma solicitacao encontrada.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                  {["Tipo", "Inicio", "Fim", "Dias", "Status", "Motivo", ""].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, fontWeight: 600, color: COLORS.textSecondary, textTransform: "uppercase" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {minhasSolicitacoes.map((s) => (
                  <tr key={s.id} style={{ borderBottom: `1px solid ${COLORS.borderLight}` }}>
                    <td style={{ padding: "10px 16px", fontSize: 14, fontWeight: 500 }}>{tipoLabels[s.tipo] || s.tipo}</td>
                    <td style={{ padding: "10px 16px", fontSize: 14, color: COLORS.textSecondary }}>{fmtDate(s.data_inicio)}</td>
                    <td style={{ padding: "10px 16px", fontSize: 14, color: COLORS.textSecondary }}>{fmtDate(s.data_fim)}</td>
                    <td style={{ padding: "10px 16px", fontSize: 14, color: COLORS.textSecondary }}>{s.dias}</td>
                    <td style={{ padding: "10px 16px" }}><StatusBadge status={s.status} /></td>
                    <td style={{ padding: "10px 16px", fontSize: 13, color: COLORS.textSecondary, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s.motivo || "—"}
                    </td>
                    <td style={{ padding: "10px 16px" }}>
                      {s.status === "pendente" && (
                        <button
                          onClick={() => cancelar(s.id)}
                          style={{ ...btnBase, background: COLORS.redLight, color: COLORS.redDark, padding: "4px 10px", fontSize: 12 }}
                        >
                          Cancelar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  /* ────────────────────────────────────────────────────────
     ADMIN VIEW
     ──────────────────────────────────────────────────────── */

  const feriasCalendario = feriasNoMes();
  const diasNoMes = getDiasDoMes(calMes.ano, calMes.mes);
  const primeiroDia = getPrimeiroDiaSemana(calMes.ano, calMes.mes);

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", padding: 32 }}>
      {/* Header */}
      <h1 style={{ fontSize: 22, fontWeight: 700, color: COLORS.textPrimary, margin: 0, marginBottom: 24 }}>Ferias — Gestao</h1>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14, marginBottom: 28 }}>
        <SummaryCard label="Solicitacoes Pendentes" value={pendentes.length} accent={COLORS.yellow} />
        <SummaryCard label="Aprovadas este Mes" value={aprovadosMes.length} accent={COLORS.green} />
        <SummaryCard label="Em Ferias Hoje" value={emFeriasHoje.length} accent={COLORS.blue} />
      </div>

      {/* Pending requests */}
      {pendentes.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: COLORS.textPrimary, marginBottom: 14 }}>Solicitacoes Pendentes</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
            {pendentes.map((s) => (
              <div key={s.id} style={{ ...cardStyle, borderLeft: `4px solid ${COLORS.yellow}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 600, color: COLORS.textPrimary, margin: 0 }}>{s.operator_nome || "—"}</p>
                    <p style={{ fontSize: 12, color: COLORS.textSecondary, margin: "2px 0 0" }}>{tipoLabels[s.tipo] || s.tipo}</p>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
                  <div>
                    <p style={{ fontSize: 11, color: COLORS.textSecondary, margin: 0 }}>Inicio</p>
                    <p style={{ fontSize: 14, fontWeight: 500, margin: 0, color: COLORS.textPrimary }}>{fmtDate(s.data_inicio)}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 11, color: COLORS.textSecondary, margin: 0 }}>Fim</p>
                    <p style={{ fontSize: 14, fontWeight: 500, margin: 0, color: COLORS.textPrimary }}>{fmtDate(s.data_fim)}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 11, color: COLORS.textSecondary, margin: 0 }}>Dias</p>
                    <p style={{ fontSize: 14, fontWeight: 500, margin: 0, color: COLORS.textPrimary }}>{s.dias}</p>
                  </div>
                </div>
                {s.motivo && (
                  <p style={{ fontSize: 13, color: COLORS.textSecondary, margin: "0 0 12px", fontStyle: "italic" }}>"{s.motivo}"</p>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => aprovar(s.id)} style={{ ...btnBase, background: COLORS.green, color: "#fff", flex: 1 }}>
                    Aprovar
                  </button>
                  <button onClick={() => recusar(s.id)} style={{ ...btnBase, background: COLORS.red, color: "#fff", flex: 1 }}>
                    Recusar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Minhas Férias (gestor também solicita) ── */}
      {(() => {
        const diasCalc = calcDiasUteis(form.data_inicio, form.data_fim);
        return (
          <div style={{ ...cardStyle, marginBottom: 28, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: COLORS.textPrimary, margin: 0 }}>Minhas Ferias</h2>
              <button
                onClick={() => setMostraForm(!mostraForm)}
                style={{ ...btnBase, background: mostraForm ? COLORS.textSecondary : COLORS.green, color: "#fff", padding: "6px 14px", fontSize: 12 }}
              >
                {mostraForm ? "Cancelar" : "+ Solicitar"}
              </button>
            </div>

            {/* Saldo */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
              <div style={{ background: "#eff6ff", borderRadius: 8, padding: "8px 12px" }}>
                <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>Direito</p>
                <p style={{ fontSize: 18, fontWeight: 700, color: COLORS.blue, margin: 0 }}>{diasTotal} dias</p>
              </div>
              <div style={{ background: "#fef2f2", borderRadius: 8, padding: "8px 12px" }}>
                <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>Usados</p>
                <p style={{ fontSize: 18, fontWeight: 700, color: COLORS.red, margin: 0 }}>{diasUsados} dias</p>
              </div>
              <div style={{ background: "#f0fdf4", borderRadius: 8, padding: "8px 12px" }}>
                <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>Restantes</p>
                <p style={{ fontSize: 18, fontWeight: 700, color: COLORS.green, margin: 0 }}>{diasRestantes} dias</p>
              </div>
            </div>

            {/* Form */}
            {mostraForm && (
              <form onSubmit={enviarSolicitacao} style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16, padding: 16, background: "#f8fafc", borderRadius: 8 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, color: COLORS.textPrimary }}>Data Inicio</label>
                    <input type="date" value={form.data_inicio} onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} required style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, color: COLORS.textPrimary }}>Data Fim</label>
                    <input type="date" value={form.data_fim} onChange={(e) => setForm({ ...form, data_fim: e.target.value })} required style={inputStyle} />
                  </div>
                </div>
                {form.data_inicio && form.data_fim && (
                  <p style={{ fontSize: 12, color: COLORS.textSecondary, margin: 0 }}>
                    Dias uteis: <strong>{diasCalc}</strong>
                    {form.tipo === "ferias" && diasCalc > 0 && diasCalc < 5 && (
                      <span style={{ color: COLORS.red, marginLeft: 8 }}>(minimo 5 dias)</span>
                    )}
                  </p>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, color: COLORS.textPrimary }}>Tipo</label>
                    <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} style={{ ...inputStyle, background: "#fff" }}>
                      <option value="ferias">Ferias</option>
                      <option value="abono">Abono</option>
                      <option value="licenca">Licenca</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, color: COLORS.textPrimary }}>Motivo (opcional)</label>
                    <input type="text" value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} style={inputStyle} />
                  </div>
                </div>
                <button type="submit" disabled={enviando} style={{ ...btnBase, background: COLORS.green, color: "#fff", padding: "8px 18px", alignSelf: "flex-start", fontSize: 13 }}>
                  {enviando ? "Enviando..." : "Enviar Solicitacao"}
                </button>
              </form>
            )}

            {/* Minhas solicitações */}
            {minhasSolicitacoes.length > 0 && (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${COLORS.border}` }}>
                    {["Tipo", "Inicio", "Fim", "Dias", "Status", ""].map((h) => (
                      <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontSize: 11, fontWeight: 600, color: COLORS.textSecondary, textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {minhasSolicitacoes.map((s) => (
                    <tr key={s.id} style={{ borderBottom: `1px solid ${COLORS.borderLight}` }}>
                      <td style={{ padding: "8px 12px", fontWeight: 500 }}>{tipoLabels[s.tipo] || s.tipo}</td>
                      <td style={{ padding: "8px 12px", color: COLORS.textSecondary }}>{fmtDate(s.data_inicio)}</td>
                      <td style={{ padding: "8px 12px", color: COLORS.textSecondary }}>{fmtDate(s.data_fim)}</td>
                      <td style={{ padding: "8px 12px", color: COLORS.textSecondary }}>{s.dias}</td>
                      <td style={{ padding: "8px 12px" }}><StatusBadge status={s.status} /></td>
                      <td style={{ padding: "8px 12px" }}>
                        {s.status === "pendente" && (
                          <button onClick={() => cancelar(s.id)} style={{ ...btnBase, background: COLORS.redLight, color: COLORS.redDark, padding: "3px 8px", fontSize: 11 }}>
                            Cancelar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      })()}

      {/* All requests table */}
      <div style={{ ...cardStyle, padding: 0, overflow: "auto", marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: `1px solid ${COLORS.border}` }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: COLORS.textPrimary, margin: 0 }}>Todas as Solicitacoes</h2>
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            style={{ padding: "6px 12px", border: `1px solid ${COLORS.border}`, borderRadius: 6, fontSize: 13, outline: "none", background: "#fff" }}
          >
            <option value="todos">Todos os status</option>
            <option value="pendente">Pendente</option>
            <option value="aprovado">Aprovado</option>
            <option value="recusado">Recusado</option>
          </select>
        </div>
        {solicitacoesFiltradas.length === 0 ? (
          <p style={{ padding: 24, color: COLORS.textSecondary, textAlign: "center" }}>Nenhuma solicitacao encontrada.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                {["Funcionario", "Tipo", "Inicio", "Fim", "Dias", "Status", "Motivo", "Aprovado por", "Acoes"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, fontWeight: 600, color: COLORS.textSecondary, textTransform: "uppercase" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {solicitacoesFiltradas.map((s) => (
                <tr key={s.id} style={{ borderBottom: `1px solid ${COLORS.borderLight}` }}>
                  <td style={{ padding: "10px 16px", fontSize: 14, fontWeight: 500, color: COLORS.textPrimary }}>{s.operator_nome || "—"}</td>
                  <td style={{ padding: "10px 16px", fontSize: 13, color: COLORS.textSecondary }}>{tipoLabels[s.tipo] || s.tipo}</td>
                  <td style={{ padding: "10px 16px", fontSize: 13, color: COLORS.textSecondary }}>{fmtDate(s.data_inicio)}</td>
                  <td style={{ padding: "10px 16px", fontSize: 13, color: COLORS.textSecondary }}>{fmtDate(s.data_fim)}</td>
                  <td style={{ padding: "10px 16px", fontSize: 13, color: COLORS.textSecondary }}>{s.dias}</td>
                  <td style={{ padding: "10px 16px" }}><StatusBadge status={s.status} /></td>
                  <td style={{ padding: "10px 16px", fontSize: 12, color: COLORS.textSecondary, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.motivo || "—"}
                  </td>
                  <td style={{ padding: "10px 16px", fontSize: 12, color: COLORS.textSecondary }}>
                    {s.aprovado_por_nome ? `${s.aprovado_por_nome} (${fmtDateTime(s.aprovado_em)})` : "—"}
                  </td>
                  <td style={{ padding: "10px 16px" }}>
                    {s.status === "pendente" && (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => aprovar(s.id)} style={{ ...btnBase, background: COLORS.greenLight, color: COLORS.greenDark, padding: "4px 10px", fontSize: 12 }}>
                          Aprovar
                        </button>
                        <button onClick={() => recusar(s.id)} style={{ ...btnBase, background: COLORS.redLight, color: COLORS.redDark, padding: "4px 10px", fontSize: 12 }}>
                          Recusar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Vacation calendar */}
      <div style={{ ...cardStyle, padding: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: `1px solid ${COLORS.border}` }}>
          <button onClick={() => navegarMes(-1)} style={{ ...btnBase, background: COLORS.borderLight, color: COLORS.textPrimary, padding: "6px 14px" }}>
            &larr;
          </button>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: COLORS.textPrimary, margin: 0 }}>
            {mesesNome[calMes.mes]} {calMes.ano}
          </h2>
          <button onClick={() => navegarMes(1)} style={{ ...btnBase, background: COLORS.borderLight, color: COLORS.textPrimary, padding: "6px 14px" }}>
            &rarr;
          </button>
        </div>

        <div style={{ padding: 20 }}>
          {/* Day-of-week headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"].map((d) => (
              <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: COLORS.textSecondary, padding: "4px 0" }}>
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
            {/* Empty cells before first day */}
            {Array.from({ length: primeiroDia }).map((_, i) => (
              <div key={`empty-${i}`} style={{ minHeight: 60 }} />
            ))}

            {/* Day cells */}
            {Array.from({ length: diasNoMes }).map((_, i) => {
              const dia = i + 1;
              const diaStr = `${calMes.ano}-${String(calMes.mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
              const dow = new Date(calMes.ano, calMes.mes, dia).getDay();
              const isWeekend = dow === 0 || dow === 6;
              const pessoasNoDia = feriasCalendario.filter(
                (s) => s.data_inicio <= diaStr && s.data_fim >= diaStr
              );

              return (
                <div
                  key={dia}
                  style={{
                    minHeight: 60,
                    border: `1px solid ${COLORS.borderLight}`,
                    borderRadius: 6,
                    padding: 4,
                    background: isWeekend ? "#f8fafc" : "#fff",
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 500, color: isWeekend ? COLORS.textSecondary : COLORS.textPrimary, marginBottom: 2 }}>
                    {dia}
                  </div>
                  {pessoasNoDia.map((s) => (
                    <div
                      key={s.id}
                      style={{
                        background: COLORS.green,
                        color: "#fff",
                        fontSize: 10,
                        fontWeight: 500,
                        padding: "1px 4px",
                        borderRadius: 3,
                        marginBottom: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {s.operator_nome || "—"}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
