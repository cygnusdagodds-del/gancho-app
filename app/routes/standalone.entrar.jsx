import { useState } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../lib/supabase";

export default function Entrar() {
  const [tab, setTab] = useState("login"); // "login" | "cadastro"
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [carregando, setCarregando] = useState(false);
  const navigate = useNavigate();

  function limpar() {
    setErro("");
    setSucesso("");
  }

  async function handleLogin(e) {
    e.preventDefault();
    limpar();
    setCarregando(true);

    try {
      const { data, error } = await supabase
        .from("operadores")
        .select("id, nome, email, cargo, senha_hash, status, teamlogger_email, avatar_url")
        .eq("email", email)
        .single();

      if (error || !data) {
        setErro("E-mail não encontrado.");
        setCarregando(false);
        return;
      }

      if (data.status === "pendente") {
        setErro("Seu cadastro ainda está aguardando aprovação do administrador.");
        setCarregando(false);
        return;
      }

      if (data.status === "recusado") {
        setErro("Seu cadastro foi recusado. Entre em contato com o RH.");
        setCarregando(false);
        return;
      }

      if (data.senha_hash !== senha) {
        setErro("Senha incorreta.");
        setCarregando(false);
        return;
      }

      localStorage.setItem(
        "rh_operator",
        JSON.stringify({
          id: data.id,
          nome: data.nome,
          email: data.email,
          cargo: data.cargo,
          teamlogger_email: data.teamlogger_email || "",
          avatar_url: data.avatar_url || null,
        })
      );

      window.location.href = "/standalone";
    } catch {
      setErro("Erro ao conectar. Tente novamente.");
    }

    setCarregando(false);
  }

  async function handleCadastro(e) {
    e.preventDefault();
    limpar();
    setCarregando(true);

    try {
      // Verificar se já existe
      const { data: existente } = await supabase
        .from("operadores")
        .select("id, status")
        .eq("email", email)
        .single();

      if (existente) {
        if (existente.status === "pendente") {
          setErro("Cadastro já enviado. Aguarde aprovação do administrador.");
        } else {
          setErro("Este e-mail já está cadastrado. Faça login.");
        }
        setCarregando(false);
        return;
      }

      // Criar com status pendente
      const { error } = await supabase.from("operadores").insert({
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        senha_hash: senha,
        cargo: "colaborador",
        status: "pendente",
      });

      if (error) {
        setErro("Erro ao cadastrar: " + error.message);
        setCarregando(false);
        return;
      }

      setSucesso("Cadastro enviado! Aguarde a aprovação do administrador para poder entrar.");
      setNome("");
      setEmail("");
      setSenha("");
    } catch {
      setErro("Erro ao conectar. Tente novamente.");
    }

    setCarregando(false);
  }

  const inputStyle = {
    padding: "10px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    fontSize: 14,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "#f1f5f9",
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: 40,
          borderRadius: 12,
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          width: "100%",
          maxWidth: 420,
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 700, textAlign: "center", color: "#0f172a", marginBottom: 4 }}>
          RH Cygnuss
        </h1>
        <p style={{ fontSize: 14, color: "#64748b", textAlign: "center", marginBottom: 20 }}>
          {tab === "login" ? "Acesse sua conta" : "Crie sua conta"}
        </p>

        {/* Tabs */}
        <div style={{ display: "flex", marginBottom: 20, borderRadius: 8, overflow: "hidden", border: "1px solid #e2e8f0" }}>
          <button
            onClick={() => { setTab("login"); limpar(); }}
            style={{
              flex: 1,
              padding: "10px 0",
              border: "none",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              background: tab === "login" ? "#1e40af" : "#f8fafc",
              color: tab === "login" ? "#fff" : "#64748b",
              transition: "all 0.15s",
            }}
          >
            Entrar
          </button>
          <button
            onClick={() => { setTab("cadastro"); limpar(); }}
            style={{
              flex: 1,
              padding: "10px 0",
              border: "none",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              background: tab === "cadastro" ? "#1e40af" : "#f8fafc",
              color: tab === "cadastro" ? "#fff" : "#64748b",
              transition: "all 0.15s",
            }}
          >
            Cadastrar
          </button>
        </div>

        {erro && (
          <div style={{
            background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626",
            padding: "8px 12px", borderRadius: 6, fontSize: 13, marginBottom: 16,
          }}>
            {erro}
          </div>
        )}

        {sucesso && (
          <div style={{
            background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534",
            padding: "8px 12px", borderRadius: 6, fontSize: 13, marginBottom: 16,
          }}>
            {sucesso}
          </div>
        )}

        {tab === "login" ? (
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>E-mail</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                required placeholder="seu@email.com" style={inputStyle}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>Senha</label>
              <input
                type="password" value={senha} onChange={(e) => setSenha(e.target.value)}
                required placeholder="••••••••" style={inputStyle}
              />
            </div>
            <button
              type="submit" disabled={carregando}
              style={{
                background: carregando ? "#93c5fd" : "#1e40af", color: "#fff", border: "none",
                padding: "10px 16px", borderRadius: 6, fontSize: 14, fontWeight: 600,
                cursor: carregando ? "not-allowed" : "pointer", marginTop: 4,
              }}
            >
              {carregando ? "Entrando..." : "Entrar"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleCadastro} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>Nome completo</label>
              <input
                type="text" value={nome} onChange={(e) => setNome(e.target.value)}
                required placeholder="Seu nome" style={inputStyle}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>E-mail</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                required placeholder="seu@email.com" style={inputStyle}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>Senha</label>
              <input
                type="password" value={senha} onChange={(e) => setSenha(e.target.value)}
                required placeholder="Crie uma senha" minLength={4} style={inputStyle}
              />
            </div>
            <button
              type="submit" disabled={carregando}
              style={{
                background: carregando ? "#86efac" : "#16a34a", color: "#fff", border: "none",
                padding: "10px 16px", borderRadius: 6, fontSize: 14, fontWeight: 600,
                cursor: carregando ? "not-allowed" : "pointer", marginTop: 4,
              }}
            >
              {carregando ? "Enviando..." : "Enviar cadastro"}
            </button>
            <p style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", margin: 0 }}>
              Após o cadastro, um administrador precisa aprovar seu acesso.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
