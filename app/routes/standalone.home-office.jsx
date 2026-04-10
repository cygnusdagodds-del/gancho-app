import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/useAuth";

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

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isWeekday(date) {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

export default function HomeOffice() {
  const { operator } = useAuth();
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth());
  const [escalas, setEscalas] = useState({});
  const [bloqueados, setBloqueados] = useState([]);
  const [teamloggerData, setTeamloggerData] = useState({}); // { "2026-03-20": { "Danielly": { totalHours, atividade } } }
  const [carregando, setCarregando] = useState(true);
  const [modalEscalar, setModalEscalar] = useState(null); // { dateStr, date, acao: "escalar"|"cancelar", registroId? }
  const [modalBloquear, setModalBloquear] = useState(null); // { dateStr, date }
  const [motivoBloqueio, setMotivoBloqueio] = useState("");
  const [bloqueioInfo, setBloqueioInfo] = useState({}); // { "2026-03-20": { reason: "Reunião" } }

  const isAdmin = operator?.cargo === "admin" || operator?.cargo === "rh" || operator?.cargo === "gestor";

  const mesNome = new Date(ano, mes).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const dias = getDiasDoMes(ano, mes);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const mesStr = String(mes + 1).padStart(2, "0");
    const inicioMes = `${ano}-${mesStr}-01`;
    const ultimoDia = new Date(ano, mes + 1, 0).getDate();
    const fimMes = `${ano}-${mesStr}-${ultimoDia}`;

    // 1. Buscar escalas do mês
    const { data: schedData } = await supabase
      .from("home_office_schedule")
      .select("id, date, operator_id, operator_name, operator_email")
      .gte("date", inicioMes)
      .lte("date", fimMes);

    // 2. Buscar dias bloqueados (com motivo)
    const { data: blockData } = await supabase
      .from("home_office_blocked")
      .select("date, reason, blocked_by")
      .gte("date", inicioMes)
      .lte("date", fimMes);

    // Agrupar escalas por data
    const agrupado = {};
    const diasComEscala = new Set();
    if (schedData) {
      for (const s of schedData) {
        if (!agrupado[s.date]) agrupado[s.date] = [];
        agrupado[s.date].push({
          id: s.id,
          operator_id: s.operator_id,
          operator_name: s.operator_name || "—",
          operator_email: s.operator_email || "",
        });
        diasComEscala.add(s.date);
      }
    }
    setEscalas(agrupado);
    // Separar feriados (blocked_by = null) de bloqueios manuais (blocked_by != null)
    const bloqueiosDiretos = (blockData || []).map((b) => b.date);
    const bInfo = {};
    if (blockData) {
      for (const b of blockData) {
        bInfo[b.date] = { reason: b.reason || "" };
      }
    }

    // Expandir APENAS feriados (blocked_by = null) para a semana toda
    const bloqueiosExpandidos = new Set(bloqueiosDiretos);
    const feriados = (blockData || []).filter((b) => !b.blocked_by);
    for (const feriado of feriados) {
      const d = new Date(feriado.date + "T12:00:00");
      const dow = d.getDay();
      if (dow >= 1 && dow <= 5) {
        const seg = new Date(d);
        seg.setDate(d.getDate() - (dow - 1));
        for (let i = 0; i < 5; i++) {
          const dia = new Date(seg);
          dia.setDate(seg.getDate() + i);
          const dStr = formatDate(dia);
          bloqueiosExpandidos.add(dStr);
          if (!bInfo[dStr]) {
            bInfo[dStr] = { reason: `Semana bloqueada (${feriado.reason || "feriado"} ${feriado.date.split("-").reverse().join("/")})`, auto: true };
          }
        }
      }
    }

    setBloqueados([...bloqueiosExpandidos]);
    setBloqueioInfo(bInfo);

    // 3-4. Buscar dados do TeamLogger (só admin/gestor)
    if (isAdmin) {
      let tlEmailToName = {};
      try {
        const usersRes = await fetch("/api/teamlogger/list_users");
        const usersJson = await usersRes.json();
        const usersList = Array.isArray(usersJson) ? usersJson : [];
        for (const u of usersList) {
          if (u.email) tlEmailToName[u.email.toLowerCase()] = u.name || u.username;
        }
      } catch {}

      const hojeStr = formatDate(hoje);
      const tlData = {};
      const diasParaBuscar = [...diasComEscala].filter((d) => d <= hojeStr);

      const chunks = [];
      for (let i = 0; i < diasParaBuscar.length; i += 5) {
        chunks.push(diasParaBuscar.slice(i, i + 5));
      }

      for (const chunk of chunks) {
        const promises = chunk.map(async (dateStr) => {
          const [, m, d] = dateStr.split("-").map(Number);
          const y = Number(dateStr.split("-")[0]);
          try {
            const res = await fetch(
              `/api/teamlogger/punch_report?year=${y}&month=${m}&day=${d}&timezoneOffsetMinutes=-180`
            );
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
                saida: presente ? p.punchOutLocalTime : null,
              };
            }
            tlData[dateStr] = dayData;
          } catch {}
        });
        await Promise.all(promises);
      }

      setTeamloggerData({ days: tlData, emailToName: tlEmailToName });
    }
    setCarregando(false);
  }, [ano, mes]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  function abrirModalEscala(date) {
    if (!operator) return;
    const dateStr = formatDate(date);
    const diaEscalas = escalas[dateStr] || [];
    const meuRegistro = diaEscalas.find((e) => e.operator_id === operator.id);

    if (meuRegistro) {
      setModalEscalar({ dateStr, date, acao: "cancelar", registroId: meuRegistro.id });
    } else {
      if (diaEscalas.length >= MAX_POR_DIA) return;
      setModalEscalar({ dateStr, date, acao: "escalar" });
    }
  }

  const [erroEscala, setErroEscala] = useState("");

  async function confirmarEscala() {
    if (!modalEscalar || !operator) return;
    setErroEscala("");

    if (modalEscalar.acao === "cancelar") {
      const { error } = await supabase.from("home_office_schedule").delete().eq("id", modalEscalar.registroId);
      if (error) { setErroEscala(error.message); return; }
    } else {
      // Verificar limite no momento do insert (evita race condition)
      const { count } = await supabase
        .from("home_office_schedule")
        .select("id", { count: "exact", head: true })
        .eq("date", modalEscalar.dateStr);

      if (count >= MAX_POR_DIA) {
        setErroEscala("Este dia já atingiu o limite de " + MAX_POR_DIA + " pessoas.");
        return;
      }

      const { error } = await supabase.from("home_office_schedule").insert({
        date: modalEscalar.dateStr,
        operator_id: operator.id,
        operator_name: operator.nome,
        operator_email: operator.teamlogger_email || operator.email,
      });
      if (error) { setErroEscala(error.message); return; }
    }

    setModalEscalar(null);
    carregar();
  }

  async function bloquearDia() {
    if (!modalBloquear || !motivoBloqueio.trim()) return;
    const dateStr = modalBloquear.dateStr;

    // Remover escalas existentes nesse dia
    const diaEscalas = escalas[dateStr] || [];
    for (const e of diaEscalas) {
      await supabase.from("home_office_schedule").delete().eq("id", e.id);
    }

    await supabase.from("home_office_blocked").insert({
      date: dateStr,
      reason: motivoBloqueio.trim(),
      blocked_by: operator?.id,
    });

    setModalBloquear(null);
    setMotivoBloqueio("");
    carregar();
  }

  async function desbloquearDia(dateStr) {
    if (!isAdmin) return;
    await supabase.from("home_office_blocked").delete().eq("date", dateStr);
    carregar();
  }

  function mudarMes(delta) {
    let novoMes = mes + delta;
    let novoAno = ano;
    if (novoMes < 0) { novoMes = 11; novoAno--; }
    if (novoMes > 11) { novoMes = 0; novoAno++; }
    setMes(novoMes);
    setAno(novoAno);
  }

  function getStatusTeamlogger(dateStr, operatorName, operatorEmail) {
    const days = teamloggerData?.days || {};
    const emailToName = teamloggerData?.emailToName || {};
    const dayData = days[dateStr];
    if (!dayData) return null; // Dia futuro ou sem dados

    // 1. Tentar cruzar por email → nome do TeamLogger
    if (operatorEmail) {
      const tlName = emailToName[operatorEmail.toLowerCase()];
      if (tlName && dayData[tlName]) return dayData[tlName];
    }

    // 2. Fallback: cruzar por nome direto
    if (dayData[operatorName]) return dayData[operatorName];

    return { presente: false, totalHours: 0 };
  }

  const hojeStr = formatDate(hoje);

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Home Office</h1>

      {/* Navegação do mês */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <button onClick={() => mudarMes(-1)} style={btnNavStyle}>← Anterior</button>
        <span style={{ fontSize: 16, fontWeight: 600, textTransform: "capitalize", minWidth: 180, textAlign: "center" }}>
          {mesNome}
        </span>
        <button onClick={() => mudarMes(1)} style={btnNavStyle}>Próximo →</button>
      </div>

      {/* Legenda */}
      <div style={{ display: "flex", gap: 16, marginBottom: 16, fontSize: 13, flexWrap: "wrap" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: "#dbeafe", display: "inline-block" }} /> Vaga disponível
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: "#bbf7d0", display: "inline-block" }} /> Você escalado
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: "#fecaca", display: "inline-block" }} /> Lotado / Bloqueado
        </span>
        {isAdmin && (
          <>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: "#22c55e", display: "inline-block" }} /> TeamLogger ativo
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: "#ef4444", display: "inline-block" }} /> Não ligou TeamLogger
            </span>
          </>
        )}
      </div>

      {carregando ? (
        <p style={{ color: "#94a3b8" }}>Carregando calendário...</p>
      ) : (
        <div style={{ background: "#fff", borderRadius: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", padding: 16, overflow: "auto" }}>
          {/* Cabeçalho dias da semana */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
            {DIAS_SEMANA.map((d) => (
              <div key={d} style={{ textAlign: "center", fontSize: 12, fontWeight: 600, color: "#64748b", padding: 8 }}>
                {d}
              </div>
            ))}
          </div>

          {/* Grid do calendário */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
            {dias.map((dia, i) => {
              if (!dia) {
                return <div key={`empty-${i}`} style={{ minHeight: 90 }} />;
              }

              const dateStr = formatDate(dia);
              const weekday = isWeekday(dia);
              const blocked = bloqueados.includes(dateStr);
              const diaEscalas = escalas[dateStr] || [];
              const meuRegistro = diaEscalas.find((e) => e.operator_id === operator?.id);
              const lotado = diaEscalas.length >= MAX_POR_DIA;
              const passado = dateStr < hojeStr;
              const ehHoje = dateStr === hojeStr;

              let bg = "#f8fafc";
              if (!weekday) bg = "#f1f5f9";
              else if (blocked) bg = "#fef2f2";
              else if (meuRegistro) bg = "#f0fdf4";
              else if (lotado) bg = "#fff7ed";

              const clicavel = weekday && !blocked && !passado && !ehHoje ? (meuRegistro || !lotado) : (ehHoje && weekday && !blocked && (meuRegistro || !lotado));

              return (
                <div
                  key={dateStr}
                  onClick={() => clicavel && abrirModalEscala(dia)}
                  style={{
                    minHeight: 90,
                    background: bg,
                    borderRadius: 6,
                    padding: 8,
                    cursor: clicavel ? "pointer" : "default",
                    border: meuRegistro ? "2px solid #22c55e" : "1px solid #e2e8f0",
                    opacity: !weekday ? 0.4 : (passado ? 0.85 : 1),
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: ehHoje ? "#1e40af" : "#374151" }}>
                      {dia.getDate()}
                    </span>
                    {isAdmin && weekday && !passado && (
                      <button
                        onClick={(ev) => {
                          ev.stopPropagation();
                          if (blocked) {
                            desbloquearDia(dateStr);
                          } else {
                            setModalBloquear({ dateStr, date: dia });
                            setMotivoBloqueio("");
                          }
                        }}
                        title={blocked ? `Desbloquear (${bloqueioInfo[dateStr]?.reason || ""})` : "Bloquear dia"}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontSize: 14,
                          padding: 0,
                          lineHeight: 1,
                          opacity: blocked ? 1 : 0.4,
                        }}
                      >
                        {blocked ? "🔒" : "🔓"}
                      </button>
                    )}
                  </div>

                  {blocked && (
                    <div>
                      <span style={{ fontSize: 11, color: "#dc2626", fontWeight: 700 }}>BLOQUEADO</span>
                      {bloqueioInfo[dateStr]?.reason && (
                        <div style={{ fontSize: 13, color: "#991b1b", fontWeight: 600, marginTop: 2 }}>
                          {bloqueioInfo[dateStr].reason}
                        </div>
                      )}
                    </div>
                  )}

                  {!blocked && weekday && diaEscalas.map((e) => {
                    const tlStatus = isAdmin && (passado || ehHoje) ? getStatusTeamlogger(dateStr, e.operator_name, e.operator_email) : null;

                    return (
                      <div key={e.id} style={{
                        fontSize: 11,
                        padding: "2px 6px",
                        borderRadius: 4,
                        marginBottom: 3,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        background: e.operator_id === operator?.id ? "#bbf7d0" : "#dbeafe",
                        color: e.operator_id === operator?.id ? "#166534" : "#1e40af",
                        fontWeight: 500,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}>
                        {/* Bolinha de status TeamLogger (só admin/gestor) */}
                        {tlStatus && (
                          <span
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: "50%",
                              background: tlStatus.presente ? "#22c55e" : "#ef4444",
                              display: "inline-block",
                              flexShrink: 0,
                            }}
                            title={tlStatus.presente
                              ? `TeamLogger: ${tlStatus.totalHours.toFixed(1).replace(".", ",")}h trabalhadas`
                              : "Não ligou o TeamLogger"
                            }
                          />
                        )}
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                          {e.operator_name}
                        </span>
                      </div>
                    );
                  })}

                  {/* Info de horas para dias passados com escala (só admin/gestor) */}
                  {isAdmin && !blocked && weekday && (passado || ehHoje) && diaEscalas.length > 0 && (
                    <div style={{ marginTop: 2 }}>
                      {diaEscalas.map((e) => {
                        const tlStatus = getStatusTeamlogger(dateStr, e.operator_name, e.operator_email);
                        if (!tlStatus) return null;

                        if (tlStatus.presente) {
                          const pct = Math.min(Math.round((tlStatus.totalHours / 8) * 100), 100);
                          return (
                            <div key={`h-${e.id}`} style={{ fontSize: 9, color: "#64748b", marginBottom: 1 }}>
                              <div style={{
                                width: "100%", height: 3, borderRadius: 2,
                                background: "#e5e7eb", overflow: "hidden", marginBottom: 1,
                              }}>
                                <div style={{
                                  width: `${pct}%`, height: "100%", borderRadius: 2,
                                  background: pct >= 80 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#ef4444",
                                }} />
                              </div>
                              {tlStatus.totalHours.toFixed(1).replace(".", ",")}h
                              {tlStatus.entrada && ` (${tlStatus.entrada}`}
                              {tlStatus.saida && `-${tlStatus.saida})`}
                            </div>
                          );
                        } else {
                          return (
                            <div key={`h-${e.id}`} style={{ fontSize: 9, color: "#ef4444", fontWeight: 600 }}>
                              0% — não ligou
                            </div>
                          );
                        }
                      })}
                    </div>
                  )}

                  {!blocked && weekday && !passado && (
                    <div style={{ marginTop: 4 }}>
                      {meuRegistro ? (
                        <div
                          onClick={(ev) => { ev.stopPropagation(); abrirModalEscala(dia); }}
                          style={{
                            fontSize: 10, color: "#dc2626", cursor: "pointer",
                            background: "#fef2f2", borderRadius: 4, padding: "3px 6px",
                            textAlign: "center", fontWeight: 500,
                          }}
                        >
                          ✕ Cancelar meu home office
                        </div>
                      ) : !lotado ? (
                        <div
                          onClick={(ev) => { ev.stopPropagation(); abrirModalEscala(dia); }}
                          style={{
                            fontSize: 10, color: "#1e40af", cursor: "pointer",
                            background: "#eff6ff", borderRadius: 4, padding: "3px 6px",
                            textAlign: "center", fontWeight: 500,
                            border: "1px dashed #93c5fd",
                          }}
                        >
                          + Escalar meu home office
                        </div>
                      ) : (
                        <div style={{ fontSize: 10, color: "#f59e0b", textAlign: "center", fontWeight: 500 }}>
                          Lotado
                        </div>
                      )}
                      {!lotado && !meuRegistro && (
                        <div style={{ fontSize: 9, color: "#94a3b8", textAlign: "center", marginTop: 2 }}>
                          {MAX_POR_DIA - diaEscalas.length} vaga{MAX_POR_DIA - diaEscalas.length > 1 ? "s" : ""}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* ─── Histórico de Home Office por pessoa ─── */}
      {isAdmin && Object.keys(escalas).length > 0 && (() => {
        const contagem = {};
        for (const [dateStr, lista] of Object.entries(escalas)) {
          for (const e of lista) {
            const nome = e.operator_name || "—";
            if (!contagem[nome]) contagem[nome] = { total: 0, dias: [] };
            contagem[nome].total++;
            contagem[nome].dias.push(dateStr);
          }
        }
        const ranking = Object.entries(contagem)
          .map(([nome, d]) => ({ nome, total: d.total, dias: d.dias.sort() }))
          .sort((a, b) => b.total - a.total);

        if (ranking.length === 0) return null;

        return (
          <div style={{
            background: "#fff", borderRadius: 12, padding: 24, marginTop: 20,
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: "#1e293b", marginBottom: 14 }}>
              Histórico de Home Office — {mesNome}
            </h3>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                  <th style={{ textAlign: "left", padding: "8px 12px", color: "#64748b", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>Funcionário</th>
                  <th style={{ textAlign: "center", padding: "8px 12px", color: "#64748b", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>Dias</th>
                  <th style={{ textAlign: "left", padding: "8px 12px", color: "#64748b", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>Datas</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((r) => (
                  <tr key={r.nome} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "10px 12px", fontWeight: 500, color: "#1e293b" }}>{r.nome}</td>
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>
                      <span style={{
                        background: r.total >= 4 ? "#fef2f2" : r.total >= 2 ? "#fefce8" : "#f0fdf4",
                        color: r.total >= 4 ? "#dc2626" : r.total >= 2 ? "#a16207" : "#16a34a",
                        padding: "2px 10px", borderRadius: 10, fontWeight: 700, fontSize: 12,
                      }}>
                        {r.total}x
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px", color: "#64748b", fontSize: 12 }}>
                      {r.dias.map(d => { const [y,m,day] = d.split("-"); return `${day}/${m}`; }).join(", ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })()}

      {/* Modal de escalar/cancelar home office */}
      {modalEscalar && (
        <div
          onClick={() => setModalEscalar(null)}
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.35)", display: "flex",
            alignItems: "center", justifyContent: "center", zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff", borderRadius: 14, padding: "32px 28px",
              width: 360, boxShadow: "0 8px 30px rgba(0,0,0,0.15)",
              textAlign: "center",
            }}
          >
            <div style={{
              width: 48, height: 48, borderRadius: "50%", margin: "0 auto 16px",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
              background: modalEscalar.acao === "escalar" ? "#eff6ff" : "#fef2f2",
            }}>
              {modalEscalar.acao === "escalar" ? "🏠" : "✕"}
            </div>

            <h3 style={{ fontSize: 17, fontWeight: 700, color: "#1e293b", marginBottom: 6 }}>
              {modalEscalar.acao === "escalar" ? "Confirmar Home Office" : "Cancelar Home Office"}
            </h3>

            <p style={{ fontSize: 14, color: "#64748b", marginBottom: 4 }}>
              {modalEscalar.date.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
            </p>

            <p style={{ fontSize: 15, color: "#1e293b", fontWeight: 600, marginBottom: 16 }}>
              {operator?.nome}
            </p>

            {erroEscala && (
              <div style={{
                background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626",
                padding: "8px 12px", borderRadius: 6, fontSize: 12, marginBottom: 16, textAlign: "left",
              }}>
                Erro: {erroEscala}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button
                onClick={() => setModalEscalar(null)}
                style={{
                  padding: "10px 24px", borderRadius: 8, border: "1px solid #e2e8f0",
                  background: "#fff", fontSize: 14, cursor: "pointer", fontWeight: 500,
                  color: "#64748b",
                }}
              >
                Voltar
              </button>
              <button
                onClick={confirmarEscala}
                style={{
                  padding: "10px 24px", borderRadius: 8, border: "none",
                  background: modalEscalar.acao === "escalar" ? "#1e40af" : "#dc2626",
                  color: "#fff", fontSize: 14, cursor: "pointer", fontWeight: 600,
                }}
              >
                {modalEscalar.acao === "escalar" ? "Confirmar" : "Sim, cancelar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de bloqueio */}
      {modalBloquear && (
        <div
          onClick={() => setModalBloquear(null)}
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.4)", display: "flex",
            alignItems: "center", justifyContent: "center", zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff", borderRadius: 12, padding: 28,
              width: 380, boxShadow: "0 8px 30px rgba(0,0,0,0.15)",
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: "#1e293b" }}>
              🔒 Bloquear dia
            </h3>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
              {modalBloquear.date.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
            </p>

            {(escalas[modalBloquear.dateStr] || []).length > 0 && (
              <div style={{
                background: "#fef3c7", borderRadius: 6, padding: 10,
                marginBottom: 14, fontSize: 12, color: "#92400e",
              }}>
                ⚠️ {(escalas[modalBloquear.dateStr] || []).length} pessoa(s) escalada(s) neste dia serão removidas.
              </div>
            )}

            <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
              Motivo
            </label>
            <input
              type="text"
              value={motivoBloqueio}
              onChange={(e) => setMotivoBloqueio(e.target.value)}
              placeholder="Ex: Reunião, Feriado, Evento..."
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && bloquearDia()}
              style={{
                width: "100%", padding: "8px 12px", borderRadius: 6,
                border: "1px solid #d1d5db", fontSize: 14, marginBottom: 18,
                outline: "none", boxSizing: "border-box",
              }}
            />

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setModalBloquear(null)}
                style={{
                  padding: "8px 18px", borderRadius: 6, border: "1px solid #e2e8f0",
                  background: "#fff", fontSize: 13, cursor: "pointer", fontWeight: 500,
                }}
              >
                Cancelar
              </button>
              <button
                onClick={bloquearDia}
                disabled={!motivoBloqueio.trim()}
                style={{
                  padding: "8px 18px", borderRadius: 6, border: "none",
                  background: motivoBloqueio.trim() ? "#dc2626" : "#e5e7eb",
                  color: motivoBloqueio.trim() ? "#fff" : "#9ca3af",
                  fontSize: 13, cursor: motivoBloqueio.trim() ? "pointer" : "default",
                  fontWeight: 600,
                }}
              >
                Bloquear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const btnNavStyle = {
  background: "#f1f5f9",
  border: "1px solid #e2e8f0",
  padding: "6px 14px",
  borderRadius: 6,
  fontSize: 13,
  cursor: "pointer",
  fontWeight: 500,
};
