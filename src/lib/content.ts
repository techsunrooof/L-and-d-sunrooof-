/*
  SUNROOOF L&D — seeded content (real HR content, loaded verbatim).

  Content lives in code (there is no CMS/database for content). A module holds an
  ordered list of ITEMS, and an item is one of:
    • video      — a lesson video (local MP4 or, later, a confirmed YouTube link)
    • document   — a readable PDF / article, always available, never locked (§5.7)
    • assessment — a standalone test that attaches after the video/document

  Assessment questions are typed in EXACTLY as written in the HR Word files —
  never reworded, shortened or "fixed". MCQ answer keys and pass marks are NOT in
  those files, so they are left null for HR to fill in.

  Only slots that have received content are filled. Every day/module/item with no
  content yet is simply absent (empty), never a placeholder (§0, "most important
  rule"). The home page still shows Day 1, Day 2, Day 3 only.
*/

/* ------------------------------------------------------------------ */
/* Assessment model                                                    */
/* ------------------------------------------------------------------ */

export type McqQuestion = {
  kind: "mcq";
  id: string;
  /** Display label as in the source, e.g. "Q1". */
  label: string;
  /** Verbatim question text (without the "Q1." prefix). */
  prompt: string;
  /** Verbatim options, in order (UI adds the A/B/C/D letters). */
  options: string[];
  marks: number;
  /** Index of the correct option — null until HR supplies the answer key. */
  correctIndex: number | null;
};

export type WrittenQuestion = {
  kind: "written";
  id: string;
  label: string;
  prompt: string;
  marks: number;
  /** e.g. "Aim for 150–250 words." — kept because it's useful on screen. */
  guidance?: string;
};

export type ScenarioPart = {
  id: string;
  /** Verbatim part text, e.g. "a) You have 60 seconds…". */
  prompt: string;
  /** The label printed above the answer box, e.g. "Your opening response:". */
  boxLabel: string;
};

export type ScenarioQuestion = {
  kind: "scenario";
  id: string;
  label: string;
  /** The scenario's own title, e.g. "The Penthouse Meeting". */
  title: string;
  marks: number;
  /** The situation the learner reads before answering. */
  situation: string;
  /** Each part gets its own answer box (§ "How to load"). */
  parts: ScenarioPart[];
};

export type Question = McqQuestion | WrittenQuestion | ScenarioQuestion;

/** A heading group inside a section (e.g. a Code-of-Conduct principle). */
export type QuestionGroup = {
  heading?: string;
  questions: Question[];
};

export type AssessmentSection = {
  title: string;
  instructions?: string;
  groups: QuestionGroup[];
};

export type Assessment = {
  id: string;
  title: string;
  subtitle?: string;
  totalMarks: number;
  /** Pass mark in MARKS — null until HR sets it. */
  passMark: number | null;
  instructions?: string[];
  sections: AssessmentSection[];
  /**
   * True when a person must review it (written/scenario answers). For these,
   * "done" means submitted, not passed (§ Locking). MCQ keys are absent anyway.
   */
  needsReview: boolean;
};

/* ------------------------------------------------------------------ */
/* Module items                                                        */
/* ------------------------------------------------------------------ */

export type ItemKind = "video" | "document" | "assessment";

type ItemBase = {
  id: string;
  /** Day-based decimal, e.g. "1.1" — STORED, in running order of the day. */
  number: string;
  title: string;
};

export type VideoItem = ItemBase & {
  kind: "video";
  durationSeconds: number;
  /** Local MP4 route, or null when the real video isn't available yet. */
  src: string | null;
  /** Confirmed YouTube id, or null. (No link is confirmed yet.) */
  youtubeId: string | null;
  thumbnail: string | null;
};

export type DocumentItem = ItemBase & {
  kind: "document";
  /** Served through /api/document/[id]; null when the file isn't in yet. */
  file: string | null;
  sizeLabel: string | null;
  /** For a written article kept as sections (e.g. "The Magppie Truth"). */
  sections: { heading: string; body: string }[] | null;
};

export type AssessmentItem = ItemBase & {
  kind: "assessment";
  assessment: Assessment;
};

export type ModuleItem = VideoItem | DocumentItem | AssessmentItem;

export type Module = {
  id: string;
  day: number;
  order: number;
  title: string;
  items: ModuleItem[];
};

/** An in-person schedule item (§5) — NOT a portal module. Shown as a distinct,
 *  non-clickable row; never a video, never counted in progress. */
export type Activity = { id: string; title: string; note?: string };

export type Day = {
  number: number;
  title: string;
  subtitle: string;
  /** /photos/*.jpg — null means real photograph pending. */
  photo: string | null;
  /** Alt text describing the actual scene (§6.16) — not the filename. */
  photoAlt?: string;
  /**
   * Which track this day belongs to. `null` = the common induction (Days 1–3,
   * everyone). Otherwise a department name (Days 4+). Designed so other
   * departments' tracks drop in later without a rewrite (§2).
   */
  department: string | null;
  /** In-person activities shown in the day's expansion (§5). */
  activities?: Activity[];
};

/** All departments. From Day 4 each has its own track; only Sales is planned yet (§2). */
export const DEPARTMENTS = [
  "Pre-Sales",
  "Sales",
  "Design",
  "Marketing",
  "Factory and Manufacturing",
  "Finance",
  "Installation",
  "HR",
  "Dispatch",
  "Tech",
] as const;

/* ================================================================== */
/* ASSESSMENT DATA — transcribed verbatim from the HR Word files       */
/* ================================================================== */

// Helper to keep the data below terse.
const mcq = (
  n: number,
  prompt: string,
  options: string[],
  marks = 1,
): McqQuestion => ({
  kind: "mcq",
  id: `q${n}`,
  label: `Q${n}`,
  prompt,
  options,
  marks,
  correctIndex: null, // HR to supply
});

