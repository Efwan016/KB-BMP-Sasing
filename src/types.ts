export type Module = {
  title: string;
  description: string;
  eyebrow: string;
  label: string;
  duration: string;
  level: string;
  asset: string;
  highlights: string[];
};

export type ReadingHistoryItem = {
  asset: string;
  label: string;
  title: string;
  timestamp: number;
};