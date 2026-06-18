/** CDL driver recruiting page — content from teambaileys.com (archived). */
export const CDL_RECRUITING = {
  phone: "(800) 556-0956",
  phoneHref: "tel:+18005560956",
  email: "driver_info@baileysallied.com",
  address: {
    line1: "400 N 700 W",
    line2: "North Salt Lake, UT 84054",
    mapsUrl:
      "https://maps.google.com/?q=Baileys+Moving+400+N+700+W+North+Salt+Lake+UT+84054",
  },
} as const;

export const CDL_STATS = [
  { value: "65", label: "Years in Business" },
  { value: "130", label: "Years of Ops Mgmt Experience", compact: true },
  { value: "48", label: "States of Operation" },
  { value: "7", label: "Day Pay Periods" },
] as const;

export const CDL_BENEFITS = [
  {
    title: "Packing Opportunities",
    body: "We do our best to find extra opportunities for our drivers to earn. Whether its packing or other, we'll work to get you the most money possible.",
    icon: "archive",
  },
  {
    title: "Experienced Dispatch / Support Team",
    body: "With our team, you know you're getting a team that understands your challenges and will be with you at each step to make sure you get what you need.",
    icon: "users",
  },
  {
    title: "Incentive Pay",
    body: "Our top 10% and 20% are tiered up in pay for performance and we want you to be there. We'll work with you and help you get there.",
    icon: "trend",
  },
  {
    title: "Excellent Equipment",
    body: "We take pride in making sure that we're using the best equipment possible. We have no trailer maintenance fees and we know you'll love our equipment.",
    icon: "truck",
  },
  {
    title: "Large Booker with Top-Paying Contracts",
    body: "We can't stress this one enough: We have more bookings than almost anyone else. But since we know quantity isn't everything, we also have some of the top-paying contracts around.",
    icon: "dollar",
  },
  {
    title: "Fuel Cards with Discounts",
    body: "Fuel is a big expense: we'll help you manage it and keep it low.",
    icon: "card",
  },
] as const;

export type CdlTeamMember = {
  id: string;
  name: string;
  role: string;
  image: string;
  paragraphs: string[];
  experience: string;
};

export const CDL_TEAM: CdlTeamMember[] = [
  {
    id: "robert",
    name: "Robert Albertoni",
    role: "Driver Recruiting Manager",
    image: "team-1.jpg",
    paragraphs: [
      "I started in the moving industry in 1986 with United Van Lines on the local crew. I have held multiple positions since from local dispatcher, Operations Manager, Sales, Owner Operator, General Manager, Long Haul Planner/Dispatcher, Director of Long Distance Operations and Driver Recruiter.",
      "I enjoy the outdoors camping, fishing and hiking. I have 3 kids, and 1 grand son which is a ton of fun to spoil. love working on the house both inside and out which is very therapeutic with a job that is sometimes stressful. I love hanging out with the family watching movies, playing games or just about anything.",
    ],
    experience: "30 years of Experience in the Industry",
  },
  {
    id: "duane",
    name: "Duane Carey",
    role: "Dispatcher",
    image: "team-2.jpg",
    paragraphs: [
      "I started my career in 1977 hauling hay for a farm, followed by time hauling heavy equipment and blowing dynamite for an oil company. Since 1986 I've been in the Allied Van Lines network working for a few agents over the years. I've done most kinds of driving including years of OTR experience.",
      "I am an avid golfer and love to play any chance I get. I'm particulary proud of my time as a crew chief and part-time racecar driver.",
    ],
    experience: "30 Years Experience in the Industry",
  },
  {
    id: "scott",
    name: "Scott Wolfe",
    role: "Dispatcher",
    image: "team-3.jpg",
    paragraphs: [
      "I am a second generation moving professional. I started as a young boy going/working for my father on trips. Then out of high school went into local crews till I turned 21. Then went OTR the 20 yrs. My whole career has been in the Allied Van Lines network.",
      "During my spare time I enjoy golfing, riding motorcycles, playing cards, and DIY projects. I also enjoy traveling outside the United States to go snorkeling.",
    ],
    experience: "30 Years Experience in the Industry",
  },
  {
    id: "kevin",
    name: "Kevin Beckstead",
    role: "President | CEO",
    image: "team-4.jpg",
    paragraphs: [
      "Kevin Beckstead began his career at Bailey's Moving & Storage in 1981 when he started working in the warehouse during the summers. Developing quickly with a talent for the industry, Kevin was promoted to many positions throughout the company. By 2000, Kevin had held the titles of Crew Lead, CDL Driver, Operations Manager, General Manager and Vice President of Sales and Marketing. Kevin now owns a portion of the company and retains the title of CEO / President.",
      "Kevin holds a degree in Transportation Management from Weber State University's College of Business and enjoys such hobbies as golf, hiking and travelling.",
    ],
    experience: "40 Years Experience in the Industry",
  },
];