const written = (n: number, prompt: string, marks: number, guidance?: string): WrittenQuestion => ({
  kind: "written",
  id: `q${n}`,
  label: `Q${n}`,
  prompt,
  marks,
  guidance,
});

/* ---- Code of Conduct assessment (Vision file: COC_Sales_assessment.docx) ---- */
export const CODE_OF_CONDUCT_ASSESSMENT: Assessment = {
  id: "coc-assessment",
  title: "Code of Conduct — Sales Team Assessment",
  subtitle: "Wellness Consultants & Wellness Specialists",
  totalMarks: 65,
  passMark: null,
  needsReview: true,
  instructions: [
    "“Growing with the right values and ethics.”",
    "Total Marks: 65 — Part A: 25 MCQs × 1 mark = 25 marks. Part B: 8 paragraph questions × 5 marks = 40 marks.",
    "Beyond Targets. Beyond Sales. This Is Who We Are.",
  ],
  sections: [
    {
      title: "Part A — Multiple choice questions",
      instructions:
        "Circle or tick the single best answer for each question. Each question carries 1 mark. Total: 25 marks.",
      groups: [
        {
          heading: "Principle 1: No False Commitment",
          questions: [
            mcq(1, "According to SUNROOOF's Sales Code of Conduct, a team member should never lie or exaggerate about:", [
              "The price of the product",
              "Product capability, delivery timelines, installation process, effects, or experience just to close a deal",
              "The team size or company history",
              "Competitor products",
            ]),
            mcq(2, "If something about a product or delivery is uncertain, the correct approach is to:", [
              "Give an optimistic answer to keep the customer interested",
              "Avoid the topic until after the deal is closed",
              "Clearly communicate the uncertainty instead of making assumptions",
              "Ask a colleague to handle that part of the conversation",
            ]),
            mcq(3, "The statement 'Trust once broken cannot be sold back' means:", [
              "Once a customer stops trusting you, no discount can win them back",
              "Trust is a one-time transaction",
              "Broken trust destroys the relationship permanently and cannot be recovered through sales tactics",
              "Only the sales manager can rebuild trust with a customer",
            ]),
          ],
        },
        {
          heading: "Principle 2: Sell Value, Not Desperation",
          questions: [
            mcq(4, "According to Principle 2, if a customer does not resonate with SUNROOOF's value proposition, the team should:", [
              "Offer a heavy discount to close the deal",
              "Keep calling until they agree",
              "Accept that they are not the ideal customer — and that is perfectly okay",
              "Escalate to a senior manager",
            ]),
            mcq(5, "Which of the following behaviours is explicitly prohibited under Principle 2?", [
              "Explaining the product features clearly",
              "Overselling or pushing someone into a decision",
              "Sharing honest customer testimonials",
              "Following up with a customer after a demo",
            ]),
          ],
        },
        {
          heading: "Principle 3: Wellness First",
          questions: [
            mcq(6, "How should SUNROOOF always be presented to a customer?", [
              "As a premium lighting fixture and interior design element",
              "As a wellness product that also happens to be beautiful lighting technology",
              "As a smart home automation device",
              "As a cost-saving energy solution",
            ]),
            mcq(7, "Which of the following is a tangible human benefit that must always be communicated when selling SUNROOOF?", [
              "Lower electricity bills",
              "Improved room aesthetics",
              "Increased positivity, improved mood, better serotonin activation, and enhanced focus",
              "Faster Wi-Fi connectivity",
            ]),
            mcq(8, "According to Principle 3, the correct selling priority is:", [
              "Beautiful design first, then wellness benefits",
              "Technology first, then aesthetics",
              "Price value first, then features",
              "Wellness first, then beautiful lighting technology",
            ]),
          ],
        },
        {
          heading: "Principle 4: Say NO When Needed",
          questions: [
            mcq(9, "If a customer already has abundant natural sunlight throughout the day, SUNROOOF's team should:", [
              "Still try to sell because it adds aesthetic value",
              "Transparently communicate that SUNROOOF may not create a strong incremental impact for them",
              "Offer a discounted package to close anyway",
              "Redirect the conversation to other products",
            ]),
            mcq(10, "The statement 'We are not here to sell to everyone. We are here to solve problems for people' reflects which core belief?", [
              "SUNROOOF has a limited product range",
              "Honesty and problem-solving matter more than achieving every sale",
              "Sales targets are not important",
              "The team should only target premium clients",
            ]),
          ],
        },
        {
          heading: "Principle 5: Listen More",
          questions: [
            mcq(11, "According to Principle 5, when should a Wellness Consultant / Specialist begin speaking during a client conversation?", [
              "As soon as the client finishes their introduction",
              "After presenting the product brochure",
              "Only after understanding what problem the customer is trying to solve",
              "After confirming the client's budget",
            ]),
            mcq(12, "Sales, according to Principle 5, is fundamentally about:", [
              "Talking more to convey more value",
              "Listening better, not talking more",
              "Presenting more data and proof points",
              "Closing deals faster",
            ]),
          ],
        },
        {
          heading: "Principle 6: Problem Solvers",
          questions: [
            mcq(13, "Which of the following is an example of a problem that SUNROOOF could solve, as mentioned in the document?", [
              "A client who wants to reduce their electricity bill",
              "A basement with no access to daylight causing wellness issues",
              "A client who wants a home automation system",
              "A client looking for outdoor lighting",
            ]),
            mcq(14, "After understanding a customer's problem, the team should suggest solutions that are:", [
              "As expensive as possible to maximise revenue",
              "Based on what worked for previous clients",
              "Contextual, logical, and honest",
              "Based on the current month's sales targets",
            ]),
          ],
        },
        {
          heading: "Principle 7: Say Less, Say It Better",
          questions: [
            mcq(15, "According to Principle 7, long explanations and over-communication usually signal:", [
              "Deep product knowledge",
              "Confusion and lack of clarity in the speaker's own head",
              "High customer engagement",
              "A complex product feature set",
            ]),
            mcq(16, "Good communication, as per Principle 7, is defined as:", [
              "Adding more words to explain better",
              "Using technical jargon to sound credible",
              "Removing words, not adding them",
              "Matching the customer's communication style",
            ]),
          ],
        },
        {
          heading: "Principle 8: Stand With the Customer Post-Sale",
          questions: [
            mcq(17, "Closing a deal, according to Principle 8, is:", [
              "The end of the team's responsibility",
              "The beginning of the journey with the customer",
              "The point at which the customer is handed to the installation team",
              "The point at which the sales incentive is earned",
            ]),
            mcq(18, "If a customer faces a challenge after a sale, the team should:", [
              "Direct them to the customer care team",
              "Ask them to raise a formal complaint",
              "Stay with them until the issue is resolved — never point fingers at other team members",
              "Offer a discount on the next purchase",
            ]),
          ],
        },
        {
          heading: "Principle 9: Own Your Mistakes",
          questions: [
            mcq(19, "When a mistake is made — such as committing to a wrong timeline — the correct response is:", [
              "Defend the decision with logical reasoning",
              "Blame external circumstances or the production team",
              "Say 'This was our mistake. I am sorry.' and then fix it",
              "Ask the manager to speak to the client",
            ]),
            mcq(20, "According to Principle 9, what builds more trust with a client than winning an argument?", [
              "Offering a discount",
              "Humility and honest acknowledgement of the mistake",
              "Providing more data and evidence",
              "Escalating the issue to senior leadership",
            ]),
          ],
        },
        {
          heading: "Principle 10 & 11: Purpose and Targets",
          questions: [
            mcq(21, "According to Principle 10, incentives are:", [
              "The primary reason to show up and perform",
              "Motivating but not the sole reason one should give full effort",
              "Not important to a true team member",
              "Only relevant for top performers",
            ]),
            mcq(22, "According to Principle 11, targets should be pursued with:", [
              "Urgency, pressure, and any means necessary",
              "Seriousness, preparation, follow-ups, and consistency — but never by compromising honesty",
              "Flexibility — values can be bent if a deal is large enough",
              "Minimal effort since values are more important",
            ]),
          ],
        },
        {
          heading: "Principle 12: Values Are a Standard",
          questions: [
            mcq(23, "Principle 12 warns against using values as:", [
              "A guide for how to sell",
              "An excuse to justify missed targets, weak follow-ups, or lack of ownership",
              "A framework for team performance reviews",
              "A way to evaluate new hires",
            ]),
            mcq(24, "If sales targets are not being met, Principle 12 says the team should:", [
              "Blame the market conditions",
              "Reduce the target for the next quarter",
              "Introspect and improve skills, follow-ups, and customer understanding",
              "Blame the principles for limiting flexibility",
            ]),
          ],
        },
        {
          heading: "Role Identity",
          questions: [
            mcq(25, "According to the document, what are the new role titles replacing 'Pre-Sales Manager' and 'Sales Manager' respectively?", [
              "Customer Success Manager and Business Development Manager",
              "Wellness Consultant and Wellness Specialist",
              "Wellness Advisor and Wellness Executive",
              "Lighting Consultant and Product Specialist",
            ]),
          ],
        },
      ],
    },
    {
      title: "Part B — Paragraph / short answer questions",
      instructions:
        "Answer all 8 questions. Each carries 5 marks. Write your answers in the lines provided. Aim for 150–250 words per answer. Total: 40 marks.",
      groups: [
        {
          heading: "Principle 1: No False Commitment",
          questions: [
            written(26, "SUNROOOF's Code of Conduct states: 'Trust once broken cannot be sold back.' In your own words, explain what false-committing means in a sales context and why it is dangerous — not just for one deal, but for the brand as a whole. Give at least one realistic scenario where a team member might be tempted to false-commit and explain the correct approach.", 5, "Aim for 150–250 words."),
          ],
        },
        {
          heading: "Principle 2 & 4: Value vs. Desperation",
          questions: [
            written(27, "Explain the difference between 'selling value' and 'selling with desperation.' Why does SUNROOOF say it is perfectly okay if a customer does not buy? How does this mindset actually lead to better long-term outcomes for both the customer and the brand? Include Principle 4's idea of saying NO when SUNROOOF cannot add value.", 5, "Aim for 150–250 words."),
          ],
        },
        {
          heading: "Principle 3: Wellness First",
          questions: [
            written(28, "A potential client visits SUNROOOF's experience centre and says, 'I just want a nice-looking ceiling light for my living room.' How would you respond, according to Principle 3? Write out how you would reframe the conversation to communicate SUNROOOF as a wellness product first. What specific human benefits would you highlight and why?", 5, "Aim for 150–250 words."),
          ],
        },
        {
          heading: "Principles 5 & 6: Listen and Solve",
          questions: [
            written(29, "Principles 5 and 6 say that we are problem solvers, not salespeople, and that we must listen more than we speak. Describe what this looks like in a real client interaction. What kinds of questions should a Wellness Consultant ask? How does listening first lead to better, more honest solutions? Give a specific example of a problem a customer might have and how you would uncover and address it.", 5, "Aim for 150–250 words."),
          ],
        },
        {
          heading: "Principle 7: Communication",
          questions: [
            written(30, "Principle 7 says 'Good communication means removing words, not adding.' Do you agree? Write a detailed response explaining why brevity and clarity matter in sales, and how over-communication can actually damage trust and the client's experience. Provide an example of a long, unclear message and then rewrite it in the SUNROOOF style.", 5, "Aim for 150–250 words."),
          ],
        },
        {
          heading: "Principle 8 & 9: Post-Sale and Ownership",
          questions: [
            written(31, "A client calls you three weeks after installation to say they are unhappy with how the product looks in their space and feel it was not what they expected. You know the installation team followed the brief correctly. According to Principles 8 and 9, how would you handle this situation? What does owning the customer's experience mean even when the mistake was not yours?", 5, "Aim for 150–250 words."),
          ],
        },
        {
          heading: "Principles 10, 11 & 12: Purpose, Targets and Values",
          questions: [
            written(32, "Principles 10, 11, and 12 create a triangle: purpose, targets, and values. Explain in your own words how all three must work together. Can you give an example of a situation where a team member might be tempted to use 'values' as an excuse for poor performance? And an example of someone using targets as an excuse to compromise values? What does the ideal balance look like?", 5, "Aim for 150–250 words."),
          ],
        },
        {
          heading: "Role Identity: Wellness Consultant / Specialist",
          questions: [
            written(33, "SUNROOOF has renamed the sales roles to Wellness Consultant and Wellness Specialist. Why do you think this change was made? How does a title influence the way a person thinks, behaves, and communicates with clients? Write about what this new identity means to you personally and how it changes the way you would approach a client conversation going forward.", 5, "Aim for 150–250 words."),
          ],
        },
      ],
    },
  ],
};

