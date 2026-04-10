import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/useAuth";
import { useToast } from "../lib/useToast";
import { useConfirm } from "../lib/useConfirm";

const PRIORIDADE_COR = {
  normal: { bg: "#eff6ff", border: "#bfdbfe", text: "#1e40af", label: "Normal" },
  importante: { bg: "#fffbeb", border: "#fde68a", text: "#92400e", label: "Importante" },
  urgente: { bg: "#fef2f2", border: "#fecaca", text: "#dc2626", label: "Urgente" },
};

export default function Mural() {
  const { operator } = useAuth();
  const toast = useToast();
  const { confirm } = useConfirm();
  const [comunicados, setComunicados] = useState([]);
  const [lidos, setLidos] = useState(new Set());
  const [carregando, setCarregando] = useState(true);
  const [mostraForm, setMostraForm] = useState(false);
  const [form, setForm] = useState({ titulo: "", conteudo: "", prioridade: "normal" });
  const [salvando, setSalvando] = useState(false);

  const isAdmin = operator?.cargo === "admin" || operator?.cargo === "rh" || operator?.cargo === "gestor";

  const carregar = useCallback(async () => {
    setCarregando(true);

    const { data } = await supabase
      .from("comunicados")
      .select("*")
      .eq("ativo", true)
      .order("created_at", { ascending: false });

    // Buscar avatar dos autores
    const autorIds = [...new Set((data || []).map(c => c.created_by).filter(Boolean))];
    let avatarMap = {};
    if (autorIds.length > 0) {
      const { data: autores } = await supabase
        .from("operadores")
        .select("id, avatar_url")
        .in("id", autorIds);
      (autores || []).forEach(a => { avatarMap[a.id] = a.avatar_url; });
    }

    setComunicados((data || []).map(c => ({ ...c, autor_avatar: avatarMap[c.created_by] || null })));

    // Buscar quais o usuário já leu
    if (operator) {
      const { data: lidosData } = await supabase
        .from("comunicados_lidos")
        .select("comunicado_id")
        .eq("operator_id", operator.id);

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
      operator_id: operator.id,
    });
    setLidos((prev) => new Set([...prev, comunicadoId]));
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
      created_by_nome: operator.nome,
    });

    setForm({ titulo: "", conteudo: "", prioridade: "normal" });
    setMostraForm(false);
    setSalvando(false);
    carregar();
  }

  async function arquivar(id) {
    const ok = await confirm("Arquivar este comunicado? Ele não aparecerá mais no mural.", { title: "Arquivar comunicado", confirmText: "Arquivar", danger: false });
    if (!ok) return;
    await supabase.from("comunicados").update({ ativo: false }).eq("id", id);
    toast.success("Comunicado arquivado.");
    carregar();
  }

  function tempoAtras(dateStr) {
    const agora = new Date();
    const data = new Date(dateStr);
    const diff = Math.floor((agora - data) / 1000);
    if (diff < 60) return "agora";
    if (diff < 3600) return `${Math.floor(diff / 60)} min atrás`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
    const dias = Math.floor(diff / 86400);
    if (dias === 1) return "ontem";
    if (dias < 7) return `${dias} dias atrás`;
    return data.toLocaleDateString("pt-BR");
  }

  const naoLidos = comunicados.filter((c) => !lidos.has(c.id)).length;

  const inputStyle = {
    display: "block", width: "100%", padding: "10px 12px",
    border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14,
    outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 2 }}>Mural de Comunicados</h1>
          {naoLidos > 0 && (
            <p style={{ fontSize: 13, color: "#dc2626", fontWeight: 600, margin: 0 }}>
              {naoLidos} comunicado{naoLidos > 1 ? "s" : ""} não lido{naoLidos > 1 ? "s" : ""}
            </p>
          )}
        </div>
        {isAdmin && (
          <button
            onClick={() => setMostraForm(!mostraForm)}
            style={{
              background: "#1e40af", color: "#fff", border: "none",
              padding: "8px 16px", borderRadius: 6, fontSize: 13,
              fontWeight: 600, cursor: "pointer",
            }}
          >
            {mostraForm ? "Cancelar" : "+ Novo comunicado"}
          </button>
        )}
      </div>

      {/* Formulário de novo comunicado */}
      {mostraForm && (
        <form onSubmit={publicar} style={{
          background: "#fff", borderRadius: 10, padding: 24,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)", marginBottom: 20,
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Novo Comunicado</h3>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: "#374151", display: "block", marginBottom: 4 }}>Título</label>
                <input
                  type="text" value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  required placeholder="Título do comunicado"
                  style={inputStyle}
                />
              </div>
              <div style={{ width: 160 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: "#374151", display: "block", marginBottom: 4 }}>Prioridade</label>
                <select
                  value={form.prioridade}
                  onChange={(e) => setForm({ ...form, prioridade: e.target.value })}
                  style={{ ...inputStyle, background: "#fff" }}
                >
                  <option value="normal">Normal</option>
                  <option value="importante">Importante</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: "#374151", display: "block", marginBottom: 4 }}>Conteúdo</label>
              <textarea
                value={form.conteudo}
                onChange={(e) => setForm({ ...form, conteudo: e.target.value })}
                required rows={4} placeholder="Escreva o comunicado..."
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </div>
          </div>

          <button type="submit" disabled={salvando} style={{
            marginTop: 14, background: salvando ? "#93c5fd" : "#1e40af",
            color: "#fff", border: "none", padding: "10px 24px",
            borderRadius: 8, fontSize: 14, fontWeight: 600,
            cursor: salvando ? "not-allowed" : "pointer",
          }}>
            {salvando ? "Publicando..." : "Publicar comunicado"}
          </button>
        </form>
      )}

      {/* Lista de comunicados */}
      {carregando ? (
        <p style={{ color: "#94a3b8" }}>Carregando...</p>
      ) : comunicados.length === 0 ? (
        <div style={{
          background: "#f8fafc", borderRadius: 10, padding: 30,
          textAlign: "center", color: "#94a3b8",
        }}>
          Nenhum comunicado publicado.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {comunicados.map((c) => {
            const cor = PRIORIDADE_COR[c.prioridade] || PRIORIDADE_COR.normal;
            const jaLeu = lidos.has(c.id);

            return (
              <div
                key={c.id}
                onClick={() => marcarLido(c.id)}
                style={{
                  background: "#fff",
                  borderRadius: 10,
                  padding: 20,
                  boxShadow: jaLeu ? "0 1px 2px rgba(0,0,0,0.04)" : "0 2px 8px rgba(0,0,0,0.1)",
                  borderLeft: `4px solid ${cor.text}`,
                  opacity: jaLeu ? 0.85 : 1,
                  cursor: jaLeu ? "default" : "pointer",
                  position: "relative",
                  transition: "all 0.15s",
                }}
              >
                {/* Badge não lido */}
                {!jaLeu && (
                  <span style={{
                    position: "absolute", top: 12, right: 12,
                    background: "#ef4444", color: "#fff", fontSize: 9,
                    fontWeight: 700, padding: "2px 8px", borderRadius: 10,
                  }}>
                    NOVO
                  </span>
                )}

                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{
                    background: cor.bg, color: cor.text, border: `1px solid ${cor.border}`,
                    padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                  }}>
                    {cor.label}
                  </span>
                  <span style={{ fontSize: 12, color: "#94a3b8" }}>
                    {tempoAtras(c.created_at)}
                  </span>
                </div>

                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", marginBottom: 6 }}>
                  {c.titulo}
                </h3>

                <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.6, whiteSpace: "pre-wrap", margin: 0 }}>
                  {c.conteudo}
                </p>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                  <span style={{ fontSize: 12, color: "#94a3b8", display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{
                      width: 22, height: 22, borderRadius: "50%", overflow: "hidden",
                      background: "#e2e8f0", display: "inline-flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      {c.autor_avatar ? (
                        <img src={c.autor_avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8" }}>
                          {(c.created_by_nome || "?").charAt(0).toUpperCase()}
                        </span>
                      )}
                    </span>
                    Publicado por {c.created_by_nome || "—"}
                  </span>

                  {isAdmin && (
                    <button
                      onClick={(e) => { e.stopPropagation(); arquivar(c.id); }}
                      style={{
                        background: "none", border: "1px solid #e2e8f0",
                        padding: "3px 10px", borderRadius: 4, fontSize: 11,
                        cursor: "pointer", color: "#94a3b8",
                      }}
                    >
                      Arquivar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
