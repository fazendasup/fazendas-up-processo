import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAgendaModal } from '@/contexts/AgendaModalContext';

export default function TarefasPage() {
  const [, setLocation] = useLocation();
  const { openAgenda } = useAgendaModal();

  useEffect(() => {
    setLocation('/');
    openAgenda('full');
  }, [setLocation, openAgenda]);

  return null;
}
