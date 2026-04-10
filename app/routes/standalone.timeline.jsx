import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/useAuth";

const TIPOS = [
  { value: "admissao", label: "Admissão", color: "#16a34a" },
  { value: "promocao", label: "Promoção", color: "#1e40af" },
  { value: "advertencia", label: "Advertência", color: "#dc2626" },
  { value: "ferias", label: "Férias", color: "#0891b2" },
  { value: "afastamento", label: "Afastamento", color: "#ea580c" },
  { value: "documento", label: "Documento", color: "#64748b" },
  { value: "salario", label: "Reajuste Salarial", color: "#7c3aed" },
  { value: "desligamento", label: "Desligamento", color: "#991b1b" },
  { value: "observacao", label: "Observação", color: "#94a3b8" },
];

function corDoTipo(tipo) {
  return TIPOS.find((t) => t.value === tipo)?.color || "#94a3b8";
}

function labelDoTipo(tipo) {
  return TIPOS.find((t) => t.value === tipo)?.label || tipo;
}

function formatarData(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("pt-BR");
}

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

export default function Timeline() {
  const { operator, loading: authLoading } = useAuth();
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
    data: hoje(),
  });
  const [calAno, setCalAno] = useState(new Date().getFullYear());
  const [calMes, setCalMes] = useState(new Date().getMonth());
  const [diaFiltro, setDiaFiltro] = useState(null); // "YYYY-MM-DD" ou null

  // Calendário global (antes de selecionar funcionário)
  const [globalCalAno, setGlobalCalAno] = useState(new Date().getFullYear());
  const [globalCalMes, setGlobalCalMes] = useState(new Date().getMonth());
  const [todosEventos, setTodosEventos] = useState([]);
  const [globalDiaSelecionado, setGlobalDiaSelecionado] = useState(null);
  const [carregandoGlobal, setCarregandoGlobal] = useState(false);

  const podeAdicionarEvento =
    operator?.cargo === "admin" || operator?.cargo === "rh" || operator?.cargo === "gestor";

  useEffect(() => {
    carregarFuncionarios();
    carregarTodosEventos();
  }, []);

  // Recarregar eventos globais quando muda o mês
  useEffect(() => {
    carregarTodosEventos();
  }, [globalCalAno, globalCalMes]);

  async function carregarTodosEventos() {
    setCarregandoGlobal(true);
    const inicioMes = `${globalCalAno}-${String(globalCalMes + 1).padStart(2, "0")}-01`;
    const diasNoMes = new Date(globalCalAno, globalCalMes + 1, 0).getDate();
    const fimMes = `${globalCalAno}-${String(globalCalMes + 1).padStart(2, "0")}-${String(diasNoMes).padStart(2, "0")}`;

    const { data, error } = await supabase
      .from("employee_timeline")
      .select("*, operadores!employee_timeline_operator_id_fkey(nome)")
      .gte("data", inicioMes)
      .lte("data", fimMes)
      .order("data", { ascending: false });

    if (!error && data) {
      setTodosEventos(data);
    }
    setCarregandoGlobal(false);
  }

  const carregarEventos = useCallback(async (funcId) => {
    if (!funcId) {
      setEventos([]);
      return;
    }
    setCarregando(true);
    const { data, error } = await supabase
      .from("employee_timeline")
      .select("*")
      .eq("operator_id", funcId)
      .order("data", { ascending: false });

    if (!error && data) {
      setEventos(data);
    }
    setCarregando(false);
  }, []);

  async function carregarFuncionarios() {
    const { data, error } = await supabase
      .from("operadores")
      .select("id, nome")
      .in("status", ["aprovado", "active"])
      .order("nome");

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

    const { error } = await supabase.from("employee_timeline").insert({
      operator_id: selectedId,
      tipo: form.tipo,
      titulo: form.titulo.trim(),
      descricao: form.descricao.trim() || null,
      data: form.data,
      created_by: operator.id,
    });

    if (!error) {
      setForm({ tipo: "observacao", titulo: "", descricao: "", data: hoje() });
      setFormAberto(false);
      carregarEventos(selectedId);
      carregarTodosEventos();
    }
    setSalvando(false);
  }

  if (authLoading) return null;

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 16px" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>
          Timeline do Funcionário
        </h1>

        {/* Calendário global — visão geral de todos os funcionários */}
        {(() => {
          const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
          const MESES_NOME = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

          const primeiroDia = new Date(globalCalAno, globalCalMes, 1).getDay();
          const diasNoMes = new Date(globalCalAno, globalCalMes + 1, 0).getDate();

          const eventosPorDia = {};
          for (const ev of todosEventos) {
            if (!ev.data) continue;
            if (!eventosPorDia[ev.data]) eventosPorDia[ev.data] = [];
            eventosPorDia[ev.data].push(ev);
          }

          function navMesGlobal(dir) {
            let m = globalCalMes + dir;
            let a = globalCalAno;
            if (m < 0) { m = 11; a--; }
            if (m > 11) { m = 0; a++; }
            setGlobalCalMes(m);
            setGlobalCalAno(a);
            setGlobalDiaSelecionado(null);
          }

          const eventosDoDia = globalDiaSelecionado ? (eventosPorDia[globalDiaSelecionado] || []) : [];

          return (
            <div style={{
              background: "#fff", borderRadius: 8, padding: 20, marginBottom: 24,
              border: "1px solid #e2e8f0",
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#475569", marginBottom: 14 }}>
                Calendário de Eventos
              </div>

              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <button onClick={() => navMesGlobal(-1)} style={calNavBtn}>←</button>
                <span style={{ fontSize: 15, fontWeight: 600 }}>{MESES_NOME[globalCalMes]} {globalCalAno}</span>
                <button onClick={() => navMesGlobal(1)} style={calNavBtn}>→</button>
              </div>

              {/* Dias da semana */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
                {DIAS_SEMANA.map((d) => (
                  <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: "#94a3b8", padding: 4 }}>{d}</div>
                ))}
              </div>

              {/* Grid */}
              {carregandoGlobal ? (
                <div style={{ textAlign: "center", padding: 20, color: "#94a3b8", fontSize: 13 }}>Carregando...</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
                  {Array.from({ length: primeiroDia }).map((_, i) => (
                    <div key={`e-${i}`} style={{ minHeight: 48 }} />
                  ))}
                  {Array.from({ length: diasNoMes }).map((_, i) => {
                    const dia = i + 1;
                    const diaStr = `${globalCalAno}-${String(globalCalMes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
                    const evsDia = eventosPorDia[diaStr] || [];
                    const selecionado = globalDiaSelecionado === diaStr;
                    const temEvento = evsDia.length > 0;

                    return (
                      <div
                        key={dia}
                        onClick={() => {
                          if (temEvento) setGlobalDiaSelecionado(selecionado ? null : diaStr);
                        }}
                        style={{
                          minHeight: 48,
                          borderRadius: 6,
                          padding: "4px 2px",
                          textAlign: "center",
                          cursor: temEvento ? "pointer" : "default",
                          background: selecionado ? "#0f172a" : temEvento ? "#f0f9ff" : "transparent",
                          border: selecionado ? "2px solid #0f172a" : temEvento ? "1px solid #bae6fd" : "1px solid transparent",
                          transition: "all 0.12s",
                        }}
                      >
                        <span style={{
                          fontSize: 12, fontWeight: temEvento ? 700 : 400,
                          color: selecionado ? "#fff" : temEvento ? "#1e293b" : "#94a3b8",
                        }}>
                          {dia}
                        </span>
                        {temEvento && (
                          <div style={{ display: "flex", justifyContent: "center", gap: 3, marginTop: 4, flexWrap: "wrap" }}>
                            {evsDia.slice(0, 4).map((ev, j) => (
                              <span key={j} style={{
                                width: 6, height: 6, borderRadius: "50%",
                                background: selecionado ? "#fff" : corDoTipo(ev.tipo),
                                display: "inline-block",
                              }} />
                            ))}
                            {evsDia.length > 4 && (
                              <span style={{ fontSize: 8, color: selecionado ? "#fff" : "#94a3b8", fontWeight: 700 }}>+{evsDia.length - 4}</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Legenda */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14, paddingTop: 12, borderTop: "1px solid #f1f5f9" }}>
                {TIPOS.filter((t) => todosEventos.some((ev) => ev.tipo === t.value)).map((t) => (
                  <span key={t.value} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#64748b" }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: t.color, display: "inline-block" }} />
                    {t.label}
                  </span>
                ))}
              </div>

              {/* Eventos do dia selecionado */}
              {globalDiaSelecionado && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #e2e8f0" }}>
                  <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12,
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>
                      Eventos em {formatarData(globalDiaSelecionado)}
                    </span>
                    <button onClick={() => setGlobalDiaSelecionado(null)} style={{
                      background: "#f1f5f9", border: "1px solid #e2e8f0", color: "#64748b",
                      padding: "3px 10px", borderRadius: 4, fontSize: 11, cursor: "pointer", fontWeight: 600,
                    }}>
                      Fechar
                    </button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {eventosDoDia.map((ev, idx) => {
                      const cor = corDoTipo(ev.tipo);
                      const nomeFuncionario = ev.operadores?.nome || "—";
                      return (
                        <div key={ev.id || idx} style={{
                          display: "flex", alignItems: "flex-start", gap: 10,
                          padding: "10px 12px", background: "#f8fafc", borderRadius: 6,
                          border: "1px solid #f1f5f9",
                        }}>
                          <span style={{
                            width: 10, height: 10, borderRadius: "50%", background: cor,
                            marginTop: 4, flexShrink: 0,
                          }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                              <span style={{
                                fontSize: 11, fontWeight: 600, color: cor,
                                background: cor + "15", padding: "1px 6px", borderRadius: 4,
                                textTransform: "uppercase", letterSpacing: 0.5,
                              }}>
                                {labelDoTipo(ev.tipo)}
                              </span>
                              <span style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>
                                {nomeFuncionario}
                              </span>
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginTop: 3 }}>
                              {ev.titulo}
                            </div>
                            {ev.descricao && (
                              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                                {ev.descricao}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Seletor de funcionário */}
        <div
          style={{
            background: "#fff",
            borderRadius: 8,
            padding: 20,
            marginBottom: 24,
            border: "1px solid #e2e8f0",
          }}
        >
          <label
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 600,
              color: "#475569",
              marginBottom: 6,
            }}
          >
            Funcionário
          </label>
          <select
            value={selectedId}
            onChange={handleSelectFuncionario}
            style={{
              width: "100%",
              maxWidth: 400,
              padding: "10px 14px",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              fontSize: 14,
              outline: "none",
              background: "#fff",
            }}
          >
            <option value="">Selecione um funcionário...</option>
            {funcionarios.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </select>
        </div>

        {/* Botão adicionar evento (admin/rh) */}
        {podeAdicionarEvento && selectedId && (
          <div style={{ marginBottom: 24 }}>
            <button
              onClick={() => setFormAberto(!formAberto)}
              style={{
                background: formAberto ? "#64748b" : "#1e40af",
                color: "#fff",
                border: "none",
                padding: "8px 16px",
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {formAberto ? "Cancelar" : "Adicionar evento"}
            </button>

            {/* Formulário */}
            {formAberto && (
              <form
                onSubmit={handleSubmit}
                style={{
                  background: "#fff",
                  borderRadius: 8,
                  padding: 20,
                  marginTop: 12,
                  border: "1px solid #e2e8f0",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <label style={labelStyle}>Tipo</label>
                    <select
                      value={form.tipo}
                      onChange={(e) =>
                        setForm({ ...form, tipo: e.target.value })
                      }
                      style={inputStyle}
                    >
                      {TIPOS.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <label style={labelStyle}>Data</label>
                    <input
                      type="date"
                      value={form.data}
                      onChange={(e) =>
                        setForm({ ...form, data: e.target.value })
                      }
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Título</label>
                  <input
                    type="text"
                    value={form.titulo}
                    onChange={(e) =>
                      setForm({ ...form, titulo: e.target.value })
                    }
                    placeholder="Ex: Promoção para Analista Sênior"
                    required
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Descrição (opcional)</label>
                  <textarea
                    value={form.descricao}
                    onChange={(e) =>
                      setForm({ ...form, descricao: e.target.value })
                    }
                    placeholder="Detalhes adicionais..."
                    rows={3}
                    style={{ ...inputStyle, resize: "vertical" }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={salvando || !form.titulo.trim()}
                  style={{
                    background:
                      salvando || !form.titulo.trim() ? "#94a3b8" : "#1e40af",
                    color: "#fff",
                    border: "none",
                    padding: "10px 20px",
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor:
                      salvando || !form.titulo.trim()
                        ? "not-allowed"
                        : "pointer",
                    alignSelf: "flex-start",
                  }}
                >
                  {salvando ? "Salvando..." : "Salvar evento"}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Calendário */}
        {selectedId && (() => {
          const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
          const MESES_NOME = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

          const primeiroDia = new Date(calAno, calMes, 1).getDay();
          const diasNoMes = new Date(calAno, calMes + 1, 0).getDate();

          // Mapear eventos por data
          const eventosPorDia = {};
          for (const ev of eventos) {
            if (!ev.data) continue;
            if (!eventosPorDia[ev.data]) eventosPorDia[ev.data] = [];
            eventosPorDia[ev.data].push(ev);
          }

          function navMes(dir) {
            let m = calMes + dir;
            let a = calAno;
            if (m < 0) { m = 11; a--; }
            if (m > 11) { m = 0; a++; }
            setCalMes(m);
            setCalAno(a);
            setDiaFiltro(null);
          }

          return (
            <div style={{
              background: "#fff", borderRadius: 8, padding: 20, marginBottom: 24,
              border: "1px solid #e2e8f0",
            }}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <button onClick={() => navMes(-1)} style={calNavBtn}>←</button>
                <span style={{ fontSize: 15, fontWeight: 600 }}>{MESES_NOME[calMes]} {calAno}</span>
                <button onClick={() => navMes(1)} style={calNavBtn}>→</button>
              </div>

              {/* Dias da semana */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
                {DIAS_SEMANA.map((d) => (
                  <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: "#94a3b8", padding: 4 }}>{d}</div>
                ))}
              </div>

              {/* Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
                {Array.from({ length: primeiroDia }).map((_, i) => (
                  <div key={`e-${i}`} style={{ minHeight: 48 }} />
                ))}
                {Array.from({ length: diasNoMes }).map((_, i) => {
                  const dia = i + 1;
                  const diaStr = `${calAno}-${String(calMes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
                  const evsDia = eventosPorDia[diaStr] || [];
                  const selecionado = diaFiltro === diaStr;
                  const temEvento = evsDia.length > 0;

                  return (
                    <div
                      key={dia}
                      onClick={() => {
                        if (temEvento) setDiaFiltro(selecionado ? null : diaStr);
                      }}
                      style={{
                        minHeight: 48,
                        borderRadius: 6,
                        padding: "4px 2px",
                        textAlign: "center",
                        cursor: temEvento ? "pointer" : "default",
                        background: selecionado ? "#0f172a" : temEvento ? "#f8fafc" : "transparent",
                        border: selecionado ? "2px solid #0f172a" : temEvento ? "1px solid #e2e8f0" : "1px solid transparent",
                        transition: "all 0.12s",
                      }}
                    >
                      <span style={{
                        fontSize: 12, fontWeight: temEvento ? 700 : 400,
                        color: selecionado ? "#fff" : temEvento ? "#1e293b" : "#94a3b8",
                      }}>
                        {dia}
                      </span>
                      {/* Dots de eventos */}
                      {temEvento && (
                        <div style={{ display: "flex", justifyContent: "center", gap: 3, marginTop: 4, flexWrap: "wrap" }}>
                          {evsDia.slice(0, 4).map((ev, j) => (
                            <span key={j} style={{
                              width: 6, height: 6, borderRadius: "50%",
                              background: selecionado ? "#fff" : corDoTipo(ev.tipo),
                              display: "inline-block",
                            }} />
                          ))}
                          {evsDia.length > 4 && (
                            <span style={{ fontSize: 8, color: selecionado ? "#fff" : "#94a3b8", fontWeight: 700 }}>+{evsDia.length - 4}</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Legenda */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14, paddingTop: 12, borderTop: "1px solid #f1f5f9" }}>
                {TIPOS.filter((t) => eventos.some((ev) => ev.tipo === t.value)).map((t) => (
                  <span key={t.value} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#64748b" }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: t.color, display: "inline-block" }} />
                    {t.label}
                  </span>
                ))}
              </div>

              {/* Filtro ativo */}
              {diaFiltro && (
                <div style={{
                  marginTop: 12, padding: "8px 14px", background: "#0f172a", borderRadius: 6,
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <span style={{ fontSize: 13, color: "#fff", fontWeight: 500 }}>
                    Mostrando eventos de {formatarData(diaFiltro)}
                  </span>
                  <button onClick={() => setDiaFiltro(null)} style={{
                    background: "rgba(255,255,255,0.15)", border: "none", color: "#fff",
                    padding: "3px 10px", borderRadius: 4, fontSize: 12, cursor: "pointer", fontWeight: 600,
                  }}>
                    Limpar filtro
                  </button>
                </div>
              )}
            </div>
          );
        })()}

        {/* Timeline */}
        {selectedId && (
          <div
            style={{
              background: "#fff",
              borderRadius: 8,
              padding: 24,
              border: "1px solid #e2e8f0",
            }}
          >
            {carregando ? (
              <p style={{ color: "#64748b", fontSize: 14 }}>Carregando...</p>
            ) : eventos.length === 0 ? (
              <p style={{ color: "#64748b", fontSize: 14 }}>
                Nenhum evento registrado.
              </p>
            ) : (() => {
              const eventosFiltrados = diaFiltro
                ? eventos.filter((ev) => ev.data === diaFiltro)
                : eventos;

              if (eventosFiltrados.length === 0) {
                return <p style={{ color: "#64748b", fontSize: 14 }}>Nenhum evento neste dia.</p>;
              }

              return (
              <div style={{ position: "relative", paddingLeft: 28 }}>
                {/* Linha vertical */}
                <div
                  style={{
                    position: "absolute",
                    left: 7,
                    top: 4,
                    bottom: 4,
                    width: 2,
                    background: "#e2e8f0",
                  }}
                />

                {eventosFiltrados.map((ev, i) => {
                  const cor = corDoTipo(ev.tipo);
                  return (
                    <div
                      key={ev.id || i}
                      style={{
                        position: "relative",
                        paddingBottom: i < eventos.length - 1 ? 24 : 0,
                      }}
                    >
                      {/* Dot */}
                      <div
                        style={{
                          position: "absolute",
                          left: -24,
                          top: 3,
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          background: cor,
                          border: "2px solid #fff",
                          boxShadow: "0 0 0 2px " + cor + "40",
                        }}
                      />

                      {/* Badge tipo */}
                      <span
                        style={{
                          display: "inline-block",
                          fontSize: 11,
                          fontWeight: 600,
                          color: cor,
                          background: cor + "15",
                          padding: "2px 8px",
                          borderRadius: 4,
                          marginBottom: 4,
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                        }}
                      >
                        {labelDoTipo(ev.tipo)}
                      </span>

                      {/* Titulo */}
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 600,
                          color: "#1e293b",
                          marginBottom: 2,
                        }}
                      >
                        {ev.titulo}
                      </div>

                      {/* Descricao */}
                      {ev.descricao && (
                        <div
                          style={{
                            fontSize: 13,
                            color: "#64748b",
                            marginBottom: 2,
                            lineHeight: 1.5,
                          }}
                        >
                          {ev.descricao}
                        </div>
                      )}

                      {/* Data */}
                      <div
                        style={{
                          fontSize: 12,
                          color: "#94a3b8",
                          marginTop: 2,
                        }}
                      >
                        {formatarData(ev.data)}
                      </div>
                    </div>
                  );
                })}
              </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

const labelStyle = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "#475569",
  marginBottom: 4,
};

const inputStyle = {
  width: "100%",
  padding: "10px 14px",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  fontSize: 14,
  outline: "none",
  background: "#fff",
  boxSizing: "border-box",
};

const calNavBtn = {
  background: "#f1f5f9",
  border: "1px solid #e2e8f0",
  padding: "4px 12px",
  borderRadius: 6,
  fontSize: 14,
  cursor: "pointer",
  fontWeight: 600,
};
