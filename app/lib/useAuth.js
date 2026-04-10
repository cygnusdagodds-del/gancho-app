import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";

export function useAuth() {
  const [operator, setOperator] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const stored = localStorage.getItem("rh_operator");
      if (stored) {
        setOperator(JSON.parse(stored));
      }
    } catch {
      localStorage.removeItem("rh_operator");
    }
    setLoading(false);
  }, []);

  const login = useCallback((userData) => {
    const data = {
      id: userData.id,
      nome: userData.nome,
      email: userData.email,
      cargo: userData.cargo || "colaborador",
      avatar_url: userData.avatar_url || null,
      teamlogger_email: userData.teamlogger_email || null,
    };
    localStorage.setItem("rh_operator", JSON.stringify(data));
    setOperator(data);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("rh_operator");
    setOperator(null);
    navigate("/standalone/entrar");
  }, [navigate]);

  return { operator, loading, login, logout };
}
