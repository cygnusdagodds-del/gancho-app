import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useToast } from "../lib/useToast";
import { useConfirm } from "../lib/useConfirm";

export default function Funcionarios() {
  const toast = useToast();
  const { confirm } = useConfirm();
  const [funcionarios, setFuncionarios] = useState([]);
  const [pendentes, setPendentes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [mostraForm, setMostraForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(formVazio());
  const [salvando, setSalvando] = useState(false);
  const [hoveredRow, setHoveredRow] = useState(null);
  const [senhaModal, setSenhaModal] = useState(null); // { id, nome, senha_atual, nova_senha }

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
      ultimo_exame_periodico: "",
    };
  }

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setCarregando(true);

    const { data, error } = await supabase
      .from("operadores")
      .select("*")
      .in("status", ["aprovado", "active"])
      .order("nome");

    if (!error && data) {
      setFuncionarios(data);
    }

    const { data: pend } = await supabase
      .from("operadores")
      .select("*")
      .eq("status", "pendente")
      .order("created_at", { ascending: false });

    setPendentes(pend || []);
    setCarregando(false);
  }

  async function aprovar(id, nome) {
    const { error } = await supabase
      .from("operadores")
      .update({ status: "aprovado" })
      .eq("id", id);
    if (error) {
      toast.error("Erro ao aprovar: " + error.message);
    } else {
      toast.success("Cadastro aprovado!");
      carregar();
    }
  }

  async function recusar(id) {
    const ok = await confirm("Tem certeza que deseja recusar este cadastro?", { title: "Recusar cadastro", confirmText: "Recusar", danger: true });
    if (!ok) return;
    const { error } = await supabase
      .from("operadores")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error("Erro ao recusar: " + error.message);
    } else {
      toast.success("Cadastro recusado.");
      carregar();
    }
  }

  const filtrados = funcionarios.filter(
    (f) =>
      f.nome?.toLowerCase().includes(busca.toLowerCase()) ||
      f.email?.toLowerCase().includes(busca.toLowerCase()) ||
      f.cargo?.toLowerCase().includes(busca.toLowerCase()) ||
      f.departamento?.toLowerCase().includes(busca.toLowerCase())
  );

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
      ultimo_exame_periodico: f.ultimo_exame_periodico || "",
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

    const dados = { ...form };
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
      const { error } = await supabase.from("operadores").update(dados).eq("id", editando);
      if (error) toast.error("Erro ao atualizar: " + error.message);
      else toast.success("Funcionário atualizado!");
    } else {
      dados.senha_hash = Math.random().toString(36).slice(2, 10);
      const { error } = await supabase.from("operadores").insert(dados);
      if (error) toast.error("Erro ao criar: " + error.message);
      else toast.success("Funcionário criado!");
    }

    setSalvando(false);
    setMostraForm(false);
    setEditando(null);
    carregar();
  }

  async function excluir(f) {
    const ok = await confirm(`Tem certeza que deseja excluir ${f.nome}?\n\nEssa ação não pode ser desfeita.`, { title: "Excluir funcionário", confirmText: "Excluir", danger: true });
    if (!ok) return;
    const { error } = await supabase.from("operadores").delete().eq("id", f.id);
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
      nova_senha: "",
    });
  }

  async function salvarNovaSenha() {
    if (!senhaModal || !senhaModal.nova_senha.trim()) {
      toast.warn("Digite a nova senha.");
      return;
    }
    const { error } = await supabase
      .from("operadores")
      .update({ senha_hash: senhaModal.nova_senha.trim() })
      .eq("id", senhaModal.id);
    if (error) toast.error("Erro: " + error.message);
    else {
      toast.success("Senha alterada!");
      setSenhaModal(null);
      carregar();
    }
  }

  const cargoCor = {
    admin: { bg: "#ede9fe", text: "#7c3aed", border: "#c4b5fd", label: "Admin" },
    rh: { bg: "#dbeafe", text: "#2563eb", border: "#93c5fd", label: "RH" },
    gestor: { bg: "#fef3c7", text: "#d97706", border: "#fcd34d", label: "Gestor" },
    colaborador: { bg: "#f0fdf4", text: "#16a34a", border: "#86efac", label: "Colaborador" },
  };

  const contratoCor = {
    clt: { bg: "#eff6ff", text: "#1d4ed8", label: "CLT" },
    pj: { bg: "#faf5ff", text: "#7c3aed", label: "PJ" },
    estagio: { bg: "#ecfdf5", text: "#059669", label: "Estágio" },
    temporario: { bg: "#fff7ed", text: "#ea580c", label: "Temporário" },
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

  function formatDate(dateStr) {
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
      return Math.floor(diff / (1000 * 60 * 60 * 24));
    } catch {
      return null;
    }
  }

  function exameStatus(dateStr) {
    const dias = diasDesde(dateStr);
    if (dias === null) return { label: "Não informado", color: "#94a3b8", bg: "#f8fafc" };
    if (dias > 365) return { label: `${formatDate(dateStr)} (vencido)`, color: "#dc2626", bg: "#fef2f2" };
    if (dias > 300) return { label: `${formatDate(dateStr)} (vence em breve)`, color: "#d97706", bg: "#fffbeb" };
    return { label: formatDate(dateStr), color: "#16a34a", bg: "#f0fdf4" };
  }

  const inputStyle = {
    display: "block", width: "100%", padding: "10px 14px",
    border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14,
    outline: "none", marginTop: 4, boxSizing: "border-box",
    transition: "border-color 0.2s, box-shadow 0.2s",
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#0f172a", margin: 0 }}>Funcionários</h1>
          <p style={{ fontSize: 14, color: "#64748b", margin: "4px 0 0" }}>
            {funcionarios.length} colaborador{funcionarios.length !== 1 ? "es" : ""} ativo{funcionarios.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={abrirNovo}
          style={{
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
            transition: "transform 0.15s, box-shadow 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(30,64,175,0.4)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(30,64,175,0.3)"; }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
          Novo Funcionário
        </button>
      </div>

      {/* Cadastros Pendentes */}
      {pendentes.length > 0 && (
        <div style={{
          background: "linear-gradient(135deg, #fffbeb, #fef3c7)",
          border: "1px solid #fde68a",
          borderRadius: 12,
          padding: 20,
          marginBottom: 24,
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#92400e", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              background: "#dc2626",
              color: "#fff",
              borderRadius: "50%",
              width: 24,
              height: 24,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 700,
            }}>{pendentes.length}</span>
            Cadastro{pendentes.length > 1 ? "s" : ""} aguardando aprovação
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {pendentes.map((p) => (
              <div key={p.id} style={{
                background: "#fff",
                borderRadius: 10,
                padding: "14px 18px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: getAvatarColor(p.nome), color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 700,
                  }}>{getIniciais(p.nome)}</div>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 14, color: "#1e293b" }}>{p.nome}</span>
                    <span style={{ color: "#64748b", fontSize: 13, marginLeft: 10 }}>{p.email}</span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {p.created_at && (
                    <span style={{ color: "#94a3b8", fontSize: 12 }}>
                      {new Date(p.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  )}
                  <button
                    onClick={() => aprovar(p.id, p.nome)}
                    style={{
                      background: "#16a34a", color: "#fff", border: "none",
                      padding: "6px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
                    }}
                  >Aprovar</button>
                  <button
                    onClick={() => recusar(p.id)}
                    style={{
                      background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca",
                      padding: "6px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
                    }}
                  >Recusar</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 20 }}>
        <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: 16 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>
        <input
          type="text"
          placeholder="Buscar por nome, e-mail, cargo ou departamento..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={{
            width: "100%", maxWidth: 460, padding: "11px 14px 11px 40px",
            border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 14,
            outline: "none", boxSizing: "border-box",
            transition: "border-color 0.2s, box-shadow 0.2s",
            background: "#fff",
          }}
          onFocus={(e) => { e.target.style.borderColor = "#3b82f6"; e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.1)"; }}
          onBlur={(e) => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; }}
        />
      </div>

      {/* Form */}
      {mostraForm && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(4px)",
        }} onClick={(e) => { if (e.target === e.currentTarget) { setMostraForm(false); setEditando(null); } }}>
          <form onSubmit={salvar} style={{
            background: "#fff", borderRadius: 16, padding: 28, width: "100%", maxWidth: 640,
            boxShadow: "0 20px 60px rgba(0,0,0,0.15)", maxHeight: "90vh", overflowY: "auto",
            animation: "slideUp 0.2s ease-out",
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", margin: 0 }}>
                {editando ? "Editar Funcionário" : "Novo Funcionário"}
              </h3>
              <button type="button" onClick={() => { setMostraForm(false); setEditando(null); }}
                style={{ background: "#f1f5f9", border: "none", width: 32, height: 32, borderRadius: 8, fontSize: 16, cursor: "pointer", color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center" }}>
                ✕
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[
                { key: "nome", label: "Nome completo", type: "text", required: true },
                { key: "email", label: "E-mail", type: "email", required: true },
                { key: "telefone", label: "Telefone", type: "text" },
                { key: "cpf", label: "CPF", type: "text" },
                { key: "teamlogger_email", label: "E-mail TeamLogger", type: "email" },
                { key: "departamento", label: "Departamento", type: "text" },
                { key: "data_admissao", label: "Data de Admissão", type: "date" },
                { key: "salario_base", label: "Salário Base", type: "number" },
                { key: "ultimo_exame_periodico", label: "Último Exame Periódico", type: "date" },
              ].map((campo) => (
                <div key={campo.key}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", letterSpacing: "0.01em" }}>{campo.label}</label>
                  <input
                    type={campo.type}
                    value={form[campo.key]}
                    onChange={(e) => setForm({ ...form, [campo.key]: e.target.value })}
                    required={campo.required}
                    style={inputStyle}
                    onFocus={(e) => { e.target.style.borderColor = "#3b82f6"; e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.1)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; }}
                  />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Cargo / Permissão</label>
                <select value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} style={{ ...inputStyle, background: "#fff" }}>
                  <option value="colaborador">Colaborador</option>
                  <option value="gestor">Gestor</option>
                  <option value="rh">RH</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Tipo de Contrato</label>
                <select value={form.tipo_contrato} onChange={(e) => setForm({ ...form, tipo_contrato: e.target.value })} style={{ ...inputStyle, background: "#fff" }}>
                  <option value="clt">CLT</option>
                  <option value="pj">PJ</option>
                  <option value="estagio">Estágio</option>
                  <option value="temporario">Temporário</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Observações</label>
              <textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={2}
                style={{ ...inputStyle, resize: "vertical" }}
                onFocus={(e) => { e.target.style.borderColor = "#3b82f6"; e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.1)"; }}
                onBlur={(e) => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; }}
              />
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => { setMostraForm(false); setEditando(null); }}
                style={{ background: "#f1f5f9", color: "#475569", border: "none", padding: "10px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                Cancelar
              </button>
              <button type="submit" disabled={salvando}
                style={{
                  background: salvando ? "#93c5fd" : "linear-gradient(135deg, #1e40af, #3b82f6)",
                  color: "#fff", border: "none", padding: "10px 24px", borderRadius: 8,
                  fontSize: 14, fontWeight: 600, cursor: salvando ? "not-allowed" : "pointer",
                  boxShadow: "0 2px 8px rgba(30,64,175,0.3)",
                }}>
                {salvando ? "Salvando..." : editando ? "Atualizar" : "Cadastrar"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)", overflow: "hidden", border: "1px solid #e2e8f0" }}>
        {carregando ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <div style={{ width: 32, height: 32, border: "3px solid #e2e8f0", borderTopColor: "#3b82f6", borderRadius: "50%", margin: "0 auto 12px", animation: "spin 0.8s linear infinite" }} />
            <p style={{ color: "#94a3b8", fontSize: 14 }}>Carregando funcionários...</p>
          </div>
        ) : filtrados.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <p style={{ color: "#94a3b8", fontSize: 14 }}>Nenhum funcionário encontrado.</p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                {["Funcionário", "Cargo", "Departamento", "Contrato", "Admissão", "Último Exame", "Ações"].map((h) => (
                  <th key={h} style={{
                    textAlign: "left", padding: "14px 16px", fontSize: 11,
                    fontWeight: 700, color: "#64748b", textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((f) => {
                const cc = cargoCor[f.cargo] || cargoCor.colaborador;
                const ct = contratoCor[f.tipo_contrato] || contratoCor.clt;
                const exame = exameStatus(f.ultimo_exame_periodico);
                const isHovered = hoveredRow === f.id;
                return (
                  <tr
                    key={f.id}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      background: isHovered ? "#f8fafc" : "transparent",
                      transition: "background 0.15s",
                      cursor: "default",
                    }}
                    onMouseEnter={() => setHoveredRow(f.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    {/* Funcionário - nome + email + avatar */}
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: "50%",
                          background: f.avatar_url ? "transparent" : getAvatarColor(f.nome),
                          color: "#fff",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 14, fontWeight: 700, flexShrink: 0,
                          overflow: "hidden",
                        }}>
                          {f.avatar_url ? (
                            <img src={f.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : getIniciais(f.nome)}
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", lineHeight: 1.3 }}>{f.nome}</div>
                          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{f.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Cargo */}
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{
                        background: cc.bg, color: cc.text, border: `1px solid ${cc.border}`,
                        padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}>{cc.label}</span>
                    </td>

                    {/* Departamento */}
                    <td style={{ padding: "14px 16px", fontSize: 14, color: f.departamento ? "#334155" : "#cbd5e1" }}>
                      {f.departamento || "—"}
                    </td>

                    {/* Contrato */}
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{
                        background: ct.bg, color: ct.text,
                        padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}>{ct.label}</span>
                    </td>

                    {/* Admissão */}
                    <td style={{ padding: "14px 16px", fontSize: 13, color: "#475569" }}>
                      {formatDate(f.data_admissao) || <span style={{ color: "#cbd5e1" }}>—</span>}
                    </td>

                    {/* Último Exame */}
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{
                        fontSize: 12, fontWeight: 500,
                        color: exame.color, background: exame.bg,
                        padding: "3px 8px", borderRadius: 6,
                        whiteSpace: "nowrap",
                      }}>{exame.label}</span>
                    </td>

                    {/* Ações */}
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", gap: 6, opacity: isHovered ? 1 : 0.6, transition: "opacity 0.15s" }}>
                        <button onClick={() => abrirEditar(f)}
                          style={{
                            background: "#f1f5f9", border: "1px solid #e2e8f0",
                            padding: "6px 14px", borderRadius: 6, fontSize: 12,
                            cursor: "pointer", fontWeight: 600, color: "#475569",
                            transition: "all 0.15s",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "#e2e8f0"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "#f1f5f9"; }}
                        >Editar</button>
                        <button onClick={() => abrirSenha(f)}
                          style={{
                            background: "#eff6ff", border: "1px solid #bfdbfe",
                            padding: "6px 14px", borderRadius: 6, fontSize: 12,
                            cursor: "pointer", fontWeight: 600, color: "#1e40af",
                            transition: "all 0.15s",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "#dbeafe"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "#eff6ff"; }}
                        >Senha</button>
                        <button onClick={() => excluir(f)}
                          style={{
                            background: "#fef2f2", border: "1px solid #fecaca",
                            padding: "6px 14px", borderRadius: 6, fontSize: 12,
                            cursor: "pointer", fontWeight: 600, color: "#dc2626",
                            transition: "all 0.15s",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "#fee2e2"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "#fef2f2"; }}
                        >Excluir</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 12, textAlign: "right" }}>
        {filtrados.length} de {funcionarios.length} funcionário{funcionarios.length !== 1 ? "s" : ""}
      </p>

      {/* Modal de Senha */}
      {senhaModal && (
        <div
          onClick={() => setSenhaModal(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff", borderRadius: 14, padding: 28,
              width: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
              animation: "slideUp 0.2s ease-out",
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 6px", color: "#1e293b" }}>
              Senha — {senhaModal.nome}
            </h2>
            <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 20px" }}>
              Visualize ou altere a senha deste funcionário.
            </p>

            {/* Senha atual */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>
                Senha atual
              </label>
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: "10px 14px",
              }}>
                <code style={{ flex: 1, fontSize: 15, fontWeight: 600, color: "#0f172a", fontFamily: "monospace", letterSpacing: 1 }}>
                  {senhaModal.senha_atual || "(sem senha)"}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(senhaModal.senha_atual);
                    toast.success("Senha copiada!");
                  }}
                  title="Copiar"
                  style={{
                    background: "none", border: "none", cursor: "pointer", color: "#64748b",
                    display: "flex", alignItems: "center", padding: 4,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>content_copy</span>
                </button>
              </div>
            </div>

            {/* Nova senha */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>
                Nova senha
              </label>
              <input
                type="text"
                value={senhaModal.nova_senha}
                onChange={(e) => setSenhaModal({ ...senhaModal, nova_senha: e.target.value })}
                placeholder="Digite a nova senha..."
                style={{
                  width: "100%", padding: "10px 14px", border: "1px solid #d1d5db",
                  borderRadius: 6, fontSize: 14, outline: "none", boxSizing: "border-box",
                }}
                onKeyDown={(e) => e.key === "Enter" && salvarNovaSenha()}
              />
            </div>

            {/* Botões */}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setSenhaModal(null)}
                style={{
                  flex: 1, padding: 10, borderRadius: 8, border: "1px solid #e2e8f0",
                  background: "#fff", color: "#64748b", fontSize: 14, fontWeight: 600, cursor: "pointer",
                }}
              >
                Fechar
              </button>
              <button
                onClick={salvarNovaSenha}
                disabled={!senhaModal.nova_senha.trim()}
                style={{
                  flex: 1, padding: 10, borderRadius: 8, border: "none",
                  background: senhaModal.nova_senha.trim() ? "#1e40af" : "#e2e8f0",
                  color: senhaModal.nova_senha.trim() ? "#fff" : "#94a3b8",
                  fontSize: 14, fontWeight: 600,
                  cursor: senhaModal.nova_senha.trim() ? "pointer" : "default",
                }}
              >
                Alterar Senha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS animations */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
