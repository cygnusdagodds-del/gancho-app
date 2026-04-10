import { useEffect } from "react";
import { useNavigate } from "react-router";

export default function RedirectLogin() {
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem("rh_operator");
    if (stored) {
      navigate("/standalone", { replace: true });
    } else {
      navigate("/standalone/entrar", { replace: true });
    }
  }, [navigate]);

  return null;
}
