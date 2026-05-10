// Redireciona para o dashboard e abre o modal da agenda (substitui a página dedicada).
import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAgendaModal } from "@/contexts/AgendaModalContext";

export default function HojePage() {
  const [, setLocation] = useLocation();
  const { openAgenda } = useAgendaModal();

  useEffect(() => {
    openAgenda();
    setLocation("/");
  }, [openAgenda, setLocation]);

  return null;
}
