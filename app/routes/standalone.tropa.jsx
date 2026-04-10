import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/useAuth";

function cargoBorda(cargo) {
  if (cargo === "admin") return "#7c3aed"; // roxo
  if (cargo === "gestor") return "#2563eb"; // azul
  if (cargo === "rh") return "#0891b2"; // ciano
  return "#e2e8f0"; // cinza claro para colaborador
}

function cargoCorTexto(cargo) {
  if (cargo === "admin") return "#7c3aed";
  if (cargo === "gestor") return "#2563eb";
  if (cargo === "rh") return "#0891b2";
  return "#94a3b8";
}

function cargoLabel(cargo) {
  if (cargo === "admin") return "Admin";
  if (cargo === "gestor") return "Gestor";
  if (cargo === "rh") return "RH";
  return "Colaborador";
}

const TEMPERAMENTOS = [
  { value: "sanguineo", label: "Sanguíneo", emoji: "🔥", desc: "Extrovertido, otimista, comunicativo" },
  { value: "colerico", label: "Colérico", emoji: "⚡", desc: "Determinado, líder, objetivo" },
  { value: "melancolico", label: "Melancólico", emoji: "🎭", desc: "Analítico, detalhista, perfeccionista" },
  { value: "fleumatico", label: "Fleumático", emoji: "🌊", desc: "Calmo, paciente, diplomata" },
];


const MBTI_TYPES = [
  "INTJ", "INTP", "ENTJ", "ENTP",
  "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ",
  "ISTP", "ISFP", "ESTP", "ESFP",
];


const MBTI_DESC = {
  INTJ: "O Arquiteto — estrategista visionário",
  INTP: "O Lógico — inventor analítico",
  ENTJ: "O Comandante — líder nato e decisivo",
  ENTP: "O Inovador — debatedor criativo",
  INFJ: "O Advogado — idealista misterioso",
  INFP: "O Mediador — sonhador empático",
  ENFJ: "O Protagonista — líder carismático",
  ENFP: "O Ativista — espírito livre criativo",
  ISTJ: "O Logístico — confiável e organizado",
  ISFJ: "O Defensor — protetor dedicado",
  ESTJ: "O Executivo — administrador prático",
  ESFJ: "O Cônsul — cuidador social",
  ISTP: "O Virtuoso — mecânico destemido",
  ISFP: "O Aventureiro — artista sensível",
  ESTP: "O Empresário — ação e energia",
  ESFP: "O Animador — espontâneo e divertido",
};

