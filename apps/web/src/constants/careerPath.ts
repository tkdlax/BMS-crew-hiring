export type CareerPathStat = {
  value: string;
  label: string;
};

export type CareerPathStory = {
  id: string;
  youtubeId: string;
  name: string;
  angle: string;
  quote: string;
  stats: CareerPathStat[];
};

export const CAREER_PATH_ROLE = "Master mover · CDL-A · owner-operator";

/** Owner-operator stories — quotes and stats taken from the videos. */
export const CAREER_PATH_STORIES: CareerPathStory[] = [
  {
    id: "frank",
    youtubeId: "LoDlPPyDaKw",
    name: "Frank",
    angle: "Frank — the money",
    quote: "It's helped me raise three beautiful daughters that all have college educations.",
    stats: [
      { value: "40", label: "Years at Bailey's" },
      { value: "4.9", label: "Customer rating" },
      { value: "Own truck", label: "Runs" },
    ],
  },
  {
    id: "troy",
    youtubeId: "qgjetrmBrYA",
    name: "Troy Talbot",
    angle: "Troy Talbot — the long haul",
    quote: "I'm currently about two years from getting my two-million-mile safe driver award.",
    stats: [
      { value: "36", label: "Years at Bailey's" },
      { value: "OTR", label: "Runs" },
    ],
  },
  {
    id: "himes",
    youtubeId: "2OpZ9VGUQ0s",
    name: "The Himes",
    angle: "The Himes — doing it together",
    quote: "He didn't want to hit the road alone, so I said okay, I'll go.",
    stats: [
      { value: "15", label: "Years at Bailey's" },
      { value: "Team truck", label: "Runs" },
    ],
  },
];
