export type CareerPathStory = {
  id: string;
  youtubeId: string;
  name: string;
  role: string;
  summary: string;
  featured?: boolean;
};

/** Owner-operator / master mover stories on the career path page. */
export const CAREER_PATH_STORIES: CareerPathStory[] = [
  {
    id: "frank",
    youtubeId: "LoDlPPyDaKw",
    name: "Frank",
    role: "The Master Mover",
    featured: true,
    summary:
      "With a near-perfect customer rating of 4.9 out of 5, Frank is a true professional in the industry. Discover how he got his start and why he's so passionate about his work.",
  },
  {
    id: "troy",
    youtubeId: "qgjetrmBrYA",
    name: "Troy Talbot",
    role: "A career at Bailey's",
    summary:
      "Troy shares his history with Bailey's and how moving shaped his career — the skills, the team, and why this work can be a rewarding path.",
  },
  {
    id: "himes",
    youtubeId: "2OpZ9VGUQ0s",
    name: "The Himes",
    role: "Husband & wife master movers",
    summary:
      "A unique moving team: married, and both master movers. Listen to their story.",
  },
];