/* ---- Vision alignment assessment (Vision Document Assignment - SUNROOOF.docx) ---- */
export const VISION_ASSESSMENT: Assessment = {
  id: "vision-assessment",
  title: "Wellness Specialist — Hiring Assignment",
  subtitle: "Individual Contributor | HNI & UHNI Clientele | Estimated Time: 60 Minutes",
  totalMarks: 60,
  passMark: null,
  needsReview: true,
  instructions: [
    "This assignment has three sections. Read every question fully and carefully before writing.",
    "Be specific and honest. A short, direct, concrete answer scores higher than a long, generic one.",
    "Do not copy-paste from the documents shared with you. Use your own words.",
    "This role involves direct interaction and deal closure with HNI and UHNI customers. Your answers should reflect that context.",
    "Total: 60 marks | Section 1: 10 marks | Section 2: 25 marks | Section 3: 25 marks",
  ],
  sections: [
    {
      title: "Section 01 — Knowledge Check — Multiple Choice",
      instructions: "Choose the single best answer for each question. Write the letter clearly.",
      groups: [
        {
          questions: [
            mcq(1, "The vision document opens with 'WHY do you think we are here together?' and says the answer is in the question itself. What is the intended meaning?", [
              "The team is gathered to align on monthly targets and activity plans",
              "The WHY behind what we do is the most important thing — and it must never be lost to tasks, pressure, or targets",
              "The company wants everyone to introduce themselves and build team rapport",
              "The session is about learning SUNROOOF's product features and pitch structure",
            ]),
            mcq(2, "According to the vision document, what happens to the WHY when a company grows rapidly?", [
              "The WHY becomes stronger as the company scales",
              "The WHY gets communicated to more people through better systems",
              "Tasks, activities, targets, and pressure take over — and the WHY disappears",
              "The WHY evolves into a new mission as the business matures",
            ]),
            mcq(3, "The vision document says 'the whole world is selling a commodity.' What makes SUNROOOF different from both a commodity and an innovation?", [
              "SUNROOOF has a lower price point than comparable premium products",
              "SUNROOOF is one of the very few brands bringing a once-in-a-century revolution — not just a better version of something existing",
              "SUNROOOF has a wider distribution network than other lighting brands",
              "SUNROOOF uses patented German technology that cannot be replicated",
            ]),
            mcq(4, "The vision document traces the evolution: Sun → Candles → Incandescent Bulbs → LED Bulbs → SUNROOOF. What is the point of this progression?", [
              "To show that SUNROOOF is a more energy-efficient LED product",
              "To highlight SUNROOOF's superior technology compared to LEDs",
              "To position SUNROOOF as the next century-defining disruption in how humans access light — following in the footsteps of truly transformative shifts",
              "To demonstrate that artificial lighting has always been improving over time",
            ]),
            mcq(5, "The vision document says SUNROOOF's core mission comes from the Atharva Veda. What is that mission?", [
              "Build the most advanced wellness technology for modern homes",
              "Bring sunlight into people's lives",
              "Solve Seasonal Affective Disorder through lighting science",
              "Create a global wellness movement starting with lighting",
            ]),
            mcq(6, "SUNROOOF is compared to Harley Davidson, Apple, and Red Bull in the vision document. What single quality connects all three comparisons?", [
              "They are all aspirational brands with premium pricing",
              "They all built strong social media communities",
              "They all sell a feeling and identity — not just a product — and SUNROOOF does the same through wellness lighting",
              "They all disrupted their industries by lowering prices for mass adoption",
            ]),
            mcq(7, "The vision document specifically states what SUNROOOF sells 'through wellness lighting.' What is it?", [
              "Better health and reduced depression",
              "Happiness",
              "The feeling of natural sunlight indoors",
              "Productivity and focus enhancement",
            ]),
            mcq(8, "According to the vision document, SUNROOOF is currently in the Growth Phase. Which of the following correctly describes what this phase demands from every individual?", [
              "Careful planning, process adherence, and risk management",
              "More hard work, more ambition, more passion, and more ownership",
              "Focus on customer retention over new acquisition",
              "Prioritising documentation and system building over sales activity",
            ]),
            mcq(9, "The vision document describes SUNROOOF's 3-year global ambition. Which of the following regions is NOT mentioned as part of that expansion plan?", [
              "GCC",
              "Israel",
              "Japan",
              "Philippines",
            ]),
            mcq(10, "The vision document ends with 'This is our Day 1 — and you are the ones who will take us to 1 Day.' What does '1 Day' represent?", [
              "The first day a new team member closes their first deal",
              "The day SUNROOOF reaches profitability",
              "The future moment when SUNROOOF becomes a globally recognised brand — the way Apple, Amazon, and Google are today",
              "The one day in a week set aside for strategic planning",
            ]),
          ],
        },
      ],
    },
    {
      title: "Section 02 — Understanding & Perspective — Subjective",
      instructions:
        "Answer in your own words. Think carefully before writing. Depth and honesty matter more than length.",
      groups: [
        {
          questions: [
            written(11, "The vision document says 'WHY is WHY so important?' It argues that a shared WHY helps teams collaborate like a football team and makes even big problems look small. As a Wellness Specialist closing deals individually with HNI and UHNI customers — what is YOUR personal WHY for being in this role? Be specific. Generic answers will not score well here.", 5),
            written(12, "The vision document says we are not selling lighting — we are selling happiness. An UHNI customer already has a beautifully designed penthouse with European interiors and automated Lutron lighting. They say: 'I already have the best lighting money can buy. What could SUNROOOF possibly add?' How do you shift the conversation from lighting to something they cannot already buy?", 5),
            written(13, "The vision document describes SUNROOOF as a once-in-a-century disruption — not an improvement, not an innovation. In your own words, explain the difference between these three. Then explain how knowing this changes the way you would position SUNROOOF in a conversation with a discerning HNI client who has seen many premium products.", 5),
            written(14, "The vision document speaks of a wellness movement expanding beyond lighting into air, kitchen, and wardrobe — calling it Wellness Architecture. An HNI client asks you: 'Is SUNROOOF just a ceiling product, or is there a bigger vision here?' How do you answer — and how does this larger vision help you build a longer relationship with premium clients?", 5),
            written(15, "The vision document says 'This is our Day 1.' Working with HNI and UHNI clients means every interaction carries reputational weight — for you and for SUNROOOF. What does being at Day 1 of a potential once-in-a-century brand mean to you personally as an individual contributor? How does it change your standard of preparation and conduct before every client meeting?", 5),
          ],
        },
      ],
    },
    {
      title: "Section 03 — Scenario-Based — HNI & UHNI Real World Situations",
      instructions:
        "Read each scenario carefully. Answer all parts. Write your actual words — not what you think we want to hear. Precision and honesty score higher than polish.",
      groups: [
        {
          questions: [
            {
              kind: "scenario",
              id: "q16",
              label: "Q16",
              title: "The Penthouse Meeting",
              marks: 8,
              situation:
                "You have been given a meeting with an UHNI client — a prominent real estate developer — at his penthouse in South Mumbai. The home is stunning: floor-to-ceiling glass, custom Italian furniture, and an automated Crestron system managing everything from lighting to curtains. He greets you warmly but says within the first 60 seconds: 'Look, my interior designer asked me to meet you. I'm a busy man — I have another call in 20 minutes. I'll be honest, I don't see what you can offer me that I don't already have. Surprise me.'",
              parts: [
                {
                  id: "a",
                  prompt: "a) You have 60 seconds before his attention shifts. Write your exact opening response. Do not describe the product. Do not list features.",
                  boxLabel: "Your opening response:",
                },
                {
                  id: "b",
                  prompt: "b) He didn't initiate this meeting — his designer did. What does that tell you about where the real opportunity lies, and how do you use the next 15 minutes?",
                  boxLabel: "Your answer:",
                },
              ],
            },
            {
              kind: "scenario",
              id: "q17",
              label: "Q17",
              title: "The Honest Conversation",
              marks: 9,
              situation:
                "An HNI client — a senior partner at a top law firm — has agreed to a 20-minute discovery call. She is sharp, well-researched, and 10 minutes in she says: 'I appreciate what you are building. But let me be direct — my home office gets good afternoon sun, I work from home 3 days a week, and I genuinely don't feel like I have a problem that needs solving here. I have heard enough pitches in my career to know when something is being oversold. So tell me — is this actually for me, or not?'",
              parts: [
                {
                  id: "a",
                  prompt: "a) Write your exact response. She has asked for honesty — give it to her.",
                  boxLabel: "Your response:",
                },
                {
                  id: "b",
                  prompt: "b) If your honest assessment is that SUNROOOF may not add significant value for her current space — do you walk away or find another angle? Explain your exact thinking and what you would do.",
                  boxLabel: "Your answer:",
                },
                {
                  id: "c",
                  prompt: "c) How does handling this moment with integrity actually create a long-term opportunity with an HNI client — even if the deal doesn't close today?",
                  boxLabel: "Your answer:",
                },
              ],
            },
            {
              kind: "scenario",
              id: "q18",
              label: "Q18",
              title: "The Referral at Risk",
              marks: 8,
              situation:
                "One of your most valued HNI clients — a well-connected industrialist — purchased SUNROOOF for his bungalow four weeks ago. He now calls you, clearly upset. He says: 'I recommended you to two of my closest friends last week. Both called me saying your team quoted them prices significantly different from what I paid. One of them thinks I was either overcharged, or that I got a deal they weren't offered. Either way, I look bad in front of people whose opinion matters to me. This is not acceptable.'",
              parts: [
                {
                  id: "a",
                  prompt: "a) Write your exact response to him in this moment. He is upset and his social reputation is on the line.",
                  boxLabel: "Your response:",
                },
                {
                  id: "b",
                  prompt: "b) What concrete steps do you take immediately after this call — with him, with the two referred clients, and internally? What is the one thing you will absolutely not do, even if it feels like the easier path?",
                  boxLabel: "Your steps and what you avoid:",
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

/* ---- Dress code policy (Dress_Code_Policy_-SUNROOOF.pptx) ----
   The deck is entirely text policy (its images are decorative icons), so it is
   loaded as a readable in-app article — transcribed verbatim, slide by slide. */
export const DRESS_CODE_SECTIONS: { heading: string; body: string }[] = [
  {
    heading: "Our philosophy — why the dress code matters at SUNROOOF",
    body: `“Our workplace environment should reflect professionalism, mutual respect, and comfort for everyone.”

At SUNROOOF, every interaction is a reflection of who we are — a luxury brand built on precision, care, and comfort. Our dress code isn't about restricting who you are; it's simply an extension of the same elegance and comfort we promise every client, worn by the people who bring it to life.

Why it matters
•  Builds trust with every client interaction
•  Reflects your own professionalism and confidence
•  Protects the reputation you and SUNROOOF share

Culture isn't just what we say — it's what we choose to wear, every single day.`,
  },
  {
    heading: "General principles — for every team member",
    body: `Professional & presentable — attire should be professional and presentable at all times.
Neat & modest — dress in a manner that is neat, modest, and appropriate for a professional workplace.
Well-fitted & ironed — clean, well-fitted attire that's put together.
Respectful & comfortable — maintains a respectful, comfortable environment for all colleagues.

When in doubt: choose the more professional, understated option. It's easy to remember, and guides judgment gently.`,
  },
  {
    heading: "Guidelines for men — everyday attire & client meetings",
    body: `Everyday attire
•  Collared shirts (long or short sleeved), tucked into trousers, linen pants, or chinos
•  Smart casuals — polo T-shirts with smart jeans (for non-client-dealing members only)
•  Clean, well-fitted clothing that looks put together
•  Closed shoes or neat sneakers

Grooming tips
Neat hair and well-maintained facial hair — attention to detail makes all the difference.

Client meetings (for Sales team & client-facing roles)
•  Blazers as appropriate
•  Collared shirts in solid colours or subtle textures (avoid loud prints, big checks, prints), tucked in
•  Formal trousers, linen pants or well-fitted chinos in neutral tones like navy, charcoal, beige, black
•  Leather shoes or loafers, well-maintained, with a matching belt
•  Trimmed hair/beard, minimal accessories`,
  },
  {
    heading: "Guidelines for women — everyday attire & client meetings",
    body: `Everyday attire
•  Formal tops, shirts, tunics or formal dresses
•  Ethnic wear is warmly welcomed — saris, salwar kameez, and similar styles are a beautiful part of our workplace

Client meetings (for Sales team & client-facing roles)
•  Blazers as appropriate
•  Formal shirts, kurtas with trousers, or well-fitted formal dresses (longer than knee length), in sober colours
•  Saree or salwar-kameez as an optional traditional-wear choice, if it fits our brand culture
•  Closed-toe flats or heels — practical for walking or active sites
•  Minimal jewellery and makeup, hair neatly tied back
•  Neat and well-maintained hair, with minimal or no makeup/accessories, as per personal choice and comfortable footwear.`,
  },
  {
    heading: "Grooming standards — presenting yourself with polish",
    body: `Hair — neat, well-maintained hair, styled appropriately for a professional setting.
Nails — trimmed, clean nails. If nail polish is worn, keep it neat and chip-free.
Personal hygiene — maintain good personal hygiene, including managing body odour through daily hygiene and deodorant use.
Fragrance & breath — keep breath fresh; use mild fragrances and avoid overpowering perfumes or deodorants.

Grooming reflects professionalism: kept simple and gender-neutral, it protects the dignity of our brand and of everyone who represents it.`,
  },
  {
    heading: "Do's and don'ts",
    body: `Do's
•  Clean, well-fitted, ironed clothing
•  Collared shirts, formal tops or professional dresses
•  Ethnic wear — sarees, salwar kameez, co-ord sets
•  Business formal for client meetings
•  Solid colours or subtle patterns
•  Polished, role-appropriate footwear
•  Neat hair and well-maintained grooming

Don'ts
•  Excessively short/cropped clothing, ripped jeans
•  Garments with deep necklines, off-shoulders
•  Overly casual, unkempt or wrinkled attire
•  Polo T-shirts + jeans for client-facing roles
•  Loud prints, oversized graphics, big visible logos
•  Bulky, overly casual or distracting footwear
•  Casual/lounge attire on video calls while working remotely`,
  },
  {
    heading: "Compliance & accountability",
    body: `This dress code applies to every team member, every working day. Adherence reflects your professionalism and your respect for colleagues and clients — and it upholds the image our guests trust SUNROOOF for.

Failure to adhere to the dress code may result in corrective action — so if you're ever unsure what's appropriate, ask before you dress, not after.

In case of a grey area, discuss with your manager or HR. We'd always rather clarify upfront than correct after the fact.`,
  },
  {
    heading: "Your quick self-check — before you head out",
    body: `•  Is my outfit clean and fitted?
•  Is it appropriate for my role today?
•  Am I representing SUNROOOF confidently?`,
  },
  {
    heading: "Corrective measures",
    body: `Stage 1 — Verbal feedback: if something doesn't align with our guidelines, HR will offer a quick, private conversation to help you course-correct. It's a simple, respectful heads-up, not a formal mark against you.

Stage 2 — Written feedback: if the same concern comes up again, HR will share written feedback outlining the guideline and next steps. This may include a brief request to go home, change, and return, simply so you can meet clients at your best, never as a penalty.

This process exists to protect the trust our clients place in SUNROOOF, not to penalize anyone. Our goal is always to guide with care, so every team member feels confident representing our brand.`,
  },
];

/* ================================================================== */
/* DAYS, MODULES & ITEMS                                               */
/* Only received content is present. Missing slots are simply absent.  */
/* ================================================================== */

export const DAYS: Day[] = [
  // Days 1–3 — common induction (everyone, regardless of department).
  {
    number: 1,
    title: "Welcome and vision",
    subtitle: "The founder, the workplace and where we're headed",
    photo: "/photos/day-1.jpg",
    photoAlt:
      "The SUNROOOF Experience Centre — a long marble island beneath a glass skylight roof, hung with trailing green plants.",
    department: null,
    activities: [
      { id: "d1-act-amphitheatre", title: "Team introduction at the amphitheatre" },
      { id: "d1-act-forms", title: "Joining forms" },
    ],
  },
  {
    number: 2,
    title: "Culture and Magppie",
    subtitle: "How we work, and the Magppie story",
    photo: "/photos/day-2.jpg",
    photoAlt:
      "A bright SUNROOOF experience space lit by overhead skylight panels — a central planter, the Sun Café and the company story wall.",
    department: null,
  },
  {
    number: 3,
    title: "Wellness lighting and the customer",
    subtitle: "Why sunlight matters, and the customer journey",
    photo: "/photos/day-3.jpg",
    photoAlt:
      "A visitor gazing up in wonder at the daylight from a SUNROOOF skylight, a trailing green plant beside her.",
    department: null,
    activities: [{ id: "d3-act-buddy", title: "Team buddy up and self explore" }],
  },
  // Days 4–7 — Sales track (the only department track planned so far, §2).
  { number: 4, title: "Site and layouts", subtitle: "Understanding sites, reading layouts, applying the product", photo: null, department: "Sales" },
  { number: 5, title: "Product and funnel", subtitle: "Product training and the sales funnel", photo: null, department: "Sales" },
  { number: 6, title: "Pitch and tactics", subtitle: "The pitch, need creation and tactics", photo: null, department: "Sales" },
  { number: 7, title: "Systems and the test", subtitle: "Zoho systems and the mock call test", photo: null, department: "Sales" },
];

/* Factory helpers for empty/pending slots (§4a): a slot carries its number and
   title and NOTHING else — never an invented file, duration, thumbnail or
   question. Only videos are numbered (§3/§5.8); documents/assessments are not. */
const pendingVideo = (number: string, id: string, title: string): VideoItem => ({
  kind: "video", id, number, title, durationSeconds: 0, src: null, youtubeId: null, thumbnail: null,
});
const pendingDoc = (id: string, title: string): DocumentItem => ({
  kind: "document", id, number: "", title, file: null, sizeLabel: null, sections: null,
});
const pendingAssessment = (id: string, title: string): AssessmentItem => ({
  kind: "assessment", id, number: "", title,
  assessment: { id, title, totalMarks: 0, passMark: null, needsReview: true, sections: [] },
});

export const MODULES: Module[] = [
  /* ================= Day 1 — Welcome and vision ================= */
  {
    id: "d1m1", day: 1, order: 1, title: "The founder and the vision",
    items: [
      pendingVideo("1.1", "d1-founder-intro", "Founder introduction"),
      pendingVideo("1.2", "d1-journey", "Journey so far"),
      pendingVideo("1.3", "d1-vision-video", "Vision video"),
    ],
  },
  {
    id: "d1m2", day: 1, order: 2, title: "The workplace",
    items: [
      pendingVideo("1.4", "d1-ec-tour", "EC tour"),
      pendingVideo("1.5", "d1-keka", "Keka app walkthrough"),
    ],
  },
  {
    id: "d1m3", day: 1, order: 3, title: "Documents and assessment",
    items: [
      pendingDoc("d1-doc-welcome-kit", "Welcome kit"),
      pendingDoc("d1-doc-hr-policies", "HR policies"),
      // LOADED — dress code policy (HR deck, transcribed verbatim as an article).
      { kind: "document", id: "d1-doc-attire", number: "", title: "Attire and dress code policy", file: null, sizeLabel: null, sections: DRESS_CODE_SECTIONS },
      pendingDoc("d1-doc-vision", "Vision document"),
      // LOADED — the vision alignment assessment (HR file, transcribed verbatim).
      { kind: "assessment", id: "d1-vision-assessment", number: "", title: "Vision alignment assessment", assessment: VISION_ASSESSMENT },
    ],
  },

  /* ================= Day 2 — Culture and Magppie ================= */
  {
    id: "d2m1", day: 2, order: 1, title: "Culture and conduct",
    items: [
      pendingVideo("2.1", "d2-culture-code-video", "Culture code"),
      pendingVideo("2.2", "d2-hiring-leadership", "Hiring and leadership"),
    ],
  },
  {
    id: "d2m2", day: 2, order: 2, title: "Introduction to Magppie",
    items: [pendingVideo("2.3", "d2-magppie-intro-video", "Magppie introduction")],
  },
  {
    id: "d2m3", day: 2, order: 3, title: "Documents and assessments",
    items: [
      // LOADED — the Wellness Homes deck (compressed PDF, served from private media).
      { kind: "document", id: "d2-wellness-homes-deck", number: "", title: "Wellness Homes by Magppie", file: "/api/document/d2-wellness-homes-deck", sizeLabel: null, sections: null },
      pendingDoc("d2-doc-magppie-truth", "The Magppie Truth"),
      pendingAssessment("d2-articulation-assessment", "Articulation assessment"),
      // LOADED — the sales code of conduct assessment (HR file, transcribed verbatim).
      { kind: "assessment", id: "d2-coc-assessment", number: "", title: "Sales code of conduct assessment", assessment: CODE_OF_CONDUCT_ASSESSMENT },
    ],
  },

  /* ============ Day 3 — Wellness lighting and the customer ============ */
  {
    id: "d3m1", day: 3, order: 1, title: "SUNROOOF as wellness lighting",
    items: [
      pendingVideo("3.1", "d3-sunlight", "The importance of sunlight"),
      pendingVideo("3.2", "d3-circadian", "What circadian lighting is"),
      pendingVideo("3.3", "d3-artificial-light", "The problems with modern artificial lighting"),
      pendingVideo("3.4", "d3-wellness-benefits", "Wellness and its benefits"),
    ],
  },
  {
    id: "d3m2", day: 3, order: 2, title: "Customer and language",
    items: [
      pendingVideo("3.5", "d3-customer-journey", "The customer journey"),
      pendingVideo("3.6", "d3-jargons", "Industry jargons"),
    ],
  },
  {
    id: "d3m3", day: 3, order: 3, title: "Assessment",
    items: [pendingAssessment("d3-customer-journey-assessment", "Customer journey assessment")],
  },

  /* ================= Day 4 — Sales track. Site and layouts ================= */
  {
    id: "d4m1", day: 4, order: 1, title: "Understanding the site",
    items: [
      // LOADED — construction site video (YouTube, from Shivang) → Day 4 Module 1 (§4.3).
      { kind: "video", id: "d4-construction-site", number: "4.1", title: "Understanding a Construction Site", durationSeconds: 0, src: null, youtubeId: "vkew-1KK3Sc", thumbnail: null },
    ],
  },
  {
    id: "d4m2", day: 4, order: 2, title: "Reading architectural layouts",
    items: [
      // LOADED — layout video (YouTube, from Shivang) → Day 4 Module 2 (§4.3).
      { kind: "video", id: "d4-architectural-layout", number: "4.2", title: "Reading an Architectural Layout", durationSeconds: 0, src: null, youtubeId: "czrhWbjkjvM", thumbnail: null },
      pendingAssessment("d4-layout-assignment", "Layout reading assignment"),
    ],
  },
  {
    id: "d4m3", day: 4, order: 3, title: "Applying the product",
    items: [
      pendingVideo("4.3", "d4-applications", "Applications of SUNROOOF"),
      pendingVideo("4.4", "d4-use-cases", "Sector-wise use cases"),
      pendingVideo("4.5", "d4-benefits", "Sector-wise benefits"),
      pendingVideo("4.6", "d4-pitch-space", "How to pitch according to the space"),
      pendingVideo("4.7", "d4-case-studies", "Layout case studies"),
      pendingAssessment("d4-layout-based-assignment", "Layout-based assignment"),
    ],
  },
  {
    id: "d4m4", day: 4, order: 4, title: "Call training",
    items: [pendingVideo("4.8", "d4-call-training", "Call pitch and call quality")],
  },

  /* ================= Day 5 — Sales track. Product and funnel ================= */
  {
    id: "d5m1", day: 5, order: 1, title: "Product training",
    items: [
      pendingVideo("5.1", "d5-product-training", "Product training"),
      pendingVideo("5.2", "d5-installation-video", "Installation video"),
    ],
  },
  {
    id: "d5m2", day: 5, order: 2, title: "Sales funnel training",
    items: [pendingVideo("5.3", "d5-funnel", "Sales funnel training")],
  },
  {
    id: "d5m3", day: 5, order: 3, title: "Calling qualified leads",
    items: [pendingVideo("5.4", "d5-qualified-leads", "Calling qualified leads")],
  },

  /* ================= Day 6 — Sales track. Pitch and tactics ================= */
  {
    id: "d6m1", day: 6, order: 1, title: "The EC tour pitch",
    items: [pendingVideo("6.1", "d6-ec-pitch", "The EC tour pitch")],
  },
  {
    id: "d6m2", day: 6, order: 2, title: "Need creation",
    items: [pendingVideo("6.2", "d6-need-creation", "Need creation")],
  },
  {
    id: "d6m3", day: 6, order: 3, title: "Sales tactics",
    items: [
      pendingVideo("6.3", "d6-negotiation", "Negotiation and FOMO creation"),
      pendingVideo("6.4", "d6-objection-handling", "FAQs and objection handling"),
    ],
  },

  /* ================= Day 7 — Sales track. Systems and the test ================= */
  {
    id: "d7m1", day: 7, order: 1, title: "Complete Zoho training",
    items: [pendingVideo("7.1", "d7-zoho", "Complete Zoho training")],
  },
  {
    id: "d7m2", day: 7, order: 2, title: "Final assessment",
    items: [pendingAssessment("d7-mock-call-test", "Mock call test")],
  },
];

/* ------------------------------------------------------------------ */
/* Lookups                                                             */
/* ------------------------------------------------------------------ */

export function getDay(dayNumber: number): Day | undefined {
  return DAYS.find((d) => d.number === dayNumber);
}

export function modulesForDay(dayNumber: number): Module[] {
  return MODULES.filter((m) => m.day === dayNumber).sort((a, b) => a.order - b.order);
}

export function getModule(moduleId: string): Module | undefined {
  return MODULES.find((m) => m.id === moduleId);
}

/** Every item of a day, in running order (module order, then item order). */
export function itemsForDay(dayNumber: number): ModuleItem[] {
  return modulesForDay(dayNumber).flatMap((m) => m.items);
}

export function getItem(itemId: string): ModuleItem | undefined {
  for (const m of MODULES) {
    const it = m.items.find((i) => i.id === itemId);
    if (it) return it;
  }
  return undefined;
}

export function moduleForItem(itemId: string): Module | undefined {
  return MODULES.find((m) => m.items.some((i) => i.id === itemId));
}

/** Items that GATE progression: videos and assessments. Documents never gate (§5.7). */
export function isGatingItem(item: ModuleItem): boolean {
  return item.kind === "video" || item.kind === "assessment";
}

/** A YouTube video's still, used when no local thumbnail is supplied. */
export const youtubeThumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

/** The best thumbnail for a video item — local file, else the YouTube still. */
export function videoThumbnail(v: VideoItem): string | null {
  return v.thumbnail ?? (v.youtubeId ? youtubeThumb(v.youtubeId) : null);
}

/** The day's cover image — ONLY the day's own photo (data-driven, swaps in
 *  without code changes). Track days keep a plain card with no image (§6.10). */
export function dayImage(dayNumber: number): string | null {
  return getDay(dayNumber)?.photo ?? null;
}

/** In-person activities for a day (§5). */
export function activitiesForDay(dayNumber: number): Activity[] {
  return getDay(dayNumber)?.activities ?? [];
}

export const DAY_NUMBERS = DAYS.map((d) => d.number).sort((a, b) => a - b);
