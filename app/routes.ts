import { type RouteConfig, route, layout } from "@react-router/dev/routes";

export default [
  // Rota raiz → login
  route("/", "routes/redirect-login.jsx"),

  // API proxy para TeamLogger (server-only)
  route("api/teamlogger/*", "routes/api.teamlogger.$.jsx"),

  // App principal
  layout("routes/standalone.jsx", [
    route("standalone", "routes/standalone._index.jsx", { index: true }),
    route("standalone/entrar", "routes/standalone.entrar.jsx"),
    route("standalone/home-office", "routes/standalone.home-office.jsx"),
    route("standalone/ferias", "routes/standalone.ferias.jsx"),
    route("standalone/folha", "routes/standalone.folha.jsx"),
    route("standalone/ponto", "routes/standalone.ponto.jsx"),
    route("standalone/funcionarios", "routes/standalone.funcionarios.jsx"),
    route("standalone/aprovacoes", "routes/standalone.aprovacoes.jsx"),
    route("standalone/mural", "routes/standalone.mural.jsx"),
    route("standalone/timeline", "routes/standalone.timeline.jsx"),
    route("standalone/relatorios", "routes/standalone.relatorios.jsx"),
    route("standalone/minha-conta", "routes/standalone.minha-conta.jsx"),
    route("standalone/tropa", "routes/standalone.tropa.jsx"),
  ]),
] satisfies RouteConfig;
