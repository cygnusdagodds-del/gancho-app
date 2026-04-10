import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/useAuth";
import { useToast } from "../lib/useToast";
import { useConfirm } from "../lib/useConfirm";

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MESES_FULL = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function fmt(v) {
  if (v == null || isNaN(v)) return "R$ 0,00";
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function FolhaSalarial() {
  const { operator } = useAuth();
  const toast = useToast();
  const { confirm } = useConfirm();
  const isAdmin = operator?.cargo === "admin" || operator?.cargo === "rh";

  const [ano, setAno] = useState(new Date().getFullYear());
  const [mesSelecionado, setMesSelecionado] = useState(null);
  const [carregando, setCarregando] = useState(true);

  const [folhaFuncs, setFolhaFuncs] = useState([]);
  const [extras, setExtras] = useState([]);
  const [operadores, setOperadores] = useState([]);

  // Olhinho: set de ids temporariamente ocultos do total
  const [ocultos, setOcultos] = useState(new Set());

  // Modals
  const [mostraFormFunc, setMostraFormFunc] = useState(false);
  const [editandoFunc, setEditandoFunc] = useState(null);
  const [formFunc, setFormFunc] = useState({ operator_id: "", salario_base: "", vale_alimentacao: "" });

  const [mostraFormExtra, setMostraFormExtra] = useState(false);
  const [editandoExtra, setEditandoExtra] = useState(null);
  const [formExtra, setFormExtra] = useState({ descricao: "", valor: "", tipo: "todos", mes: new Date().getMonth() + 1 });

  const [salvando, setSalvando] = useState(false);

  // ─── Load ───

  const carregar = useCallback(async () => {
    setCarregando(true);

    const [{ data: funcs }, { data: exts }, { data: ops }] = await Promise.all([
      supabase.from("folha_funcionarios").select("*, operadores(nome, avatar_url)").eq("ativo", true).order("created_at"),
      supabase.from("folha_extras").select("*").order("created_at"),
      supabase.from("operadores").select("id, nome").in("status", ["aprovado", "active"]).order("nome"),
    ]);

    setFolhaFuncs(funcs || []);
    setExtras(exts || []);
    setOperadores(ops || []);
    setCarregando(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // ─── Helpers: quais extras aparecem num mês ───

  function extraApareceMes(ex, mes) {
    // mes = 1-12
    const excluidos = ex.meses_excluidos || [];
    if (excluidos.includes(mes)) return false;

    if (ex.recorrente) return true; // todos os meses
    return ex.mes === mes && ex.ano === ano; // avulso
  }

  function getExtrasMes(mes) {
    return extras.filter((e) => extraApareceMes(e, mes));
  }

  // ─── Cálculos ───

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
      total: totalSalarios + totalVA + total13 + totalFerias + totalExtras,
    };
  }

  const totalAnual = (() => {
    let t = 0;
    for (let m = 1; m <= 12; m++) t += calcMes(m).total;
    return t;
  })();

  const mesAtual = new Date().getMonth();

  function toggleOculto(exId, mes) {
    const key = exId + "-" + mes;
    setOcultos((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // ─── Excluir gasto de um mês específico (persistente) ───

  async function excluirDoMes(ex, mes) {
    const excluidos = [...(ex.meses_excluidos || [])];
    if (!excluidos.includes(mes)) excluidos.push(mes);
    const { error } = await supabase.from("folha_extras").update({ meses_excluidos: excluidos }).eq("id", ex.id);
    if (error) toast.error("Erro: " + error.message);
    else { toast.success(`Removido de ${MESES_FULL[mes - 1]}.`); carregar(); }
  }

  async function restaurarNoMes(ex, mes) {
    const excluidos = (ex.meses_excluidos || []).filter((m) => m !== mes);
    const { error } = await supabase.from("folha_extras").update({ meses_excluidos: excluidos }).eq("id", ex.id);
    if (error) toast.error("Erro: " + error.message);
    else { toast.success(`Restaurado em ${MESES_FULL[mes - 1]}.`); carregar(); }
  }

  // ─── CRUD Funcionários na Folha ───

  function abrirNovoFunc() {
    setEditandoFunc(null);
    setFormFunc({ operator_id: "", salario_base: "", vale_alimentacao: "" });
    setMostraFormFunc(true);
  }

  function abrirEditarFunc(f) {
    setEditandoFunc(f.id);
    setFormFunc({
      operator_id: f.operator_id,
      salario_base: f.salario_base ?? "",
      vale_alimentacao: f.vale_alimentacao ?? "",
    });
    setMostraFormFunc(true);
  }

  async function salvarFunc(e) {
    e.preventDefault();
    if (!formFunc.operator_id) { toast.warn("Selecione um funcionário."); return; }
    setSalvando(true);

    const dados = {
      operator_id: formFunc.operator_id,
      salario_base: Number(formFunc.salario_base) || 0,
      vale_alimentacao: Number(formFunc.vale_alimentacao) || 0,
      ativo: true,
    };

    if (editandoFunc) {
      const { error } = await supabase.from("folha_funcionarios").update(dados).eq("id", editandoFunc);
      if (error) toast.error("Erro: " + error.message);
      else toast.success("Atualizado!");
    } else {
      const { error } = await supabase.from("folha_funcionarios").insert(dados);
      if (error) toast.error("Erro: " + error.message);
      else toast.success("Funcionário adicionado à folha!");
    }

    setSalvando(false);
    setMostraFormFunc(false);
    carregar();
  }

  async function removerFunc(f) {
    const nome = f.operadores?.nome || "funcionário";
    const ok = await confirm(`Remover ${nome} da folha salarial?`, { title: "Remover da folha", confirmText: "Remover", danger: true });
    if (!ok) return;
    await supabase.from("folha_funcionarios").update({ ativo: false }).eq("id", f.id);
    toast.success("Removido da folha.");
    carregar();
  }

  // ─── CRUD Extras ───

  function abrirNovoExtra(mesDefault) {
    setEditandoExtra(null);
    setFormExtra({ descricao: "", valor: "", tipo: mesDefault ? "avulso" : "todos", mes: mesDefault || new Date().getMonth() + 1 });
    setMostraFormExtra(true);
  }

  function abrirEditarExtra(ex) {
    setEditandoExtra(ex.id);
    setFormExtra({
      descricao: ex.descricao,
      valor: ex.valor ?? "",
      tipo: ex.recorrente ? "todos" : "avulso",
      mes: ex.mes || 1,
    });
    setMostraFormExtra(true);
  }

  async function salvarExtra(e) {
    e.preventDefault();
    if (!formExtra.descricao.trim()) { toast.warn("Informe a descrição."); return; }
    setSalvando(true);

    const recorrente = formExtra.tipo === "todos";

    const dados = {
      descricao: formExtra.descricao.trim(),
      valor: Number(formExtra.valor) || 0,
      mes: recorrente ? 1 : Number(formExtra.mes),
      ano,
      recorrente,
    };

    if (editandoExtra) {
      const { error } = await supabase.from("folha_extras").update(dados).eq("id", editandoExtra);
      if (error) toast.error("Erro: " + error.message);
      else toast.success("Atualizado!");
    } else {
      const { error } = await supabase.from("folha_extras").insert(dados);
      if (error) toast.error("Erro: " + error.message);
      else toast.success("Gasto adicionado!");
    }

    setSalvando(false);
    setMostraFormExtra(false);
    carregar();
  }

  async function excluirExtra(ex) {
    const ok = await confirm(`Excluir "${ex.descricao}" permanentemente?`, { title: "Excluir gasto", confirmText: "Excluir", danger: true });
    if (!ok) return;
    await supabase.from("folha_extras").delete().eq("id", ex.id);
    toast.success("Excluído.");
    carregar();
  }

  // ─── Render ───

  if (carregando) {
    return (
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Folha Salarial</h1>
        <p style={{ color: "#94a3b8" }}>Carregando...</p>
      </div>
    );
  }

  const detalheMes = mesSelecionado !== null ? calcMes(mesSelecionado + 1) : null;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Folha Salarial</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => setAno(ano - 1)} style={btnNav}>←</button>
          <span style={{ fontSize: 18, fontWeight: 700, minWidth: 60, textAlign: "center" }}>{ano}</span>
          <button onClick={() => setAno(ano + 1)} style={btnNav}>→</button>
        </div>
      </div>

      {/* Resumo anual */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14, marginBottom: 24 }}>
        <div style={{ ...cardStyle, borderLeft: "4px solid rgb(22,134,78)" }}>
          <p style={cardLabel}>Total Anual</p>
          <p style={{ ...cardValor, color: "rgb(22,134,78)" }}>{fmt(totalAnual)}</p>
        </div>
        <div style={{ ...cardStyle, borderLeft: "4px solid #2563eb" }}>
          <p style={cardLabel}>Média Mensal</p>
          <p style={{ ...cardValor, color: "#2563eb" }}>{fmt(totalAnual / 12)}</p>
        </div>
        <div style={{ ...cardStyle, borderLeft: "4px solid #7c3aed" }}>
          <p style={cardLabel}>Funcionários</p>
          <p style={{ ...cardValor, color: "#7c3aed" }}>{folhaFuncs.length}</p>
        </div>
        <div style={{ ...cardStyle, borderLeft: "4px solid #d97706" }}>
          <p style={cardLabel}>Gastos Extras</p>
          <p style={{ ...cardValor, color: "#d97706" }}>
            {fmt((() => { let t = 0; for (let m = 1; m <= 12; m++) t += calcMes(m).extras; return t; })())}
          </p>
        </div>
      </div>

      {/* Grid 12 meses */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28 }}>
        {MESES.map((nome, i) => {
          const c = calcMes(i + 1);
          const selecionado = mesSelecionado === i;
          const atual = i === mesAtual && ano === new Date().getFullYear();
          return (
            <div
              key={i}
              onClick={() => setMesSelecionado(selecionado ? null : i)}
              style={{
                background: selecionado ? "#0f172a" : "#fff",
                color: selecionado ? "#fff" : "#1e293b",
                borderRadius: 10,
                padding: "16px 18px",
                cursor: "pointer",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                border: atual && !selecionado ? "2px solid rgb(22,134,78)" : "1px solid #e2e8f0",
                transition: "all 0.15s",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.7 }}>{nome}</span>
                {atual && !selecionado && (
                  <span style={{ fontSize: 9, background: "rgb(22,134,78)", color: "#fff", padding: "1px 6px", borderRadius: 10, fontWeight: 700 }}>ATUAL</span>
                )}
              </div>
              <p style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{fmt(c.total)}</p>
              <div style={{ display: "flex", gap: 8, marginTop: 6, fontSize: 10, opacity: 0.6 }}>
                <span>{folhaFuncs.length} func.</span>
                {getExtrasMes(i + 1).length > 0 && <span>+{getExtrasMes(i + 1).length} extras</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detalhe do mês selecionado */}
      {mesSelecionado !== null && detalheMes && (
        <div style={{ ...cardStyle, padding: 28, marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
              {MESES_FULL[mesSelecionado]} {ano}
            </h2>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: "rgb(22,134,78)" }}>{fmt(detalheMes.total)}</span>
              {ocultos.size > 0 && (
                <p style={{ fontSize: 10, color: "#94a3b8", margin: "2px 0 0" }}>
                  (com itens ocultos)
                </p>
              )}
            </div>
          </div>

          {/* Breakdown */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginBottom: 20 }}>
            {[
              { label: "Salários", valor: detalheMes.salarios, cor: "#1e293b" },
              { label: "Vale Alimentação", valor: detalheMes.va, cor: "#2563eb" },
              { label: "Provisão 13º", valor: detalheMes.prov13, cor: "#7c3aed" },
              { label: "Provisão Férias", valor: detalheMes.provFerias, cor: "#d97706" },
              { label: "Outros Gastos", valor: detalheMes.extras, cor: "#dc2626" },
            ].map((item) => (
              <div key={item.label} style={{ background: "#f8fafc", borderRadius: 8, padding: "10px 14px" }}>
                <p style={{ fontSize: 11, color: "#64748b", margin: "0 0 4px" }}>{item.label}</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: item.cor, margin: 0 }}>{fmt(item.valor)}</p>
              </div>
            ))}
          </div>

          {/* Tabela funcionários */}
          <h3 style={sectionTitle}>Funcionários</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 20 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                <th style={th}>Nome</th>
                <th style={th}>Salário</th>
                <th style={th}>VA</th>
                <th style={th}>13º (prov.)</th>
                <th style={th}>Férias (prov.)</th>
                <th style={th}>Custo Total</th>
              </tr>
            </thead>
            <tbody>
              {folhaFuncs.map((f) => {
                const sal = Number(f.salario_base) || 0;
                const va = Number(f.vale_alimentacao) || 0;
                const p13 = sal / 12;
                const pFer = (sal + sal / 3) / 12;
                return (
                  <tr key={f.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={td}><span style={{ fontWeight: 500 }}>{f.operadores?.nome || "—"}</span></td>
                    <td style={td}>{fmt(sal)}</td>
                    <td style={{ ...td, color: "#2563eb" }}>{fmt(va)}</td>
                    <td style={{ ...td, color: "#7c3aed" }}>{fmt(p13)}</td>
                    <td style={{ ...td, color: "#d97706" }}>{fmt(pFer)}</td>
                    <td style={{ ...td, fontWeight: 700 }}>{fmt(sal + va + p13 + pFer)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Outros Gastos do mês */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h3 style={{ ...sectionTitle, margin: 0 }}>Outros Gastos</h3>
            {isAdmin && (
              <button onClick={() => abrirNovoExtra(mesSelecionado + 1)} style={{ ...btnSmall, background: "#dc2626" }}>
                + Adicionar Gasto
              </button>
            )}
          </div>

          {(() => {
            const mesNum = mesSelecionado + 1;
            const extrasDoMes = getExtrasMes(mesNum);

            // Also show excluded recorrentes (greyed out) so admin can restore
            const excluidos = extras.filter((e) =>
              e.recorrente && (e.meses_excluidos || []).includes(mesNum)
            );

            if (extrasDoMes.length === 0 && excluidos.length === 0) {
              return <p style={{ fontSize: 13, color: "#94a3b8", padding: 10 }}>Nenhum gasto extra neste mês.</p>;
            }

            return (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                    <th style={{ ...th, width: 30 }}></th>
                    <th style={th}>Descrição</th>
                    <th style={th}>Valor</th>
                    <th style={th}>Tipo</th>
                    {isAdmin && <th style={th}>Ações</th>}
                  </tr>
                </thead>
                <tbody>
                  {extrasDoMes.map((ex) => {
                    const ocultoKey = ex.id + "-" + mesNum;
                    const estaOculto = ocultos.has(ocultoKey);
                    return (
                      <tr key={ex.id} style={{ borderBottom: "1px solid #f1f5f9", opacity: estaOculto ? 0.35 : 1, transition: "opacity 0.15s" }}>
                        <td style={{ ...td, width: 30, padding: "10px 6px" }}>
                          <button
                            onClick={() => toggleOculto(ex.id, mesNum)}
                            title={estaOculto ? "Mostrar no total" : "Ocultar do total (temporário)"}
                            style={{ background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex", alignItems: "center" }}
                          >
                            <span className="material-symbols-outlined" style={{
                              fontSize: 18,
                              color: estaOculto ? "#94a3b8" : "#64748b",
                            }}>
                              {estaOculto ? "visibility_off" : "visibility"}
                            </span>
                          </button>
                        </td>
                        <td style={{ ...td, textDecoration: estaOculto ? "line-through" : "none" }}>{ex.descricao}</td>
                        <td style={{ ...td, fontWeight: 600, color: "#dc2626", textDecoration: estaOculto ? "line-through" : "none" }}>{fmt(ex.valor)}</td>
                        <td style={td}>
                          <span style={{
                            fontSize: 11, padding: "2px 8px", borderRadius: 10, fontWeight: 600,
                            background: ex.recorrente ? "#ede9fe" : "#f1f5f9",
                            color: ex.recorrente ? "#7c3aed" : "#64748b",
                          }}>
                            {ex.recorrente ? "Todo mês" : "Avulso"}
                          </span>
                        </td>
                        {isAdmin && (
                          <td style={td}>
                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              <button onClick={() => abrirEditarExtra(ex)} style={btnLink}>Editar</button>
                              {ex.recorrente ? (
                                <button onClick={() => excluirDoMes(ex, mesNum)} style={{ ...btnLink, color: "#d97706" }} title="Remover só deste mês">
                                  Tirar deste mês
                                </button>
                              ) : (
                                <button onClick={() => excluirExtra(ex)} style={{ ...btnLink, color: "#dc2626" }}>Excluir</button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}

                  {/* Gastos recorrentes excluídos deste mês (mostrar esmaecido com opção de restaurar) */}
                  {excluidos.map((ex) => (
                    <tr key={"exc-" + ex.id} style={{ borderBottom: "1px solid #f1f5f9", opacity: 0.35 }}>
                      <td style={{ ...td, width: 30, padding: "10px 6px" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#94a3b8" }}>visibility_off</span>
                      </td>
                      <td style={{ ...td, textDecoration: "line-through" }}>{ex.descricao}</td>
                      <td style={{ ...td, fontWeight: 600, color: "#94a3b8", textDecoration: "line-through" }}>{fmt(ex.valor)}</td>
                      <td style={td}>
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, fontWeight: 600, background: "#fef2f2", color: "#dc2626" }}>
                          Removido
                        </span>
                      </td>
                      {isAdmin && (
                        <td style={td}>
                          <button onClick={() => restaurarNoMes(ex, mesNum)} style={{ ...btnLink, color: "rgb(22,134,78)" }}>
                            Restaurar
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          })()}
        </div>
      )}

      {/* Seção inferior: Funcionários + Gastos Recorrentes */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Funcionários na Folha */}
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Funcionários na Folha</h3>
            {isAdmin && <button onClick={abrirNovoFunc} style={btnSmall}>+ Adicionar</button>}
          </div>

          {folhaFuncs.length === 0 ? (
            <p style={{ fontSize: 13, color: "#94a3b8" }}>Nenhum funcionário na folha.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {folhaFuncs.map((f) => (
                <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 12, background: "#f8fafc", borderRadius: 8, padding: "10px 14px" }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                    background: f.operadores?.avatar_url ? "none" : "#e2e8f0",
                    display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
                  }}>
                    {f.operadores?.avatar_url ? (
                      <img src={f.operadores.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#64748b" }}>{(f.operadores?.nome || "?").charAt(0)}</span>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: "#1e293b" }}>{f.operadores?.nome || "—"}</p>
                    <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>
                      Salário: {fmt(f.salario_base)} · VA: {fmt(f.vale_alimentacao)}
                    </p>
                  </div>
                  {isAdmin && (
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => abrirEditarFunc(f)} title="Editar" style={btnIcon}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
                      </button>
                      <button onClick={() => removerFunc(f)} title="Remover" style={{ ...btnIcon, color: "#dc2626" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Gastos Recorrentes */}
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Gastos Recorrentes</h3>
            {isAdmin && (
              <button onClick={() => {
                setEditandoExtra(null);
                setFormExtra({ descricao: "", valor: "", tipo: "todos", mes: 1 });
                setMostraFormExtra(true);
              }} style={{ ...btnSmall, background: "#d97706" }}>+ Adicionar</button>
            )}
          </div>

          {(() => {
            const recorrentes = extras.filter((e) => e.recorrente);
            if (recorrentes.length === 0) return <p style={{ fontSize: 13, color: "#94a3b8" }}>Nenhum gasto recorrente.</p>;
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {recorrentes.map((ex) => {
                  const excluidos = ex.meses_excluidos || [];
                  return (
                    <div key={ex.id} style={{ background: "#f8fafc", borderRadius: 8, padding: "10px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: "#1e293b" }}>{ex.descricao}</p>
                          <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>
                            Todos os meses
                            {excluidos.length > 0 && (
                              <span style={{ color: "#d97706" }}> (exceto {excluidos.map((m) => MESES[m - 1]).join(", ")})</span>
                            )}
                          </p>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: "#d97706" }}>{fmt(ex.valor)}</span>
                          {isAdmin && (
                            <div style={{ display: "flex", gap: 4 }}>
                              <button onClick={() => abrirEditarExtra(ex)} style={btnIcon}>
                                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
                              </button>
                              <button onClick={() => excluirExtra(ex)} style={{ ...btnIcon, color: "#dc2626" }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>

      {/* ─── Modal: Funcionário ─── */}
      {mostraFormFunc && (
        <Modal onClose={() => setMostraFormFunc(false)}>
          <h2 style={modalTitle}>{editandoFunc ? "Editar Funcionário" : "Adicionar à Folha"}</h2>
          <form onSubmit={salvarFunc} style={formCol}>
            <div>
              <label style={labelStyle}>Funcionário</label>
              <select value={formFunc.operator_id} onChange={(e) => setFormFunc({ ...formFunc, operator_id: e.target.value })} required style={inputStyle}>
                <option value="">Selecione...</option>
                {operadores.map((o) => (
                  <option key={o.id} value={o.id}>{o.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Salário Base (R$)</label>
              <input type="number" step="0.01" min="0" required value={formFunc.salario_base} onChange={(e) => setFormFunc({ ...formFunc, salario_base: e.target.value })} placeholder="0,00" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Vale Alimentação (R$)</label>
              <input type="number" step="0.01" min="0" value={formFunc.vale_alimentacao} onChange={(e) => setFormFunc({ ...formFunc, vale_alimentacao: e.target.value })} placeholder="0,00" style={inputStyle} />
            </div>
            {formFunc.salario_base && (
              <div style={{ background: "#f0fdf4", borderRadius: 8, padding: "10px 14px" }}>
                <p style={{ fontSize: 11, color: "#166534", margin: "0 0 4px", fontWeight: 600 }}>Custo mensal estimado</p>
                <p style={{ fontSize: 16, color: "#166534", fontWeight: 700, margin: 0 }}>
                  {fmt(
                    (Number(formFunc.salario_base) || 0) +
                    (Number(formFunc.vale_alimentacao) || 0) +
                    (Number(formFunc.salario_base) || 0) / 12 +
                    ((Number(formFunc.salario_base) || 0) + (Number(formFunc.salario_base) || 0) / 3) / 12
                  )}
                </p>
                <p style={{ fontSize: 10, color: "#166534", margin: "4px 0 0", opacity: 0.7 }}>Salário + VA + Prov. 13º + Prov. Férias</p>
              </div>
            )}
            <ModalButtons salvando={salvando} onCancel={() => setMostraFormFunc(false)} label={editandoFunc ? "Atualizar" : "Adicionar"} />
          </form>
        </Modal>
      )}

      {/* ─── Modal: Gasto Extra ─── */}
      {mostraFormExtra && (
        <Modal onClose={() => setMostraFormExtra(false)}>
          <h2 style={modalTitle}>{editandoExtra ? "Editar Gasto" : "Novo Gasto"}</h2>
          <form onSubmit={salvarExtra} style={formCol}>
            <div>
              <label style={labelStyle}>Descrição</label>
              <input type="text" required value={formExtra.descricao} onChange={(e) => setFormExtra({ ...formExtra, descricao: e.target.value })} placeholder="Ex: Pró-labore, Contador..." style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Valor (R$)</label>
              <input type="number" step="0.01" min="0" required value={formExtra.valor} onChange={(e) => setFormExtra({ ...formExtra, valor: e.target.value })} placeholder="0,00" style={inputStyle} />
            </div>

            {/* Frequência */}
            <div>
              <label style={labelStyle}>Frequência</label>
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                {[
                  { key: "todos", label: "Todos os meses", icon: "repeat" },
                  { key: "avulso", label: "Mês específico", icon: "event" },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setFormExtra({ ...formExtra, tipo: opt.key })}
                    style={{
                      flex: 1, padding: "10px 12px", borderRadius: 8,
                      border: formExtra.tipo === opt.key ? "2px solid rgb(22,134,78)" : "1px solid #e2e8f0",
                      background: formExtra.tipo === opt.key ? "#f0fdf4" : "#fff",
                      color: formExtra.tipo === opt.key ? "rgb(22,134,78)" : "#64748b",
                      fontSize: 12, fontWeight: 600, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{opt.icon}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {formExtra.tipo === "avulso" && (
              <div>
                <label style={labelStyle}>Mês</label>
                <select value={formExtra.mes} onChange={(e) => setFormExtra({ ...formExtra, mes: Number(e.target.value) })} style={inputStyle}>
                  {MESES_FULL.map((m, i) => (
                    <option key={i + 1} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
            )}

            {formExtra.tipo === "todos" && (
              <div style={{ background: "#eff6ff", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#1e40af" }}>
                Esse gasto vai aparecer em todos os 12 meses. Você pode remover de meses específicos depois abrindo o mês e clicando em "Tirar deste mês".
              </div>
            )}

            <ModalButtons salvando={salvando} onCancel={() => setMostraFormExtra(false)} label={editandoExtra ? "Atualizar" : "Adicionar"} />
          </form>
        </Modal>
      )}
    </div>
  );
}

// ─── Shared Components ───

function Modal({ children, onClose }) {
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "#fff", borderRadius: 14, padding: 28,
        width: 440, maxHeight: "90vh", overflow: "auto",
        boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
      }}>
        {children}
      </div>
    </div>
  );
}

function ModalButtons({ salvando, onCancel, label }) {
  return (
    <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
      <button type="button" onClick={onCancel} style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
        Cancelar
      </button>
      <button type="submit" disabled={salvando} style={{ flex: 1, padding: 10, borderRadius: 8, border: "none", background: "rgb(22,134,78)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: salvando ? 0.6 : 1 }}>
        {salvando ? "Salvando..." : label}
      </button>
    </div>
  );
}

// ─── Styles ───

const cardStyle = { background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" };
const cardLabel = { fontSize: 12, color: "#64748b", margin: "0 0 4px" };
const cardValor = { fontSize: 24, fontWeight: 700, margin: 0 };
const sectionTitle = { fontSize: 14, fontWeight: 600, color: "#64748b", margin: "0 0 10px", textTransform: "uppercase", letterSpacing: 0.5 };
const th = { textAlign: "left", padding: "8px 12px", fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase" };
const td = { padding: "10px 12px", fontSize: 13 };
const btnNav = { background: "#f1f5f9", border: "1px solid #e2e8f0", padding: "6px 12px", borderRadius: 6, fontSize: 14, cursor: "pointer", fontWeight: 600 };
const btnSmall = { padding: "6px 14px", borderRadius: 6, border: "none", background: "rgb(22,134,78)", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" };
const btnIcon = { background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 4, borderRadius: 4, display: "flex", alignItems: "center" };
const btnLink = { background: "none", border: "none", cursor: "pointer", color: "#2563eb", fontSize: 12, fontWeight: 500, padding: 0 };
const inputStyle = { width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, outline: "none", marginTop: 4, boxSizing: "border-box" };
const labelStyle = { fontSize: 12, fontWeight: 600, color: "#374151" };
const modalTitle = { fontSize: 18, fontWeight: 700, margin: "0 0 20px", color: "#1e293b" };
const formCol = { display: "flex", flexDirection: "column", gap: 14 };
