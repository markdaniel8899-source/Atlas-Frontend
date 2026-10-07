export interface Friend {
  id: string;
  name: string;
  handle: string;
  initials: string;
  avatar: string;
  status: "studying" | "online" | "offline";
  minutesThisWeek: number;
  goalMinutes: number;
  streak: number;
  level: number;
}

export const SQUAD: Friend[] = [
  {
    id: "f1",
    name: "Maya Chen",
    handle: "@maya.builds",
    initials: "MC",
    avatar: "from-[#3d4f9e] to-[#7b8ee8]",
    status: "studying",
    minutesThisWeek: 640,
    goalMinutes: 720,
    streak: 21,
    level: 14,
  },
  {
    id: "f2",
    name: "Omar Reyes",
    handle: "@omarsys",
    initials: "OR",
    avatar: "from-[#2f6f6a] to-[#5fbdb2]",
    status: "online",
    minutesThisWeek: 415,
    goalMinutes: 600,
    streak: 9,
    level: 11,
  },
  {
    id: "f3",
    name: "Lena Fischer",
    handle: "@lenaf",
    initials: "LF",
    avatar: "from-[#6b3fa0] to-[#a982e0]",
    status: "studying",
    minutesThisWeek: 720,
    goalMinutes: 720,
    streak: 34,
    level: 17,
  },
  {
    id: "f4",
    name: "Kofi Mensah",
    handle: "@kofi.dev",
    initials: "KM",
    avatar: "from-[#a0593f] to-[#e0975f]",
    status: "offline",
    minutesThisWeek: 260,
    goalMinutes: 480,
    streak: 4,
    level: 8,
  },
  {
    id: "f5",
    name: "Sofia Marino",
    handle: "@sofiam",
    initials: "SM",
    avatar: "from-[#28617e] to-[#5aa7cd]",
    status: "online",
    minutesThisWeek: 530,
    goalMinutes: 600,
    streak: 16,
    level: 13,
  },
  {
    id: "f6",
    name: "Arjun Patel",
    handle: "@arjunml",
    initials: "AP",
    avatar: "from-[#7e3f5c] to-[#cd6f95]",
    status: "studying",
    minutesThisWeek: 690,
    goalMinutes: 720,
    streak: 28,
    level: 16,
  },
];
