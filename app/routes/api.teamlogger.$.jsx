const TEAMLOGGER_BASE = "https://api2.teamlogger.com/api";

export async function loader({ request, params }) {
  const apiKey = process.env.TEAMLOGGER_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "TEAMLOGGER_API_KEY não configurada" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const subpath = params["*"] || "";
  const url = new URL(request.url);
  const queryString = url.search;

  // Mapear subpaths para endpoints reais
  const endpointMap = {
    "list_users": "/integration/list_users",
    "punch_report": "/company_punch_in_out_report",
    "summary_report": "/employee_summary_report",
    "timesheet": "/timesheet_data",
    "list_teams": "/integration/list_teams",
    "manual_entries": "/integration/manual_entries",
  };

  const basePath = subpath.split("?")[0];
  const endpoint = endpointMap[basePath] || `/${basePath}`;

  try {
    const res = await fetch(`${TEAMLOGGER_BASE}${endpoint}${queryString}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    const data = await res.text();

    return new Response(data, {
      status: res.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