export default function TropaDaCYG() {
  const { operator } = useAuth();
  const [membros, setMembros] = useState([]);
  const [meuPerfil, setMeuPerfil] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [selecionado, setSelecionado] = useState(null);
  const [tab, setTab] = useState("galeria"); // galeria | meu-quiz
  const [quizStep, setQuizStep] = useState(0); // 0=quiz, 1=infos, 2=pronto
  const [quizRespostas, setQuizRespostas] = useState({});
  const [formInfo, setFormInfo] = useState({
    cargo_descricao: "",
    aniversario: "",
    time_torce: "",
    temperamento: "",
    comida_favorita: "",
    musica_favorita: "",
    hobby: "",
    frase: "",
    curiosidade: "",
    filme_serie: "",
    superpoder: "",
  });
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);

    // Buscar todos os operadores aprovados + perfil social
    const { data: ops } = await supabase
      .from("operadores")
      .select("id, nome, email, cargo, avatar_url")
      .in("status", ["aprovado", "active"]);

    const { data: perfis } = await supabase.from("perfil_social").select("*");

    const perfilMap = {};
    (perfis || []).forEach((p) => { perfilMap[p.operator_id] = p; });

    const lista = (ops || []).map((o) => ({
      ...o,
      perfil: perfilMap[o.id] || null,
    }));

    setMembros(lista);

    // Meu perfil
    if (operator) {
      const meu = perfilMap[operator.id];
      setMeuPerfil(meu || null);
      if (meu) {
        setFormInfo({
          cargo_descricao: meu.cargo_descricao || "",
          aniversario: meu.aniversario || "",
          time_torce: meu.time_torce || "",
          temperamento: meu.temperamento || "",
          comida_favorita: meu.comida_favorita || "",
          musica_favorita: meu.musica_favorita || "",
          hobby: meu.hobby || "",
          frase: meu.frase || "",
          curiosidade: meu.curiosidade || "",
          filme_serie: meu.filme_serie || "",
          superpoder: meu.superpoder || "",
        });
      }
    }

    setCarregando(false);
  }, [operator]);

  useEffect(() => { carregar(); }, [carregar]);

  async function salvarQuiz() {
    setSalvando(true);
    const dados = {
      operator_id: operator.id,
      personalidade: quizRespostas.mbti || null,
      ...formInfo,
      quiz_completo: true,
      updated_at: new Date().toISOString(),
    };

    if (meuPerfil) {
      await supabase.from("perfil_social").update(dados).eq("operator_id", operator.id);
    } else {
      await supabase.from("perfil_social").insert(dados);
    }

    setSalvando(false);
    setTab("galeria");
    carregar();
  }

  function formatData(d) {
    if (!d) return "—";
    const [y, m, day] = d.split("-");
    return `${day}/${m}`;
  }

  const inputStyle = {
    display: "block", width: "100%", padding: "10px 12px",
    border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14,
    outline: "none", boxSizing: "border-box", background: "#fff",
  };

  const labelStyle = { fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4, display: "block" };

  if (carregando) return <p style={{ color: "#94a3b8" }}>Carregando...</p>;

  // Modal de membro selecionado
  const modal = selecionado && (
    <div
      style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(0,0,0,0.5)", zIndex: 9999,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
      onClick={() => setSelecionado(null)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 16, padding: 28, maxWidth: 440, width: "100%",
          maxHeight: "85vh", overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%", overflow: "hidden",
            background: "#f1f5f9", border: "3px solid #e2e8f0",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            {selecionado.avatar_url ? (
              <img src={selecionado.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ fontSize: 24, fontWeight: 700, color: "#94a3b8" }}>
                {(selecionado.nome || "?").charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", margin: 0 }}>{selecionado.nome}</h2>
            <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>{selecionado.cargo}</p>
          </div>
          <button
            onClick={() => setSelecionado(null)}
            style={{
              marginLeft: "auto", background: "none", border: "none",
              fontSize: 22, color: "#94a3b8", cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        {selecionado.perfil?.quiz_completo ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Personalidade MBTI */}
            {selecionado.perfil.personalidade && (
              <div style={{ background: "#f0f9ff", padding: "12px 16px", borderRadius: 10, border: "1px solid #bae6fd" }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#0369a1", marginBottom: 2 }}>PERSONALIDADE</p>
                <p style={{ fontSize: 16, fontWeight: 700, color: "#0c4a6e", margin: 0 }}>
                  {selecionado.perfil.personalidade}
                  <span style={{ fontSize: 12, fontWeight: 400, color: "#64748b", marginLeft: 8 }}>
                    {MBTI_DESC[selecionado.perfil.personalidade] || ""}
                  </span>
                </p>
              </div>
            )}

            {/* Temperamento */}
            {selecionado.perfil.temperamento && (
              <div style={{ background: "#fefce8", padding: "12px 16px", borderRadius: 10, border: "1px solid #fde68a" }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#a16207", marginBottom: 2 }}>TEMPERAMENTO</p>
                <p style={{ fontSize: 15, fontWeight: 600, color: "#78350f", margin: 0 }}>
                  {TEMPERAMENTOS.find(t => t.value === selecionado.perfil.temperamento)?.emoji}{" "}
                  {TEMPERAMENTOS.find(t => t.value === selecionado.perfil.temperamento)?.label || selecionado.perfil.temperamento}
                </p>
                <p style={{ fontSize: 12, color: "#92400e", margin: 0 }}>
                  {TEMPERAMENTOS.find(t => t.value === selecionado.perfil.temperamento)?.desc || ""}
                </p>
              </div>
            )}

            {/* Info grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { label: "Aniversário", value: formatData(selecionado.perfil.aniversario), icon: "🎂" },
                { label: "Time", value: selecionado.perfil.time_torce, icon: "⚽" },
                { label: "Comida favorita", value: selecionado.perfil.comida_favorita, icon: "🍕" },
                { label: "Música / Artista", value: selecionado.perfil.musica_favorita, icon: "🎵" },
                { label: "Filme / Série", value: selecionado.perfil.filme_serie, icon: "🎬" },
                { label: "Hobby", value: selecionado.perfil.hobby, icon: "🎯" },
                { label: "Superpoder", value: selecionado.perfil.superpoder, icon: "💪" },
              ].filter(item => item.value).map((item, i) => (
                <div key={i} style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                  <p style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", margin: 0 }}>{item.icon} {item.label}</p>
                  <p style={{ fontSize: 13, fontWeight: 500, color: "#1e293b", margin: "2px 0 0" }}>{item.value}</p>
                </div>
              ))}
            </div>

            {/* Frase */}
            {selecionado.perfil.frase && (
              <div style={{ background: "#f5f3ff", padding: "12px 16px", borderRadius: 10, border: "1px solid #ddd6fe", textAlign: "center" }}>
                <p style={{ fontSize: 14, fontStyle: "italic", color: "#5b21b6", margin: 0 }}>
                  "{selecionado.perfil.frase}"
                </p>
              </div>
            )}

            {/* Curiosidade */}
            {selecionado.perfil.curiosidade && (
              <div style={{ background: "#fff7ed", padding: "12px 16px", borderRadius: 10, border: "1px solid #fed7aa" }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#c2410c", marginBottom: 2 }}>CURIOSIDADE</p>
                <p style={{ fontSize: 13, color: "#7c2d12", margin: 0 }}>{selecionado.perfil.curiosidade}</p>
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "20px 0", color: "#94a3b8" }}>
            <p style={{ fontSize: 40, margin: 0 }}>🤫</p>
            <p style={{ fontSize: 14, marginTop: 8 }}>Ainda não preencheu o perfil</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div>
      {modal}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", margin: 0 }}>Tropa da CYG</h1>
          <p style={{ fontSize: 14, color: "#64748b", margin: "4px 0 0" }}>Conheça quem faz a Cygnuss acontecer</p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => setTab("galeria")}
            style={{
              padding: "8px 18px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600,
              cursor: "pointer",
              background: tab === "galeria" ? "rgb(22,134,78)" : "#f1f5f9",
              color: tab === "galeria" ? "#fff" : "#64748b",
            }}
          >
            Equipe
          </button>
          <button
            onClick={() => { setTab("meu-quiz"); setQuizStep(0); }}
            style={{
              padding: "8px 18px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600,
              cursor: "pointer",
              background: tab === "meu-quiz" ? "rgb(22,134,78)" : "#f1f5f9",
              color: tab === "meu-quiz" ? "#fff" : "#64748b",
            }}
          >
            {meuPerfil?.quiz_completo ? "Editar meu perfil" : "Preencher meu perfil"}
          </button>
        </div>
      </div>

      {/* ─── GALERIA ─── */}
      {tab === "galeria" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 16 }}>
          {membros.map((m) => (
            <div
              key={m.id}
              onClick={() => setSelecionado(m)}
              style={{
                background: "#fff", borderRadius: 12, padding: 20, textAlign: "center",
                cursor: "pointer", transition: "all 0.15s",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                border: `2px solid ${cargoBorda(m.cargo)}`,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)"; }}
            >
              <div style={{
                width: 72, height: 72, borderRadius: "50%", overflow: "hidden",
                background: "#f1f5f9", margin: "0 auto 10px",
                display: "flex", alignItems: "center", justifyContent: "center",
                border: `3px solid ${cargoBorda(m.cargo)}`,
              }}>
                {m.avatar_url ? (
                  <img src={m.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontSize: 26, fontWeight: 700, color: "#94a3b8" }}>
                    {(m.nome || "?").charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#1e293b", margin: 0 }}>{m.nome}</p>
              <p style={{ fontSize: 11, color: m.perfil?.cargo_descricao ? "#475569" : cargoCorTexto(m.cargo), margin: "2px 0 0", fontWeight: 500 }}>
                {m.perfil?.cargo_descricao || cargoLabel(m.cargo)}
              </p>
              {m.perfil?.personalidade && (
                <span style={{
                  display: "inline-block", marginTop: 6, padding: "2px 8px", borderRadius: 10,
                  background: "#f0f9ff", color: "#0369a1", fontSize: 10, fontWeight: 700,
                }}>
                  {m.perfil.personalidade}
                </span>
              )}
              {m.perfil?.temperamento && (
                <span style={{
                  display: "inline-block", marginTop: 4, padding: "2px 8px", borderRadius: 10,
                  background: "#fefce8", color: "#a16207", fontSize: 10, fontWeight: 600,
                }}>
                  {TEMPERAMENTOS.find(t => t.value === m.perfil.temperamento)?.emoji}{" "}
                  {TEMPERAMENTOS.find(t => t.value === m.perfil.temperamento)?.label}
                </span>
              )}
              {!m.perfil?.quiz_completo && (
                <p style={{ fontSize: 10, color: "#cbd5e1", marginTop: 6 }}>Perfil pendente</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ─── MEU QUIZ ─── */}
      {tab === "meu-quiz" && (
        <div style={{ maxWidth: 520, margin: "0 auto" }}>
          {/* Step 0: Teste externo + selecionar resultado */}
          {quizStep === 0 && (
            <div style={{ background: "#fff", borderRadius: 12, padding: 28, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>Teste de Personalidade</h2>
              <p style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>
                Faça o teste no site oficial e depois selecione seu resultado aqui
              </p>

              {/* Link para o teste */}
              <a
                href="https://www.16personalities.com/br/teste-de-personalidade"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "14px 20px", borderRadius: 10, textDecoration: "none",
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff",
                  fontSize: 14, fontWeight: 600, marginBottom: 20,
                  boxShadow: "0 4px 12px rgba(99,102,241,0.3)",
                  transition: "transform 0.12s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-1px)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
              >
                Fazer o teste de personalidade →
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>

              <div style={{ background: "#f8fafc", borderRadius: 8, padding: 14, marginBottom: 20 }}>
                <p style={{ fontSize: 12, color: "#64748b", margin: 0, lineHeight: 1.5 }}>
                  O teste leva cerca de 10 minutos. No final, você vai receber um resultado com 4 letras (ex: ENFP, INTJ, ISFJ...).
                  Selecione abaixo o resultado que você obteve.
                </p>
              </div>

              {/* Selecionar MBTI */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 8, display: "block" }}>
                  Qual foi seu resultado?
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                  {MBTI_TYPES.map((tipo) => (
                    <button
                      key={tipo}
                      onClick={() => setQuizRespostas({ ...quizRespostas, mbti: tipo })}
                      style={{
                        padding: "10px 4px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                        cursor: "pointer", transition: "all 0.12s", textAlign: "center",
                        border: quizRespostas.mbti === tipo ? "2px solid rgb(22,134,78)" : "1px solid #e2e8f0",
                        background: quizRespostas.mbti === tipo ? "rgba(22,134,78,0.08)" : "#fff",
                        color: quizRespostas.mbti === tipo ? "rgb(22,134,78)" : "#475569",
                      }}
                    >
                      {tipo}
                    </button>
                  ))}
                </div>
                {quizRespostas.mbti && (
                  <p style={{ fontSize: 12, color: "#166534", marginTop: 8, background: "#f0fdf4", padding: "8px 12px", borderRadius: 6 }}>
                    {quizRespostas.mbti} — {MBTI_DESC[quizRespostas.mbti] || ""}
                  </p>
                )}
              </div>

              <button
                onClick={() => setQuizStep(1)}
                disabled={!quizRespostas.mbti}
                style={{
                  width: "100%", padding: "12px 0", borderRadius: 8, border: "none",
                  background: quizRespostas.mbti ? "rgb(22,134,78)" : "#e2e8f0",
                  color: quizRespostas.mbti ? "#fff" : "#94a3b8",
                  fontSize: 14, fontWeight: 600, cursor: quizRespostas.mbti ? "pointer" : "not-allowed",
                }}
              >
                Próximo passo →
              </button>
            </div>
          )}

          {/* Step 1: Informações pessoais */}
          {quizStep === 1 && (
            <div style={{ background: "#fff", borderRadius: 12, padding: 28, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>Sobre Você</h2>
              <p style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>Preencha o que quiser — só aparece o que você completar</p>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={labelStyle}>Seu cargo / função</label>
                  <input type="text" value={formInfo.cargo_descricao} onChange={(e) => setFormInfo({ ...formInfo, cargo_descricao: e.target.value })} placeholder="Ex: Designer, Atendimento, Supervisora" style={inputStyle} />
                  <p style={{ fontSize: 11, color: "#94a3b8", margin: "4px 0 0" }}>Aparece no seu card na Tropa da CYG</p>
                </div>
                <div>
                  <label style={labelStyle}>Aniversário</label>
                  <input type="date" value={formInfo.aniversario} onChange={(e) => setFormInfo({ ...formInfo, aniversario: e.target.value })} style={inputStyle} />
                </div>

                <div>
                  <label style={labelStyle}>Temperamento</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    {TEMPERAMENTOS.map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setFormInfo({ ...formInfo, temperamento: t.value })}
                        style={{
                          padding: "8px 10px", borderRadius: 8, fontSize: 12, textAlign: "left",
                          cursor: "pointer", transition: "all 0.12s",
                          border: formInfo.temperamento === t.value ? "2px solid rgb(22,134,78)" : "1px solid #e2e8f0",
                          background: formInfo.temperamento === t.value ? "rgba(22,134,78,0.08)" : "#fff",
                          color: formInfo.temperamento === t.value ? "rgb(22,134,78)" : "#475569",
                          fontWeight: formInfo.temperamento === t.value ? 600 : 400,
                        }}
                      >
                        {t.emoji} {t.label}
                        <span style={{ display: "block", fontSize: 10, color: "#94a3b8", fontWeight: 400 }}>{t.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Time que torce</label>
                  <input type="text" value={formInfo.time_torce} onChange={(e) => setFormInfo({ ...formInfo, time_torce: e.target.value })} placeholder="Ex: Corinthians" style={inputStyle} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Comida favorita</label>
                    <input type="text" value={formInfo.comida_favorita} onChange={(e) => setFormInfo({ ...formInfo, comida_favorita: e.target.value })} placeholder="Ex: Pizza" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Música / Artista favorito</label>
                    <input type="text" value={formInfo.musica_favorita} onChange={(e) => setFormInfo({ ...formInfo, musica_favorita: e.target.value })} placeholder="Ex: Jorge & Mateus" style={inputStyle} />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Filme / Série favorita</label>
                    <input type="text" value={formInfo.filme_serie} onChange={(e) => setFormInfo({ ...formInfo, filme_serie: e.target.value })} placeholder="Ex: Breaking Bad" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Hobby</label>
                    <input type="text" value={formInfo.hobby} onChange={(e) => setFormInfo({ ...formInfo, hobby: e.target.value })} placeholder="Ex: Jogar futebol" style={inputStyle} />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Se pudesse ter um superpoder, qual seria?</label>
                  <input type="text" value={formInfo.superpoder} onChange={(e) => setFormInfo({ ...formInfo, superpoder: e.target.value })} placeholder="Ex: Teletransporte" style={inputStyle} />
                </div>

                <div>
                  <label style={labelStyle}>Uma frase que te define</label>
                  <input type="text" value={formInfo.frase} onChange={(e) => setFormInfo({ ...formInfo, frase: e.target.value })} placeholder="Ex: Feito é melhor que perfeito" style={inputStyle} />
                </div>

                <div>
                  <label style={labelStyle}>Uma curiosidade sobre você que ninguém sabe</label>
                  <textarea value={formInfo.curiosidade} onChange={(e) => setFormInfo({ ...formInfo, curiosidade: e.target.value })} placeholder="Ex: Já morei em 5 cidades diferentes" rows={2} style={{ ...inputStyle, resize: "vertical" }} />
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
                {!meuPerfil?.quiz_completo && (
                  <button
                    onClick={() => setQuizStep(0)}
                    style={{
                      flex: 1, padding: "12px 0", borderRadius: 8, border: "1px solid #e2e8f0",
                      background: "#fff", color: "#64748b", fontSize: 14, fontWeight: 600, cursor: "pointer",
                    }}
                  >
                    ← Voltar ao quiz
                  </button>
                )}
                <button
                  onClick={salvarQuiz}
                  disabled={salvando}
                  style={{
                    flex: 2, padding: "12px 0", borderRadius: 8, border: "none",
                    background: "rgb(22,134,78)", color: "#fff",
                    fontSize: 14, fontWeight: 600, cursor: "pointer",
                    opacity: salvando ? 0.6 : 1,
                  }}
                >
                  {salvando ? "Salvando..." : "Salvar perfil"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
