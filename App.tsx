
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { 
  Trophy, 
  Search, 
  Upload, 
  BookOpen, 
  AlertCircle, 
  Play, 
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  Loader2,
  BrainCircuit,
  MessageSquare,
  Send,
  X
} from 'lucide-react';
import { FullAnalysis, InputMode, LichessGameSummary, ChatMessage } from './types';
import { analyzeGame, chatWithAssistant } from './services/geminiService';
import { fetchRecentLichessGames, fetchLichessGamePgn } from './services/lichessService';

const App: React.FC = () => {
  const [game, setGame] = useState(new Chess());
  const [pgn, setPgn] = useState('');
  const [username, setUsername] = useState('');
  const [inputMode, setInputMode] = useState<InputMode>('manual');
  
  const [recentGames, setRecentGames] = useState<LichessGameSummary[]>([]);
  const [isSearchingLichess, setIsSearchingLichess] = useState(false);
  const [showGameSelector, setShowGameSelector] = useState(false);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<FullAnalysis | null>(null);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'analysis' | 'chat'>('analysis');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userQuery, setUserQuery] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    try {
      const tempGame = new Chess();
      if (pgn) {
        tempGame.loadPgn(pgn);
        const history = tempGame.history();
        setMoveHistory(history);
        setCurrentMoveIndex(history.length - 1);
        setGame(tempGame);
      }
    } catch (err) {
      setError("Invalid PGN data.");
    }
  }, [pgn]);

  const makeAMove = useCallback((move: any) => {
    try {
      const gameCopy = new Chess(game.fen());
      const result = gameCopy.move(move);
      if (result) {
        setGame(gameCopy);
        setPgn(gameCopy.pgn());
        setError(null);
        return true;
      }
    } catch (e) {
      return false;
    }
    return false;
  }, [game]);

  const onDrop = (sourceSquare: string, targetSquare: string) => {
    const move = makeAMove({
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q',
    });
    return move;
  };

  const handlePgnUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setPgn(content);
        setInputMode('pgn');
      };
      reader.readAsText(file);
    }
  };

  const handleLichessSearch = async () => {
    if (!username) return;
    setIsSearchingLichess(true);
    setError(null);
    try {
      const games = await fetchRecentLichessGames(username);
      setRecentGames(games);
      setShowGameSelector(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSearchingLichess(false);
    }
  };

  const selectLichessGame = async (gameId: string) => {
    setIsAnalyzing(true);
    setShowGameSelector(false);
    try {
      const pgnData = await fetchLichessGamePgn(gameId);
      setPgn(pgnData);
      setInputMode('lichess');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const startAnalysis = async () => {
    if (!pgn && moveHistory.length === 0) {
      setError("Please input some moves or upload a game first.");
      return;
    }
    setIsAnalyzing(true);
    setAnalysis(null);
    setError(null);
    try {
      const result = await analyzeGame(pgn || game.pgn());
      setAnalysis(result);
      setActiveTab('analysis');
    } catch (err: any) {
      setError("Analysis failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetGame = () => {
    setGame(new Chess());
    setPgn('');
    setMoveHistory([]);
    setCurrentMoveIndex(-1);
    setAnalysis(null);
    setChatMessages([]);
    setError(null);
  };

  const navigateToMove = (index: number) => {
    const tempGame = new Chess();
    if (pgn) {
      tempGame.loadPgn(pgn);
      const history = tempGame.history();
      const newGame = new Chess();
      for (let i = 0; i <= index; i++) {
        newGame.move(history[i]);
      }
      setGame(newGame);
      setCurrentMoveIndex(index);
    }
  };

  const handleSendChat = async () => {
    if (!userQuery.trim() || isThinking) return;
    const query = userQuery;
    setUserQuery('');
    const newMessages: ChatMessage[] = [...chatMessages, { role: 'user', content: query }];
    setChatMessages(newMessages);
    setIsThinking(true);

    try {
      const response = await chatWithAssistant(
        query,
        pgn || game.pgn(),
        game.fen(),
        chatMessages,
        analysis || undefined
      );
      setChatMessages([...newMessages, { role: 'assistant', content: response }]);
    } catch (err) {
      setError("Chat failed. Check your API key or connection.");
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row p-4 gap-6 bg-slate-950 text-slate-100">
      
      {/* Sidebar */}
      <aside className="w-full lg:w-96 flex flex-col gap-6 order-2 lg:order-1 shrink-0">
        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 backdrop-blur-sm shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <BrainCircuit className="w-8 h-8 text-indigo-400" />
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
              GM Studio
            </h1>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-400 mb-2 block">Input Method</label>
              <div className="grid grid-cols-3 gap-2 p-1 bg-slate-800 rounded-lg">
                {(['manual', 'pgn', 'lichess'] as InputMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setInputMode(mode)}
                    className={`text-xs py-2 rounded-md transition-all ${
                      inputMode === mode ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-700 text-slate-400'
                    }`}
                  >
                    {mode.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {inputMode === 'lichess' && (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Lichess Username"
                    value={username}
                    onKeyDown={(e) => e.key === 'Enter' && handleLichessSearch()}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 pl-10 pr-4 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                  />
                </div>
                <button 
                  onClick={handleLichessSearch}
                  disabled={isSearchingLichess}
                  className="bg-indigo-600 hover:bg-indigo-700 p-2 rounded-lg transition-colors shadow-lg disabled:opacity-50"
                >
                  {isSearchingLichess ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                </button>
              </div>
            )}

            {inputMode === 'pgn' && (
              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-700 rounded-lg cursor-pointer hover:border-indigo-500 hover:bg-slate-800/50 transition-all">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-6 h-6 text-slate-400 mb-2" />
                  <p className="text-xs text-slate-400">Upload PGN file</p>
                </div>
                <input type="file" accept=".pgn" className="hidden" onChange={handlePgnUpload} />
              </label>
            )}

            <div className="flex gap-3 pt-4">
              <button 
                onClick={startAnalysis}
                disabled={isAnalyzing || (pgn === '' && moveHistory.length === 0)}
                className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-50 to-purple-500 disabled:opacity-50 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg hover:shadow-indigo-500/20 transition-all"
              >
                {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trophy className="w-5 h-5" />}
                Analyze Game
              </button>
              <button 
                onClick={resetGame}
                className="bg-slate-800 hover:bg-slate-700 p-3 rounded-xl border border-slate-700 transition-colors"
              >
                <RotateCcw className="w-5 h-5 text-slate-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Moves History */}
        <div className="flex-1 bg-slate-900/50 p-6 rounded-2xl border border-slate-800 backdrop-blur-sm overflow-hidden flex flex-col min-h-[200px]">
          <h2 className="text-sm font-semibold text-slate-400 mb-4 flex items-center gap-2">
            <BookOpen className="w-4 h-4" /> Move History
          </h2>
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <div className="grid grid-cols-2 gap-2">
              {moveHistory.map((move, idx) => (
                <button
                  key={idx}
                  onClick={() => navigateToMove(idx)}
                  className={`text-left px-3 py-2 rounded-lg text-sm font-mono flex justify-between items-center transition-all ${
                    currentMoveIndex === idx ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/50' : 'hover:bg-slate-800 text-slate-400'
                  }`}
                >
                  <span className="opacity-50">{Math.floor(idx / 2) + 1}{idx % 2 === 0 ? '.' : '...'}</span>
                  <span>{move}</span>
                </button>
              ))}
              {moveHistory.length === 0 && (
                <p className="col-span-2 text-center text-slate-600 py-10 italic">No moves played yet</p>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-500/50 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col gap-6 order-1 lg:order-2">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Board */}
          <div className="bg-slate-900 p-4 rounded-3xl border border-slate-800 shadow-2xl flex flex-col items-center">
            <div className="w-full max-w-[500px] aspect-square">
              <Chessboard 
                position={game.fen()} 
                onPieceDrop={onDrop}
                customBoardStyle={{
                  borderRadius: '12px',
                  boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)'
                }}
                customDarkSquareStyle={{ backgroundColor: '#475569' }}
                customLightSquareStyle={{ backgroundColor: '#cbd5e1' }}
              />
              <div className="mt-4 flex justify-center gap-4">
                <button 
                  onClick={() => navigateToMove(currentMoveIndex - 1)}
                  disabled={currentMoveIndex < 0}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 transition-all"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button 
                   onClick={() => navigateToMove(currentMoveIndex + 1)}
                   disabled={currentMoveIndex >= moveHistory.length - 1}
                   className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 transition-all"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>

          {/* Analysis & Chat Tabs */}
          <div className="flex flex-col gap-4 min-h-[500px] bg-slate-900/30 rounded-3xl border border-slate-800 overflow-hidden">
            <div className="flex border-b border-slate-800">
              <button 
                onClick={() => setActiveTab('analysis')}
                className={`flex-1 py-4 flex items-center justify-center gap-2 transition-all border-b-2 ${activeTab === 'analysis' ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
              >
                <Trophy className="w-4 h-4" /> Game Analysis
              </button>
              <button 
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-4 flex items-center justify-center gap-2 transition-all border-b-2 ${activeTab === 'chat' ? 'border-purple-500 text-purple-400 bg-purple-500/5' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
              >
                <MessageSquare className="w-4 h-4" /> Ask Coach
              </button>
            </div>

            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
              {activeTab === 'analysis' ? (
                !analysis ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <BrainCircuit className="w-12 h-12 text-slate-700 mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Grandmaster Feedback</h3>
                    <p className="text-slate-500 text-sm max-w-xs">Run analysis to see scores and strategic advice.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <PhaseCard title="Opening" phase={analysis.opening} />
                      <PhaseCard title="Middlegame" phase={analysis.middlegame} />
                      <PhaseCard title="Tactics" phase={analysis.tactics} />
                      <PhaseCard title="Endgame" phase={analysis.endgame} />
                    </div>
                    <div className="bg-indigo-600/10 border border-indigo-500/30 p-5 rounded-2xl italic text-slate-300">
                      "{analysis.overallAdvice}"
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <BookOpen className="w-4 h-4" /> Study List
                      </h3>
                      <div className="grid gap-2">
                        {analysis.referencedBooks.map((book, idx) => (
                          <div key={idx} className="bg-slate-800/50 p-3 rounded-lg border border-slate-700 text-sm text-slate-300">
                            {book}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <div className="h-full flex flex-col gap-4">
                  <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                    {chatMessages.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-slate-500">
                        <MessageSquare className="w-8 h-8 mb-2 opacity-20" />
                        <p className="text-sm">Ask me about the current position or game plan.</p>
                      </div>
                    )}
                    {chatMessages.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'}`}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {isThinking && (
                      <div className="flex justify-start">
                        <div className="bg-slate-800 p-3 rounded-2xl border border-slate-700 rounded-tl-none flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                          <span className="text-xs text-slate-400">Coach is thinking...</span>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                  <div className="flex gap-2 p-2 bg-slate-800/50 rounded-xl border border-slate-700">
                    <input 
                      type="text" 
                      placeholder="e.g., Why was Bc4 a good move?"
                      value={userQuery}
                      onChange={(e) => setUserQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                      className="flex-1 bg-transparent border-none focus:ring-0 text-sm px-2"
                    />
                    <button 
                      onClick={handleSendChat}
                      disabled={isThinking || !userQuery.trim()}
                      className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 p-2 rounded-lg transition-all"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Lichess Game Selector Modal */}
      {showGameSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">Select Game</h2>
                <p className="text-sm text-slate-400">Recent games for {username}</p>
              </div>
              <button onClick={() => setShowGameSelector(false)} className="p-2 hover:bg-slate-800 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {recentGames.map((g) => (
                <button
                  key={g.id}
                  onClick={() => selectLichessGame(g.id)}
                  className="w-full text-left p-4 bg-slate-800 hover:bg-indigo-600/20 hover:border-indigo-500/50 rounded-2xl border border-slate-700 transition-all flex justify-between items-center"
                >
                  <div>
                    <div className="font-semibold flex items-center gap-2">
                      <span className="text-white">{g.players.white.user?.name || 'Anon'}</span>
                      <span className="text-slate-500 text-xs">vs</span>
                      <span className="text-white">{g.players.black.user?.name || 'Anon'}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(g.createdAt).toLocaleDateString()} • {g.variant} • {g.status}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-600" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
      `}</style>
    </div>
  );
};

const PhaseCard: React.FC<PhaseCardProps> = ({ title, phase }) => {
  const getColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-indigo-400';
    if (score >= 40) return 'text-amber-400';
    return 'text-red-400';
  };
  const getBg = (score: number) => {
    if (score >= 80) return 'bg-emerald-500/10 border-emerald-500/30';
    if (score >= 60) return 'bg-indigo-500/10 border-indigo-500/30';
    if (score >= 40) return 'bg-amber-500/10 border-amber-500/30';
    return 'bg-red-500/10 border-red-500/30';
  };
  return (
    <div className={`p-4 rounded-2xl border transition-all ${getBg(phase.score)}`}>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</p>
      <div className={`text-xl font-bold ${getColor(phase.score)}`}>{phase.score}%</div>
    </div>
  );
};

interface PhaseCardProps {
  title: string;
  phase: { score: number; feedback: string };
}

export default App;
