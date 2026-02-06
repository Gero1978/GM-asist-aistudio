
import { LichessGameSummary } from "../types";

export const fetchRecentLichessGames = async (username: string): Promise<LichessGameSummary[]> => {
  try {
    const response = await fetch(`https://lichess.org/api/games/user/${username}?max=10&moves=false&pgnInJson=false`, {
      headers: { 'Accept': 'application/x-ndjson' }
    });
    if (!response.ok) {
      throw new Error("Lichess user not found or private.");
    }
    const text = await response.text();
    const lines = text.trim().split('\n');
    return lines.map(line => JSON.parse(line) as LichessGameSummary);
  } catch (error) {
    console.error("Lichess list fetch error:", error);
    throw error;
  }
};

export const fetchLichessGamePgn = async (gameId: string): Promise<string> => {
  try {
    const response = await fetch(`https://lichess.org/game/export/${gameId}?moves=true&pgnInJson=false`, {
      headers: { 'Accept': 'application/x-chess-pgn' }
    });
    if (!response.ok) {
      throw new Error("Could not fetch game PGN.");
    }
    return await response.text();
  } catch (error) {
    console.error("Lichess PGN fetch error:", error);
    throw error;
  }
};
