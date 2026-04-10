import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function Colaboradores() {
  const [colaboradores, setColaboradores] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    carregarColaboradores();
  }, []);

  async function carregarColaboradores() {
    setCarregando(true);
    const { data, error } = await supabase
      .from("employees")
      .select("id, first_name, last_name, email, status, hire_date, contract_type")
      .order("first_name");

    if (!error && data) {
      setColaboradores(data);
    }
    setCarregando(false);
  }

  const filtrados = colaboradores.filter(
    (c) =>
      c.first_name?.toLowerCase().includes(busca.toLowerCase()) ||
      c.last_name?.toLowerCase().includes(busca.toLowerCase()) ||
      c.email?.toLowerCase().includes(busca.toLowerCase())
  );

  const statusCor = {
    active: { bg: "#dcfce7", text: "#166534", label: "Ativo" },
    inactive: { bg: "#fef3c7", text: "#92400e", label: "Inativo" },
    terminated: { bg: "#fecaca", text: "#991b1b", label: "Desligado" },
    on_leave: { bg: "#dbeafe", text: "#1e40af", label: "Afastado" },
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Colaboradores</h1>
        <button
          style={{
            background: "#1e40af",
            color: "#fff",
            border: "none",
            padding: "8px 16px",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          + Novo Colaborador
        </button>
      </div>

      {/* Busca */}
      <input
        type="text"
        placeholder="Buscar por nome ou e-mail..."
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        style={{
          width: "100%",
          maxWidth: 400,
          padding: "10px 14px",
          border: "1px solid #d1d5db",
          borderRadius: 6,
          fontSize: 14,
          marginBottom: 16,
          outline: "none",
        }}
      />

      {/* Tabela */}
      <div
        style={{
          background: "#fff",
          borderRadius: 10,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          overflow: "auto",
        }}
      >
        {carregando ? (
          <p style={{ padding: 20, color: "#94a3b8", textAlign: "center" }}>
            Carregando...
          </p>
        ) : filtrados.length === 0 ? (
          <p style={{ padding: 20, color: "#94a3b8", textAlign: "center" }}>
            Nenhum colaborador encontrado.
          </p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                {["Nome", "E-mail", "Status", "Contrato", "Admissão"].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "12px 16px",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#64748b",
                      textTransform: "uppercase",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((c) => {
                const st = statusCor[c.status] || statusCor.active;
                return (
                  <tr key={c.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px 16px", fontSize: 14, fontWeight: 500 }}>
                      {c.first_name} {c.last_name}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 14, color: "#64748b" }}>
                      {c.email}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        style={{
                          background: st.bg,
                          color: st.text,
                          padding: "3px 10px",
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {st.label}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 14, color: "#64748b", textTransform: "uppercase" }}>
                      {c.contract_type}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 14, color: "#64748b" }}>
                      {c.hire_date || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
