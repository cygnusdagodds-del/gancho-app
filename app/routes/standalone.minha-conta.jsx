import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/useAuth";

export default function MinhaConta() {
  const { operator, login } = useAuth();
  const [form, setForm] = useState({
    nome: "",
    telefone: "",
    cpf: "",
    teamlogger_email: "",
  });
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState("");
  const [senhaNova, setSenhaNova] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState({ tipo: "", texto: "" });

  useEffect(() => {
    if (!operator) return;
    carregarDados();
  }, [operator]);

  async function carregarDados() {
    const { data } = await supabase
      .from("operadores")
      .select("nome, telefone, cpf, teamlogger_email, avatar_url")
      .eq("id", operator.id)
      .single();

    if (data) {
      setForm({
        nome: data.nome || "",
        telefone: data.telefone || "",
        cpf: data.cpf || "",
        teamlogger_email: data.teamlogger_email || "",
      });
      setAvatarUrl(data.avatar_url || "");
    }
  }

  async function uploadAvatar(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamanho (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setMsg({ tipo: "erro", texto: "Imagem muito grande. Máximo 2MB." });
      return;
    }

    setUploadingAvatar(true);
    setMsg({ tipo: "", texto: "" });

    const ext = file.name.split(".").pop();
    const path = `avatars/${operator.id}.${ext}`;

    // Upload para Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("Avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setMsg({ tipo: "erro", texto: "Erro no upload: " + uploadError.message });
      setUploadingAvatar(false);
      return;
    }

    // Pegar URL pública
    const { data: urlData } = supabase.storage.from("Avatars").getPublicUrl(path);
    const url = urlData.publicUrl + "?t=" + Date.now(); // cache bust

    // Salvar no banco
    const { error: dbError } = await supabase
      .from("operadores")
      .update({ avatar_url: url })
      .eq("id", operator.id);

    if (dbError) {
      setMsg({ tipo: "erro", texto: "Erro ao salvar foto: " + dbError.message });
    } else {
      setAvatarUrl(url);
      const updated = { ...operator, avatar_url: url };
      localStorage.setItem("rh_operator", JSON.stringify(updated));
      login(updated);
      setMsg({ tipo: "ok", texto: "Foto atualizada!" });
    }

    setUploadingAvatar(false);
  }

  async function salvarDados(e) {
    e.preventDefault();
    setSalvando(true);
    setMsg({ tipo: "", texto: "" });

    const dados = {};
    if (form.nome.trim()) dados.nome = form.nome.trim();
    if (form.telefone.trim()) dados.telefone = form.telefone.trim();
    else dados.telefone = null;
    if (form.cpf.trim()) dados.cpf = form.cpf.trim();
    else dados.cpf = null;
    if (form.teamlogger_email.trim()) dados.teamlogger_email = form.teamlogger_email.trim().toLowerCase();
    else dados.teamlogger_email = null;

    const { error } = await supabase
      .from("operadores")
      .update(dados)
      .eq("id", operator.id);

    if (error) {
      setMsg({ tipo: "erro", texto: "Erro ao salvar: " + error.message });
    } else {
      // Atualizar localStorage
      const updated = { ...operator, nome: dados.nome, teamlogger_email: dados.teamlogger_email || "" };
      localStorage.setItem("rh_operator", JSON.stringify(updated));
      login(updated);
      setMsg({ tipo: "ok", texto: "Dados atualizados com sucesso!" });
    }

    setSalvando(false);
  }

  async function trocarSenha(e) {
    e.preventDefault();
    setSalvando(true);
    setMsg({ tipo: "", texto: "" });

    if (!senhaNova || senhaNova.length < 4) {
      setMsg({ tipo: "erro", texto: "A nova senha deve ter pelo menos 4 caracteres." });
      setSalvando(false);
      return;
    }

    // Verificar senha atual
    const { data } = await supabase
      .from("operadores")
      .select("senha_hash")
      .eq("id", operator.id)
      .single();

    if (!data || data.senha_hash !== senhaAtual) {
      setMsg({ tipo: "erro", texto: "Senha atual incorreta." });
      setSalvando(false);
      return;
    }

    const { error } = await supabase
      .from("operadores")
      .update({ senha_hash: senhaNova })
      .eq("id", operator.id);

    if (error) {
      setMsg({ tipo: "erro", texto: "Erro ao trocar senha: " + error.message });
    } else {
      setMsg({ tipo: "ok", texto: "Senha alterada com sucesso!" });
      setSenhaAtual("");
      setSenhaNova("");
    }

    setSalvando(false);
  }

  const inputStyle = {
    display: "block", width: "100%", padding: "10px 12px",
    border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14,
    outline: "none", boxSizing: "border-box",
  };

  const labelStyle = { fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 4, display: "block" };

  return (
    <div style={{ maxWidth: 560 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Minha Conta</h1>
      <p style={{ fontSize: 14, color: "#64748b", marginBottom: 24 }}>
        {operator?.email} — {operator?.cargo}
      </p>

      {msg.texto && (
        <div style={{
          background: msg.tipo === "ok" ? "#f0fdf4" : "#fef2f2",
          border: `1px solid ${msg.tipo === "ok" ? "#bbf7d0" : "#fecaca"}`,
          color: msg.tipo === "ok" ? "#166534" : "#dc2626",
          padding: "8px 14px", borderRadius: 8, fontSize: 13, marginBottom: 20,
        }}>
          {msg.texto}
        </div>
      )}

      {/* Dados pessoais */}
      <form onSubmit={salvarDados} style={{
        background: "#fff", borderRadius: 10, padding: 24,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)", marginBottom: 20,
      }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, color: "#1e293b" }}>
          Dados Pessoais
        </h3>

        {/* Avatar upload */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
          <div style={{
            width: 72, height: 72, borderRadius: "50%", overflow: "hidden",
            background: "#f1f5f9", border: "2px solid #e2e8f0",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, position: "relative",
          }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ fontSize: 28, fontWeight: 700, color: "#94a3b8" }}>
                {(operator?.nome || "?").charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <label
              htmlFor="avatar-upload"
              style={{
                display: "inline-block", padding: "7px 16px", borderRadius: 6,
                background: "#1e40af", color: "#fff", fontSize: 13, fontWeight: 600,
                cursor: uploadingAvatar ? "wait" : "pointer",
                opacity: uploadingAvatar ? 0.6 : 1,
              }}
            >
              {uploadingAvatar ? "Enviando..." : "Alterar foto"}
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              onChange={uploadAvatar}
              disabled={uploadingAvatar}
              style={{ display: "none" }}
            />
            <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>JPG ou PNG, máx 2MB</p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelStyle}>Nome completo</label>
            <input type="text" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Telefone</label>
            <input type="text" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} placeholder="(11) 99999-9999" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>CPF</label>
            <input type="text" value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} placeholder="000.000.000-00" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>E-mail do TeamLogger</label>
            <input type="email" value={form.teamlogger_email} onChange={(e) => setForm({ ...form, teamlogger_email: e.target.value })} placeholder="seu@email-do-teamlogger.com" style={inputStyle} />
            <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
              Usado para cruzar seus dados de home office com o TeamLogger.
            </p>
          </div>
        </div>

        <button type="submit" disabled={salvando} style={{
          marginTop: 18, background: salvando ? "#93c5fd" : "#1e40af", color: "#fff",
          border: "none", padding: "10px 24px", borderRadius: 8, fontSize: 14,
          fontWeight: 600, cursor: salvando ? "not-allowed" : "pointer",
        }}>
          {salvando ? "Salvando..." : "Salvar alterações"}
        </button>
      </form>

      {/* Trocar senha */}
      <form onSubmit={trocarSenha} style={{
        background: "#fff", borderRadius: 10, padding: 24,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, color: "#1e293b" }}>
          Alterar Senha
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelStyle}>Senha atual</label>
            <input type="password" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} required style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Nova senha</label>
            <input type="password" value={senhaNova} onChange={(e) => setSenhaNova(e.target.value)} required minLength={4} style={inputStyle} />
          </div>
        </div>

        <button type="submit" disabled={salvando} style={{
          marginTop: 18, background: salvando ? "#fca5a5" : "#dc2626", color: "#fff",
          border: "none", padding: "10px 24px", borderRadius: 8, fontSize: 14,
          fontWeight: 600, cursor: salvando ? "not-allowed" : "pointer",
        }}>
          {salvando ? "Alterando..." : "Alterar senha"}
        </button>
      </form>
    </div>
  );
}
