import { useState, useEffect, useCallback } from "react";

function hojeISO() {
  const h = new Date();
  return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}-${String(h.getDate()).padStart(2, "0")}`;
}

export default function MetricasHome() {
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
      // 1. Ponto do dia selecionado
      const [year, month, day] = dataSelecionada.split("-").map(Number);
      const pontoRes = await fetch(
        `/api/teamlogger/punch_report?year=${year}&month=${month}&day=${day}&timezoneOffsetMinutes=-180`
      );
      const pontoJson = await pontoRes.json();
      setPontoData(Array.isArray(pontoJson) ? pontoJson : []);

      // 2. Resumo conforme período
      const baseDate = new Date(dataSelecionada + "T12:00:00");
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

      const startMs = new Date(startDate + "T00:00:00").getTime();
      const endMs = new Date(endDate + "T23:59:59").getTime();

      const resumoRes = await fetch(
        `/api/teamlogger/summary_report?startTime=${startMs}&endTime=${endMs}`
      );
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

  function formatHorasLong(horas) {
    if (horas == null || isNaN(horas) || horas === 0) return "0,0 horas";
    return `${horas.toFixed(1).replace(".", ",")} horas`;
  }

  // Cards de funcionários a partir do punch report
  function buildEmployeeCards() {
    return pontoData.map((p) => {
      const presente = p.punchInGMT !== "Absent" && p.totalHours > 0;
      return {
        nome: p.employeeName || "—",
        presente,
        entrada: presente ? p.punchInLocalTime : null,
        saida: presente ? p.punchOutLocalTime : null,
        totalHours: p.totalHours || 0,
      };
    }).sort((a, b) => {
      // Ausentes primeiro, depois presentes
      if (a.presente === b.presente) return a.nome.localeCompare(b.nome);
      return a.presente ? 1 : -1;
    });
  }

  const JORNADA_HORAS = 8;

  // Resumo com dados reais do summary
  function buildResumoRows() {
    return resumoData
      .filter((r) => r.totalHours > 0)
      .sort((a, b) => (b.totalHours || 0) - (a.totalHours || 0))
      .map((r) => {
        const total = r.totalHours || 0;
        const faltam = Math.max(JORNADA_HORAS - total, 0);
        const jornadaPct = Math.min((total / JORNADA_HORAS) * 100, 100);
        return {
          nome: r.title || "—",
          totalHours: total,
          offComputerHours: r.offComputerHours || 0,
          idleHours: r.idleHours || 0,
          atividade: Math.round((r.activeMinutesRatio || 0) * 100),
          faltamHours: faltam,
          jornadaPct: Math.round(jornadaPct),
        };
      });
  }

  const employeeCards = buildEmployeeCards();
  const resumoRows = buildResumoRows();
  const ehHoje = dataSelecionada === hojeISO();
  const dataLabel = ehHoje ? "Hoje" : formatDataBR(dataSelecionada);
  const periodoLabel = modo === "dia" ? dataLabel : modo === "7dias" ? `7 dias até ${dataLabel}` : `30 dias até ${dataLabel}`;

  return (
    <div>
      <div style={{
        background: "#fff",
        borderRadius: 12,
        padding: "24px 28px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>📊</span>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#1e293b" }}>
              TeamLogger — Monitoramento
            </h1>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="date"
              value={dataSelecionada}
              onChange={(e) => setDataSelecionada(e.target.value)}
              max={hojeISO()}
              style={{
                padding: "5px 10px",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                fontSize: 13,
                color: "#374151",
                outline: "none",
                cursor: "pointer",
              }}
            />
            {!ehHoje && (
              <button
                onClick={() => setDataSelecionada(hojeISO())}
                style={{
                  padding: "5px 12px",
                  borderRadius: 20,
                  border: "1px solid #e2e8f0",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  background: "#fff",
                  color: "#6366f1",
                }}
              >
                Hoje
              </button>
            )}
            <span style={{ width: 1, height: 20, background: "#e2e8f0" }} />
            {[
              { key: "dia", label: "Dia" },
              { key: "7dias", label: "7 dias" },
              { key: "30dias", label: "30 dias" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setModo(tab.key)}
                style={{
                  padding: "6px 18px",
                  borderRadius: 20,
                  border: modo === tab.key ? "none" : "1px solid #e2e8f0",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  background: modo === tab.key ? "#6366f1" : "#fff",
                  color: modo === tab.key ? "#fff" : "#64748b",
                }}
              >
                {tab.label}
              </button>
            ))}
            <button
              onClick={carregar}
              style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#94a3b8", marginLeft: 4 }}
              title="Atualizar"
            >
              ↻
            </button>
          </div>
        </div>

        {erro && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: "8px 12px", borderRadius: 6, fontSize: 13, marginBottom: 16 }}>
            {erro}
          </div>
        )}

        {/* === PONTO DE HOJE === */}
        <div style={{ marginBottom: 32 }}>
          <h2 style={{
            fontSize: 12, fontWeight: 700, color: "#8892a4",
            textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 14,
          }}>
            Ponto {ehHoje ? "de Hoje" : ""} — {formatDataBR(dataSelecionada)}
          </h2>

          {carregando ? (
            <p style={{ color: "#94a3b8", fontSize: 14 }}>Carregando...</p>
          ) : employeeCards.length === 0 ? (
            <p style={{ color: "#94a3b8", fontSize: 14 }}>Nenhum funcionário encontrado.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {employeeCards.map((emp, i) => (
                <div
                  key={i}
                  style={{
                    background: "#f9fafb",
                    border: "1px solid #edf0f3",
                    borderRadius: 10,
                    padding: "14px 16px",
                    minHeight: 70,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{
                      width: 10, height: 10, borderRadius: "50%",
                      background: emp.presente ? "#f59e0b" : "#ef4444",
                      display: "inline-block", flexShrink: 0,
                    }} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#2d3748" }}>
                      {emp.nome}
                    </span>
                  </div>

                  {emp.presente ? (
                    <div style={{ fontSize: 13, color: "#5a657a", lineHeight: 1.7, paddingLeft: 18 }}>
                      <div>Entrada: <strong style={{ color: "#2d3748" }}>{emp.entrada}</strong></div>
                      {emp.saida && emp.saida !== "Absent" && (
                        <div>Saída: <strong style={{ color: "#2d3748" }}>{emp.saida}</strong></div>
                      )}
                      <div>Total: <strong style={{ color: "#2d3748" }}>{formatHoras(emp.totalHours)}</strong></div>
                    </div>
                  ) : (
                    <p style={{ fontSize: 13, color: "#ef4444", fontWeight: 500, paddingLeft: 18 }}>
                      Ausente hoje
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* === RESUMO DE ATIVIDADE === */}
        <div>
          <h2 style={{
            fontSize: 12, fontWeight: 700, color: "#8892a4",
            textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 14,
          }}>
            Resumo de Atividade — {periodoLabel}
          </h2>

          {carregando ? (
            <p style={{ color: "#94a3b8", fontSize: 14 }}>Carregando...</p>
          ) : resumoRows.length === 0 ? (
            <p style={{ color: "#94a3b8", fontSize: 14 }}>Nenhum dado de atividade encontrado.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #edf0f3" }}>
                    {[
                      { label: "Funcionário", tip: null },
                      { label: "Jornada", tip: "Progresso em relação à jornada de 8 horas" },
                      { label: "Fora do PC", tip: "Tempo que o funcionário esteve longe do computador (reunião, pausa, etc.)" },
                      { label: "Ocioso", tip: "Tempo no computador sem atividade de mouse ou teclado" },
                      { label: "Atividade", tip: "Percentual de tempo com atividade ativa (mouse/teclado) em relação ao tempo total" },
                    ].map((h) => (
                      <th key={h.label} title={h.tip || ""} style={{
                        textAlign: h.label === "Funcionário" ? "left" : "center",
                        padding: "10px 16px", fontSize: 12, fontWeight: 600,
                        color: "#8892a4", textTransform: "uppercase", letterSpacing: 0.5,
                        cursor: h.tip ? "help" : "default",
                      }}>
                        {h.label}{h.tip ? " ⓘ" : ""}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {resumoRows.map((r, i) => {
                    let barColor = "#ef4444";
                    if (r.atividade >= 75) barColor = "#22c55e";
                    else if (r.atividade >= 50) barColor = "#f59e0b";
                    else if (r.atividade >= 25) barColor = "#f97316";

                    return (
                      <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "14px 16px", fontSize: 14, fontWeight: 600, color: "#2d3748" }}>
                          {r.nome}
                        </td>
                        <td style={{ padding: "14px 16px", textAlign: "center" }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
                              <div style={{
                                flex: 1, height: 8, borderRadius: 4,
                                background: "#e5e7eb", overflow: "hidden", minWidth: 80,
                              }}>
                                <div style={{
                                  width: `${r.jornadaPct}%`,
                                  height: "100%", borderRadius: 4,
                                  background: r.jornadaPct >= 100 ? "#22c55e" : r.jornadaPct >= 60 ? "#6366f1" : "#f59e0b",
                                }} />
                              </div>
                              <span style={{ fontSize: 13, fontWeight: 700, color: "#2d3748", whiteSpace: "nowrap" }}>
                                {formatHoras(r.totalHours)} / 8h
                              </span>
                            </div>
                            {r.faltamHours > 0 && (
                              <span style={{ fontSize: 11, color: "#ef4444", fontWeight: 500 }}>
                                Faltam {formatHoras(r.faltamHours)}
                              </span>
                            )}
                            {r.faltamHours === 0 && (
                              <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 600 }}>
                                Jornada completa
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: "14px 16px", fontSize: 14, color: "#6366f1", fontStyle: "italic", textAlign: "center" }}>
                          {formatMinutos(r.offComputerHours)}
                        </td>
                        <td style={{ padding: "14px 16px", fontSize: 14, color: "#64748b", textAlign: "center" }}>
                          {formatMinutos(r.idleHours)}
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                            <div style={{
                              width: 80, height: 8, borderRadius: 4,
                              background: "#e5e7eb", overflow: "hidden",
                            }}>
                              <div style={{
                                width: `${Math.min(r.atividade, 100)}%`,
                                height: "100%", borderRadius: 4, background: barColor,
                              }} />
                            </div>
                            <span style={{ fontSize: 14, fontWeight: 700, color: barColor, minWidth: 40, textAlign: "right" }}>
                              {r.atividade} %
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
