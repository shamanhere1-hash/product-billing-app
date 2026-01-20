import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function BackButton() {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate('/')}
      className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
    >
      <ArrowLeft className="w-5 h-5 text-foreground" />
    </button>
  );
}
