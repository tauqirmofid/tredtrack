"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Trophy, Medal, Star, Loader2, Users, Zap, MapPin } from "lucide-react";

interface LeaderboardUser {
  rank: number;
  id: string;
  name: string;
  username: string;
  city: string | null;
  country: string | null;
  totalDistance: number;
  totalRuns: number;
  avgSpeed: number;
}

export default function LeaderboardPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [myRank, setMyRank] = useState<LeaderboardUser | null>(null);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((data) => {
        setUsers(data);
        const me = data.find((u: LeaderboardUser) => u.id === (session?.user as { id?: string })?.id);
        setMyRank(me ?? null);
        setLoading(false);
      });
  }, [session]);

  function RankBadge({ rank }: { rank: number }) {
    if (rank === 1) return <Trophy size={18} style={{ color: "#ffd60a" }} />;
    if (rank === 2) return <Medal size={18} style={{ color: "#c7c7cc" }} />;
    if (rank === 3) return <Medal size={18} style={{ color: "#cd7f32" }} />;
    return (
      <span className="text-sm font-bold" style={{ color: "#636366", minWidth: 20, textAlign: "center" }}>
        {rank}
      </span>
    );
  }

  function initials(name: string) {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  const avatarColors = [
    "#0a84ff", "#30d158", "#ff9f0a", "#bf5af2", "#ff453a", "#32ade6", "#ffd60a",
  ];

  function avatarColor(id: string) {
    let hash = 0;
    for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) % avatarColors.length;
    return avatarColors[hash];
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={28} className="animate-spin" style={{ color: "#30d158" }} />
      </div>
    );
  }

  return (
    <div className="px-4 pt-14 pb-4">
      {/* Header */}
      <div className="mb-6 fade-in-up">
        <h1 className="text-2xl font-bold" style={{ color: "#f5f5f7" }}>Leaderboard</h1>
        <p className="text-sm mt-1" style={{ color: "#8e8e93" }}>
          Global rankings by total distance
        </p>
      </div>

      {/* My rank card (sticky summary) */}
      {myRank && (
        <div
          className="card p-4 mb-5 fade-in-up flex items-center gap-3"
          style={{ border: "1px solid rgba(48,209,88,0.3)", background: "rgba(48,209,88,0.05)" }}>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ background: avatarColor(myRank.id), color: "white" }}>
            {initials(myRank.name)}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm" style={{ color: "#f5f5f7" }}>You</p>
              <span
                className="text-xs px-1.5 py-0.5 rounded-md"
                style={{ background: "rgba(48,209,88,0.15)", color: "#30d158" }}>
                Rank #{myRank.rank}
              </span>
            </div>
            <p className="text-xs mt-0.5" style={{ color: "#8e8e93" }}>
              {myRank.totalDistance.toFixed(2)} km · {myRank.totalRuns} runs
            </p>
          </div>
          <Star size={18} style={{ color: "#30d158" }} />
        </div>
      )}

      {/* Top 3 podium */}
      {users.length >= 3 && (
        <div className="flex items-end gap-2 mb-5 fade-in-up" style={{ animationDelay: "0.05s" }}>
          {/* 2nd */}
          <div
            className="flex-1 card p-3 flex flex-col items-center"
            style={{ minHeight: 110, border: "1px solid rgba(199,199,204,0.2)" }}>
            <Medal size={20} style={{ color: "#c7c7cc" }} />
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold mt-2"
              style={{ background: avatarColor(users[1].id), color: "white" }}>
              {initials(users[1].name)}
            </div>
            <p className="text-xs font-semibold mt-1 text-center" style={{ color: "#f5f5f7" }}>
              {users[1].name.split(" ")[0]}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "#8e8e93" }}>
              {users[1].totalDistance.toFixed(1)} km
            </p>
          </div>

          {/* 1st */}
          <div
            className="flex-1 card p-3 flex flex-col items-center"
            style={{
              minHeight: 130,
              border: "1px solid rgba(255,214,10,0.3)",
              background: "rgba(255,214,10,0.04)",
            }}>
            <Trophy size={22} style={{ color: "#ffd60a" }} />
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold mt-2"
              style={{ background: avatarColor(users[0].id), color: "white" }}>
              {initials(users[0].name)}
            </div>
            <p className="text-sm font-bold mt-1 text-center" style={{ color: "#f5f5f7" }}>
              {users[0].name.split(" ")[0]}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "#ffd60a" }}>
              {users[0].totalDistance.toFixed(1)} km
            </p>
          </div>

          {/* 3rd */}
          <div
            className="flex-1 card p-3 flex flex-col items-center"
            style={{ minHeight: 110, border: "1px solid rgba(205,127,50,0.2)" }}>
            <Medal size={20} style={{ color: "#cd7f32" }} />
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold mt-2"
              style={{ background: avatarColor(users[2].id), color: "white" }}>
              {initials(users[2].name)}
            </div>
            <p className="text-xs font-semibold mt-1 text-center" style={{ color: "#f5f5f7" }}>
              {users[2].name.split(" ")[0]}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "#8e8e93" }}>
              {users[2].totalDistance.toFixed(1)} km
            </p>
          </div>
        </div>
      )}

      {/* Full list */}
      <div className="card overflow-hidden fade-in-up" style={{ animationDelay: "0.1s" }}>
        <div
          className="px-4 py-3 flex items-center gap-2"
          style={{ borderBottom: "1px solid #2c2c2e" }}>
          <Users size={14} style={{ color: "#8e8e93" }} />
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#8e8e93" }}>
            All Runners · {users.length} total
          </p>
        </div>

        {users.length === 0 && (
          <div className="px-4 py-8 text-center">
            <p className="text-sm" style={{ color: "#636366" }}>No runners yet. Be the first!</p>
          </div>
        )}

        {users.map((user, i) => {
          const isMe = user.id === (session?.user as { id?: string })?.id;
          return (
            <div
              key={user.id}
              className="px-4 py-3.5 flex items-center gap-3"
              style={{
                borderBottom: i < users.length - 1 ? "1px solid #1c1c1e" : undefined,
                background: isMe ? "rgba(48,209,88,0.05)" : undefined,
              }}>
              {/* Rank */}
              <div className="w-7 flex items-center justify-center flex-shrink-0">
                <RankBadge rank={user.rank} />
              </div>

              {/* Avatar */}
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ background: avatarColor(user.id), color: "white" }}>
                {initials(user.name)}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p
                    className="text-sm font-semibold truncate"
                    style={{ color: isMe ? "#30d158" : "#f5f5f7" }}>
                    {user.name}
                    {isMe && <span className="ml-1 text-xs font-normal" style={{ color: "#30d158" }}>(you)</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {(user.city || user.country) && (
                    <div className="flex items-center gap-0.5">
                      <MapPin size={10} style={{ color: "#636366" }} />
                      <p className="text-xs truncate" style={{ color: "#636366" }}>
                        {user.city ?? user.country}
                      </p>
                    </div>
                  )}
                  <div className="flex items-center gap-0.5">
                    <Zap size={10} style={{ color: "#636366" }} />
                    <p className="text-xs" style={{ color: "#636366" }}>
                      {user.avgSpeed.toFixed(1)} km/h avg
                    </p>
                  </div>
                </div>
              </div>

              {/* Distance */}
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold" style={{ color: "#f5f5f7" }}>
                  {user.totalDistance >= 1000
                    ? `${(user.totalDistance / 1000).toFixed(1)}k`
                    : user.totalDistance.toFixed(1)}{" "}
                  km
                </p>
                <p className="text-xs" style={{ color: "#636366" }}>{user.totalRuns} runs</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
