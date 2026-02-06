
export interface ChessMove {
  from: string;
  to: string;
  san: string;
  fen: string;
}

export interface AnalysisPhase {
  score: number; // 0-100
  feedback: string;
  errors: string[];
}

export interface FullAnalysis {
  opening: AnalysisPhase;
  middlegame: AnalysisPhase;
  tactics: AnalysisPhase;
  endgame: AnalysisPhase;
  overallAdvice: string;
  referencedBooks: string[];
}

export interface LichessGameSummary {
  id: string;
  players: {
    white: { user: { name: string } };
    black: { user: { name: string } };
  };
  createdAt: number;
  status: string;
  variant: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type InputMode = 'manual' | 'pgn' | 'lichess';
