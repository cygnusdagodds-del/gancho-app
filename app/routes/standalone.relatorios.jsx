import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

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

export default function Relatorios() {
  const [modo, setModo] = useState("semana"); // "semana" | "mes"
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [semanaOffset, setSemanaOffset] = useState(0);
  const [mesOffset, setMesOffset] = useState(0);

  function getPeriodo() {
    if (modo === "semana") {
      const hoje = new Date();
      const seg = getSegundaFeira(hoje);
      seg.setDate(seg.getDate() + semanaOffset * 7);
      const sex = new Date(seg);
      sex.setDate(seg.getDate() + 4);
      return { inicio: formatDate(seg), fim: formatDate(sex), label: `${formatDateBR(formatDate(seg))} — ${formatDateBR(formatDate(sex))}` };
    } else {
      const hoje = new Date();
      const ano = hoje.getFullYear();
      const mes = hoje.getMonth() + mesOffset;
      const d = new Date(ano, mes, 1);
      const ultimo = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
      return { inicio: formatDate(d), fim: formatDate(ultimo), label };
    }
  }

  const carregar = useCallback(async () => {
    setCarregando(true);
    const { inicio, fim } = getPeriodo();

    // 1. Buscar escalas do período
    const { data: escalas } = await supabase
      .from("home_office_schedule")
      .select("date, operator_id, operator_name, operator_email")
      .gte("date", inicio)
      .lte("date", fim);

    if (!escalas || escalas.length === 0) {
      setDados({ resumo: [], totalEscalas: 0, totalUsou: 0, totalNaoUsou: 0, porPessoa: [], diasAnalisados: [] });
      setCarregando(false);
      return;
    }

    // 2. Buscar mapa email→nome do TeamLogger
    let emailToName = {};
    try {
      const usersRes = await fetch("/api/teamlogger/list_users");
      const usersJson = await usersRes.json();
      for (const u of (Array.isArray(usersJson) ? usersJson : [])) {
        if (u.email) emailToName[u.email.toLowerCase()] = u.name || u.username;
      }
    } catch {}

    // 3. Agrupar escalas por dia
    const diasUnicos = [...new Set(escalas.map((e) => e.date))].sort();
    const hoje = formatDate(new Date());

    // 4. Buscar TeamLogger para cada dia (só passados ou hoje)
    const tlData = {};
    const diasParaBuscar = diasUnicos.filter((d) => d <= hoje);

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
          for (const p of (Array.isArray(json) ? json : [])) {
            dayMap[p.employeeName || ""] = {
              presente: p.punchInGMT !== "Absent" && p.totalHours > 0,
              totalHours: p.totalHours || 0,
            };
          }
          tlData[dateStr] = dayMap;
        } catch {}
      }));
    }

    // 5. Cruzar escalas com TeamLogger
    let totalEscalas = 0;
    let totalUsou = 0;
    let totalNaoUsou = 0;
    const pessoaMap = {}; // nome → { escalas, usou, naoUsou, horasTotal }
    const diasAnalisados = [];

    for (const dateStr of diasUnicos) {
      const escalasDia = escalas.filter((e) => e.date === dateStr);
      const dayTL = tlData[dateStr];
      const isFuturo = dateStr > hoje;

      const diaInfo = { date: dateStr, pessoas: [] };

      for (const esc of escalasDia) {
        totalEscalas++;
        const nome = esc.operator_name || "—";
        const email = (esc.operator_email || "").toLowerCase();

        if (!pessoaMap[nome]) pessoaMap[nome] = { escalas: 0, usou: 0, naoUsou: 0, horasTotal: 0 };
        pessoaMap[nome].escalas++;

        if (isFuturo || !dayTL) {
          diaInfo.pessoas.push({ nome, status: "futuro", horas: 0 });
          continue;
        }

        // Cruzar por email → nome TL, ou por nome direto
        const tlName = email ? emailToName[email] : null;
        const tlEntry = (tlName && dayTL[tlName]) || dayTL[nome];

        if (tlEntry && tlEntry.presente) {
          totalUsou++;
          pessoaMap[nome].usou++;
          pessoaMap[nome].horasTotal += tlEntry.totalHours;
          diaInfo.pessoas.push({ nome, status: "usou", horas: tlEntry.totalHours });
        } else {
          totalNaoUsou++;
          pessoaMap[nome].naoUsou++;
          diaInfo.pessoas.push({ nome, status: "nao_usou", horas: 0 });
        }
      }

      diasAnalisados.push(diaInfo);
    }

    const porPessoa = Object.entries(pessoaMap)
      .map(([nome, d]) => ({
        nome,
        escalas: d.escalas,
        usou: d.usou,
        naoUsou: d.naoUsou,
        horasTotal: d.horasTotal,
        pctUso: d.escalas > 0 ? Math.round((d.usou / d.escalas) * 100) : 0,
      }))
      .sort((a, b) => a.pctUso - b.pctUso);

    setDados({ totalEscalas, totalUsou, totalNaoUsou, porPessoa, diasAnalisados });
    setCarregando(false);
  }, [modo, semanaOffset, mesOffset]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const periodo = getPeriodo();
  const pctGeral = dados && dados.totalEscalas > 0
    ? Math.round((dados.totalUsou / dados.totalEscalas) * 100)
    : 0;
  const pctNaoUsou = dados && dados.totalEscalas > 0
    ? Math.round((dados.totalNaoUsou / dados.totalEscalas) * 100)
    : 0;

  function navegar(delta) {
    if (modo === "semana") setSemanaOffset((p) => p + delta);
    else setMesOffset((p) => p + delta);
  }

  function corPct(pct) {
    if (pct >= 80) return "#16a34a";
    if (pct >= 50) return "#f59e0b";
    return "#dc2626";
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Relatórios</h1>
      <p style={{ fontSize: 14, color: "#64748b", marginBottom: 20 }}>
        Home Office × TeamLogger — Quem usou, quem não usou
      </p>

      {/* Controles */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { key: "semana", label: "Semana" },
          { key: "mes", label: "Mês" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => { setModo(t.key); setSemanaOffset(0); setMesOffset(0); }}
            style={{
              padding: "6px 18px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer",
              border: modo === t.key ? "none" : "1px solid #e2e8f0",
              background: modo === t.key ? "#1e40af" : "#fff",
              color: modo === t.key ? "#fff" : "#64748b",
            }}
          >
            {t.label}
          </button>
        ))}

        <span style={{ width: 1, height: 20, background: "#e2e8f0" }} />

        <button onClick={() => navegar(-1)} style={btnNav}>← Anterior</button>
        <span style={{ fontSize: 14, fontWeight: 600, minWidth: 180, textAlign: "center", textTransform: "capitalize" }}>
          {periodo.label}
        </span>
        <button onClick={() => navegar(1)} style={btnNav}>Próximo →</button>
      </div>

      {carregando ? (
        <p style={{ color: "#94a3b8" }}>Carregando relatório...</p>
      ) : !dados || dados.totalEscalas === 0 ? (
        <div style={{ background: "#f8fafc", borderRadius: 10, padding: 30, textAlign: "center", color: "#94a3b8" }}>
          Nenhuma escala de home office neste período.
        </div>
      ) : (
        <>
          {/* Cards resumo */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
            <div style={cardStyle}>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>
                Total de Escalas
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#1e293b" }}>{dados.totalEscalas}</div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>pessoa-dia no período</div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>
                Usaram TeamLogger
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#16a34a" }}>{dados.totalUsou}</div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>{pctGeral}% do total</div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>
                Não Usaram
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#dc2626" }}>{dados.totalNaoUsou}</div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>{pctNaoUsou}% da equipe não usou</div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>
                Taxa de Uso
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: corPct(pctGeral) }}>{pctGeral}%</div>
              <div style={{ width: "100%", height: 6, borderRadius: 3, background: "#e5e7eb", marginTop: 6 }}>
                <div style={{ width: `${pctGeral}%`, height: "100%", borderRadius: 3, background: corPct(pctGeral), transition: "width 0.3s" }} />
              </div>
            </div>
          </div>

          {/* Tabela por pessoa */}
          <div style={{ background: "#fff", borderRadius: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", overflow: "auto", marginBottom: 24 }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0" }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "#1e293b", margin: 0 }}>Uso por Funcionário</h3>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                  {["Funcionário", "Escalas", "Usou TL", "Não usou", "Horas Total", "Taxa"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dados.porPessoa.map((p) => (
                  <tr key={p.nome} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "10px 16px", fontSize: 14, fontWeight: 500 }}>{p.nome}</td>
                    <td style={{ padding: "10px 16px", fontSize: 14, color: "#64748b" }}>{p.escalas}</td>
                    <td style={{ padding: "10px 16px", fontSize: 14, color: "#16a34a", fontWeight: 600 }}>{p.usou}</td>
                    <td style={{ padding: "10px 16px", fontSize: 14, color: p.naoUsou > 0 ? "#dc2626" : "#94a3b8", fontWeight: p.naoUsou > 0 ? 600 : 400 }}>{p.naoUsou}</td>
                    <td style={{ padding: "10px 16px", fontSize: 14, color: "#64748b" }}>{p.horasTotal.toFixed(1).replace(".", ",")}h</td>
                    <td style={{ padding: "10px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 60, height: 6, borderRadius: 3, background: "#e5e7eb", overflow: "hidden" }}>
                          <div style={{ width: `${p.pctUso}%`, height: "100%", borderRadius: 3, background: corPct(p.pctUso) }} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: corPct(p.pctUso) }}>{p.pctUso}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Detalhamento por dia */}
          <div style={{ background: "#fff", borderRadius: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", overflow: "auto" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0" }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "#1e293b", margin: 0 }}>Detalhamento por Dia</h3>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                  {["Dia", "Funcionário", "Status", "Horas"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dados.diasAnalisados.map((dia) =>
                  dia.pessoas.map((p, i) => (
                    <tr key={`${dia.date}-${p.nome}`} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      {i === 0 && (
                        <td rowSpan={dia.pessoas.length} style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600, color: "#374151", verticalAlign: "top" }}>
                          {formatDateBR(dia.date)}
                        </td>
                      )}
                      <td style={{ padding: "10px 16px", fontSize: 14 }}>{p.nome}</td>
                      <td style={{ padding: "10px 16px" }}>
                        {p.status === "usou" && (
                          <span style={{ background: "#dcfce7", color: "#166534", padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>Usou TL</span>
                        )}
                        {p.status === "nao_usou" && (
                          <span style={{ background: "#fef2f2", color: "#dc2626", padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>Não ligou</span>
                        )}
                        {p.status === "futuro" && (
                          <span style={{ background: "#f1f5f9", color: "#94a3b8", padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 500 }}>Agendado</span>
                        )}
                      </td>
                      <td style={{ padding: "10px 16px", fontSize: 14, color: "#64748b" }}>
                        {p.horas > 0 ? `${p.horas.toFixed(1).replace(".", ",")}h` : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

const btnNav = {
  background: "#f1f5f9", border: "1px solid #e2e8f0", padding: "6px 14px",
  borderRadius: 6, fontSize: 13, cursor: "pointer", fontWeight: 500,
};

const cardStyle = {
  background: "#fff", borderRadius: 10, padding: 20,
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
};
