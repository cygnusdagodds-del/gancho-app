import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/useAuth";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function isAdmin(cargo) {
  return cargo === "admin" || cargo === "rh" || cargo === "gestor";
}

function hojeStr() {
  const h = new Date();
  return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}-${String(h.getDate()).padStart(2, "0")}`;
}

const cardBase = {
  background: "#fff",
  borderRadius: 12,
  padding: 24,
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
};

export default function Dashboard() {
  const { operator } = useAuth();
  const admin = operator && isAdmin(operator.cargo);

  const [loading, setLoading] = useState(true);
  const [pendentes, setPendentes] = useState(0);
  const [hoHoje, setHoHoje] = useState(0);
  const [feriasAtivas, setFeriasAtivas] = useState(0);
  const [comunicadosNaoLidos, setComunicadosNaoLidos] = useState(0);
  const [aniversariantes, setAniversariantes] = useState([]);
  const [pessoasHO, setPessoasHO] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [muralStats, setMuralStats] = useState(null);

  useEffect(() => {
    if (operator) carregar();
  }, [operator]);

  async function carregar() {
    setLoading(true);
    const hoje = hojeStr();
    const mesAtual = new Date().getMonth() + 1;

    // --- Alert cards ---
    let countPendentes = 0;
    let countHO = 0;
    let countFerias = 0;
    let countComunicados = 0;

    let nomesPendentes = [];
    try {
      const { data: pendList, count } = await supabase
        .from("operadores")
        .select("id, nome", { count: "exact" })
        .eq("status", "pendente");
      countPendentes = count || 0;
      nomesPendentes = (pendList || []).map((x) => x.nome);
    } catch {}

    try {
      const { count } = await supabase
        .from("home_office_schedule")
        .select("id", { count: "exact", head: true })
        .eq("date", hoje);
      countHO = count || 0;
    } catch {}

    try {
      const { count } = await supabase
        .from("leave_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "approved")
        .lte("start_date", hoje)
        .gte("end_date", hoje);
      countFerias = count || 0;
    } catch {}

    try {
      const { count: totalAtivos } = await supabase
        .from("comunicados")
        .select("id", { count: "exact", head: true })
        .eq("ativo", true);

      const { count: lidos } = await supabase
        .from("comunicados_lidos")
        .select("id", { count: "exact", head: true })
        .eq("operador_id", operator.id);

      countComunicados = Math.max((totalAtivos || 0) - (lidos || 0), 0);
    } catch {}

    setPendentes(countPendentes);
    setHoHoje(countHO);
    setFeriasAtivas(countFerias);
    setComunicadosNaoLidos(countComunicados);

    // --- Aniversariantes do mês ---
    try {
      // Birthday from perfil_social
      const { data: perfis } = await supabase
        .from("perfil_social")
        .select("operador_id, aniversario, operadores(nome, avatar_url)");

      const anivs = [];
      if (perfis) {
        for (const p of perfis) {
          if (!p.aniversario) continue;
          const d = new Date(p.aniversario + "T12:00:00");
          if (d.getMonth() + 1 === mesAtual) {
            anivs.push({
              nome: p.operadores?.nome || "—",
              avatar_url: p.operadores?.avatar_url || null,
              dia: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`,
              tipo: "aniversario",
            });
          }
        }
      }

      // Admissao anniversaries from operadores
      const { data: ops } = await supabase
        .from("operadores")
        .select("id, nome, avatar_url, data_admissao")
        .in("status", ["aprovado", "active"]);

      if (ops) {
        for (const o of ops) {
          if (!o.data_admissao) continue;
          const d = new Date(o.data_admissao + "T12:00:00");
          if (d.getMonth() + 1 === mesAtual) {
            anivs.push({
              nome: o.nome,
              avatar_url: o.avatar_url || null,
              dia: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`,
              tipo: "admissao",
            });
          }
        }
      }

      // Deduplicate by nome+dia
      const seen = new Set();
      const unique = [];
      for (const a of anivs) {
        const key = a.nome + a.dia + a.tipo;
        if (!seen.has(key)) { seen.add(key); unique.push(a); }
      }
      setAniversariantes(unique);
    } catch {
      setAniversariantes([]);
    }

    // --- Quem está em Home Office hoje ---
    try {
      const { data: hoList } = await supabase
        .from("home_office_schedule")
        .select("operator_id, operator_name")
        .eq("date", hoje);

      if (hoList && hoList.length > 0) {
        // Buscar avatares
        const ids = hoList.map((h) => h.operator_id).filter(Boolean);
        let avatarMap = {};
        if (ids.length > 0) {
          const { data: ops } = await supabase
            .from("operadores")
            .select("id, avatar_url")
            .in("id", ids);
          (ops || []).forEach((o) => { avatarMap[o.id] = o.avatar_url; });
        }
        setPessoasHO(
          hoList.map((h) => ({
            nome: h.operator_name || "—",
            avatar_url: avatarMap[h.operator_id] || null,
          }))
        );
      }
    } catch {
      setPessoasHO([]);
    }

    // --- Alertas e Pendências (admin only) ---
    if (admin) {
      const lista = [];

      if (countPendentes > 0) {
        lista.push({
          icon: "!",
          texto: `${countPendentes} funcionário${countPendentes > 1 ? "s" : ""} com cadastro pendente`,
          nomes: nomesPendentes,
          count: countPendentes,
          cor: "#dc2626",
          bg: "#fef2f2",
          link: "/standalone/funcionarios",
        });
      }

      try {
        const { data: semTL } = await supabase
          .from("operadores")
          .select("id, nome")
          .in("status", ["aprovado", "active"])
          .or("teamlogger_email.is.null,teamlogger_email.eq.");
        const n = semTL?.length || 0;
        if (n > 0) {
          lista.push({
            icon: "M",
            texto: `${n} funcionário${n > 1 ? "s" : ""} sem e-mail TeamLogger preenchido`,
            nomes: (semTL || []).map((x) => x.nome),
            count: n,
            cor: "#d97706",
            bg: "#fffbeb",
            link: "/standalone/funcionarios",
          });
        }
      } catch {}

      try {
        const { data: allOps } = await supabase
          .from("operadores")
          .select("id, nome")
          .in("status", ["aprovado", "active"]);
        const { data: perfisDone } = await supabase
          .from("perfil_social")
          .select("operator_id")
          .eq("quiz_completo", true);
        const doneSet = new Set((perfisDone || []).map((p) => p.operator_id));
        const incompletos = (allOps || []).filter((o) => !doneSet.has(o.id));
        const n = incompletos.length;
        if (n > 0) {
          lista.push({
            icon: "P",
            texto: `${n} perfil${n > 1 ? "s" : ""} incompleto${n > 1 ? "s" : ""} na Tropa da CYG`,
            nomes: incompletos.map((x) => x.nome),
            count: n,
            cor: "#7c3aed",
            bg: "#f5f3ff",
            link: "/standalone/tropa",
          });
        }
      } catch {}

      setAlertas(lista);
    }

    // --- Leitura do Mural (admin only) ---
    if (admin) {
      try {
        // Último comunicado ativo
        const { data: ultimoList } = await supabase
          .from("comunicados")
          .select("id, titulo, created_at")
          .eq("ativo", true)
          .order("created_at", { ascending: false })
          .limit(1);

        const ultimoCom = ultimoList?.[0];

        if (ultimoCom) {
          // Total de funcionários ativos
          const { count: totalFuncs } = await supabase
            .from("operadores")
            .select("id", { count: "exact", head: true })
            .in("status", ["aprovado", "active"]);

          // Quantos leram este comunicado
          const { data: quemLeu } = await supabase
            .from("comunicados_lidos")
            .select("operator_id")
            .eq("comunicado_id", ultimoCom.id);

          // Buscar nomes/avatares de quem leu
          const idsLeram = (quemLeu || []).map((l) => l.operator_id).filter(Boolean);
          let leram = [];
          if (idsLeram.length > 0) {
            const { data: opsLeram } = await supabase
              .from("operadores")
              .select("id, nome, avatar_url")
              .in("id", idsLeram);
            leram = (opsLeram || []).map((o) => ({
              nome: o.nome || "—",
              avatar_url: o.avatar_url || null,
            }));
          }

          setMuralStats({
            titulo: ultimoCom.titulo,
            total: totalFuncs || 0,
            lidos: leram.length,
            quemLeu: leram,
          });
        }
      } catch {}
    }

    setLoading(false);
  }

  const mesNome = MESES[new Date().getMonth()];

  const alertCards = [
    {
      label: "Cadastros pendentes",
      valor: pendentes,
      cor: pendentes > 0 ? "#dc2626" : "#94a3b8",
      borderCor: pendentes > 0 ? "#dc2626" : "#e2e8f0",
    },
    {
      label: "Home Office hoje",
      valor: hoHoje,
      cor: "rgb(22,134,78)",
      borderCor: "rgb(22,134,78)",
    },
    {
      label: "Férias ativas",
      valor: feriasAtivas,
      cor: "#2563eb",
      borderCor: "#2563eb",
    },
    {
      label: "Comunicados não lidos",
      valor: comunicadosNaoLidos,
      cor: comunicadosNaoLidos > 0 ? "#ea580c" : "#94a3b8",
      borderCor: comunicadosNaoLidos > 0 ? "#ea580c" : "#e2e8f0",
    },
  ];

  const acoesRapidas = [
    { texto: "Ver escala de home office", link: "/standalone/home-office" },
    { texto: "Consultar métricas TeamLogger", link: "/standalone/ponto" },
    { texto: "Publicar comunicado", link: "/standalone/comunicados" },
    { texto: "Ver relatórios", link: "/standalone/relatorios" },
  ];

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh", padding: 32 }}>
      {/* Header */}
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#0f172a" }}>
        Olá, {operator?.nome || "Operador"}
      </h1>
      <p style={{ fontSize: 14, color: "#64748b", margin: "4px 0 28px" }}>
        Painel geral do RH Cygnuss
      </p>

      {/* Alert cards row */}
      {admin && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
            gap: 16,
            marginBottom: 28,
          }}
        >
          {alertCards.map((c) => (
            <div
              key={c.label}
              style={{
                ...cardBase,
                borderLeft: `4px solid ${c.borderCor}`,
                padding: "18px 20px",
              }}
            >
              <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 6px" }}>
                {c.label}
              </p>
              <p style={{ fontSize: 30, fontWeight: 700, color: c.cor, margin: 0 }}>
                {loading ? "..." : c.valor}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Main content grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 20,
          marginBottom: 28,
        }}
      >
        {/* Aniversariantes do mês */}
        <div style={cardBase}>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 16px", color: "#0f172a" }}>
            Aniversariantes de {mesNome}
          </h3>
          {loading ? (
            <p style={{ fontSize: 14, color: "#94a3b8" }}>Carregando...</p>
          ) : aniversariantes.length === 0 ? (
            <p style={{ fontSize: 14, color: "#94a3b8" }}>Nenhum aniversariante este mês</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {aniversariantes.map((a, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {a.avatar_url ? (
                    <img
                      src={a.avatar_url}
                      alt=""
                      style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: "#e2e8f0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#64748b",
                      }}
                    >
                      {a.nome.charAt(0)}
                    </div>
                  )}
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 500, margin: 0, color: "#1e293b" }}>
                      {a.nome}
                    </p>
                    <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>
                      {a.dia} {a.tipo === "admissao" ? "(admissão)" : "(aniversário)"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quem está em Home Office hoje */}
        <div style={cardBase}>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 16px", color: "#0f172a" }}>
            Quem está em Home Office hoje
          </h3>
          {loading ? (
            <p style={{ fontSize: 14, color: "#94a3b8" }}>Carregando...</p>
          ) : pessoasHO.length === 0 ? (
            <p style={{ fontSize: 14, color: "#94a3b8" }}>Ninguém escalado hoje</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {pessoasHO.map((p, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {p.avatar_url ? (
                    <img
                      src={p.avatar_url}
                      alt=""
                      style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: "#dcfce7",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
                        fontWeight: 600,
                        color: "rgb(22,134,78)",
                      }}
                    >
                      {p.nome.charAt(0)}
                    </div>
                  )}
                  <p style={{ fontSize: 14, fontWeight: 500, margin: 0, color: "#1e293b" }}>
                    {p.nome}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alertas e Pendências (admin only) */}
        {admin && (
          <div style={cardBase}>
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 16px", color: "#0f172a" }}>
              Alertas e Pendências
            </h3>
            {loading ? (
              <p style={{ fontSize: 14, color: "#94a3b8" }}>Carregando...</p>
            ) : alertas.length === 0 ? (
              <div
                style={{
                  background: "#f0fdf4",
                  borderRadius: 8,
                  padding: 14,
                  textAlign: "center",
                  color: "rgb(22,134,78)",
                  fontSize: 14,
                }}
              >
                Tudo em dia! Nenhuma pendência.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {alertas.map((a, i) => (
                  <a
                    key={i}
                    href={a.link}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      background: a.bg,
                      borderRadius: 8,
                      padding: "10px 14px",
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <span
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: a.cor,
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 13,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {a.icon}
                    </span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, margin: 0, color: "#1e293b" }}>
                        {a.texto}
                      </p>
                      {a.nomes && a.nomes.length > 0 && (
                        <p style={{ fontSize: 12, margin: "4px 0 0", color: "#64748b" }}>
                          {a.nomes.join(", ")}
                        </p>
                      )}
                    </div>
                    <span
                      style={{
                        background: a.cor,
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: 700,
                        borderRadius: 10,
                        padding: "2px 10px",
                        minWidth: 24,
                        textAlign: "center",
                      }}
                    >
                      {a.count}
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Leitura do Mural (admin only) */}
        {admin && muralStats && (
          <div style={cardBase}>
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 6px", color: "#0f172a" }}>
              Leitura do Mural
            </h3>
            <p style={{ fontSize: 12, color: "#94a3b8", margin: "0 0 14px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              Último: {muralStats.titulo}
            </p>

            {/* Barra de progresso */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1, height: 8, borderRadius: 4, background: "#e2e8f0", overflow: "hidden" }}>
                <div style={{
                  width: muralStats.total > 0 ? `${Math.round((muralStats.lidos / muralStats.total) * 100)}%` : "0%",
                  height: "100%",
                  borderRadius: 4,
                  background: muralStats.lidos === muralStats.total ? "#22c55e" : "#3b82f6",
                  transition: "width 0.3s ease",
                }} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", whiteSpace: "nowrap" }}>
                {muralStats.lidos}/{muralStats.total}
              </span>
            </div>

            {/* Quem leu */}
            {muralStats.quemLeu.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#64748b", margin: 0, textTransform: "uppercase" }}>
                  Visualizado por
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {muralStats.quemLeu.map((p, i) => (
                    <div
                      key={i}
                      title={p.nome}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        background: "#f0fdf4",
                        borderRadius: 20,
                        padding: "4px 10px 4px 4px",
                        fontSize: 12,
                        color: "#166534",
                        fontWeight: 500,
                      }}
                    >
                      {p.avatar_url ? (
                        <img src={p.avatar_url} alt="" style={{ width: 20, height: 20, borderRadius: "50%", objectFit: "cover" }} />
                      ) : (
                        <div style={{
                          width: 20, height: 20, borderRadius: "50%", background: "#bbf7d0",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 10, fontWeight: 700, color: "#166534",
                        }}>
                          {p.nome.charAt(0)}
                        </div>
                      )}
                      {p.nome.split(" ")[0]}
                    </div>
                  ))}
                </div>

                {muralStats.lidos < muralStats.total && (
                  <p style={{ fontSize: 12, color: "#dc2626", margin: "6px 0 0", fontWeight: 500 }}>
                    {muralStats.total - muralStats.lidos} pessoa{muralStats.total - muralStats.lidos > 1 ? "s" : ""} ainda não leu
                  </p>
                )}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: "#dc2626", margin: 0 }}>
                Ninguém leu ainda
              </p>
            )}
          </div>
        )}

        {/* Ações Rápidas */}
        <div style={cardBase}>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 16px", color: "#0f172a" }}>
            Ações Rápidas
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {acoesRapidas.map((a) => (
              <a
                key={a.link}
                href={a.link}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 14,
                  color: "#1e40af",
                  textDecoration: "none",
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: "#f8fafc",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#eff6ff")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#f8fafc")}
              >
                <span style={{ fontSize: 16 }}>&#8594;</span>
                {a.texto}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
