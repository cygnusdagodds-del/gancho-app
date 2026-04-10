import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/useAuth";
import { useToast } from "../lib/useToast";
import { useConfirm } from "../lib/useConfirm";

export default function Aprovacoes() {
  const { operator } = useAuth();
  const toast = useToast();
  const { confirm, prompt } = useConfirm();
  const [pendentes, setPendentes] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const { data } = await supabase
      .from("operadores")
      .select("id, nome, email, created_at, status")
      .eq("status", "pendente")
      .order("created_at", { ascending: true });

    setPendentes(data || []);
    setCarregando(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function aprovar(id) {
    const { error } = await supabase.from("operadores").update({ status: "aprovado" }).eq("id", id);
    if (error) toast.error("Erro ao aprovar: " + error.message);
    else { toast.success("Cadastro aprovado!"); carregar(); }
  }

  async function recusar(id) {
    const motivo = await prompt("Motivo da recusa (opcional):", { title: "Recusar cadastro", placeholder: "Ex: dados incompletos...", confirmText: "Recusar", danger: true });
    if (motivo === null) return;
    const { error } = await supabase.from("operadores").update({ status: "recusado" }).eq("id", id);
    if (error) toast.error("Erro ao recusar: " + error.message);
    else { toast.success("Cadastro recusado."); carregar(); }
  }

  function formatData(dateStr) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Aprovação de Cadastros</h1>

      {carregando ? (
        <p style={{ color: "#94a3b8" }}>Carregando...</p>
      ) : pendentes.length === 0 ? (
        <div style={{
          background: "#f0fdf4", borderRadius: 8, padding: 20,
          textAlign: "center", color: "#166534", fontSize: 14,
        }}>
          Nenhum cadastro pendente de aprovação.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ fontSize: 14, color: "#64748b", margin: 0 }}>
            {pendentes.length} cadastro{pendentes.length > 1 ? "s" : ""} aguardando aprovação
          </p>

          {pendentes.map((p) => (
            <div
              key={p.id}
              style={{
                background: "#fff",
                borderRadius: 10,
                padding: 20,
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div>
                <p style={{ fontSize: 16, fontWeight: 600, color: "#1e293b", margin: 0 }}>
                  {p.nome}
                </p>
                <p style={{ fontSize: 13, color: "#64748b", margin: "4px 0 0" }}>
                  {p.email}
                </p>
                <p style={{ fontSize: 11, color: "#94a3b8", margin: "2px 0 0" }}>
                  Cadastro em {formatData(p.created_at)}
                </p>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => aprovar(p.id)}
                  style={{
                    padding: "8px 20px",
                    borderRadius: 6,
                    border: "none",
                    background: "#16a34a",
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Aprovar
                </button>
                <button
                  onClick={() => recusar(p.id)}
                  style={{
                    padding: "8px 20px",
                    borderRadius: 6,
                    border: "1px solid #fecaca",
                    background: "#fff",
                    color: "#dc2626",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Recusar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
