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

export type Day = {
  number: number;
  title: string;
  subtitle: string;
  /** /photos/*.jpg — null means real photograph pending. */
  photo: string | null;
};

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

/* ================================================================== */
/* DAYS, MODULES & ITEMS                                               */
/* Only received content is present. Missing slots are simply absent.  */
/* ================================================================== */

export const DAYS: Day[] = [
  { number: 1, title: "Welcome and vision", subtitle: "Meet SUNROOOF and where we're headed", photo: null },
  { number: 2, title: "Culture and policy", subtitle: "How we work and what we stand for", photo: null },
  { number: 3, title: "Product and light", subtitle: "The technology that brings the sky indoors", photo: null },
  // Day 4 per the onboarding plan (Day 4 — Sales): so far only the two on-site
  // foundation videos have been received; the rest of the day is not loaded yet.
  { number: 4, title: "Sales", subtitle: "Applications, site stages and reading layouts", photo: null },
];

export const MODULES: Module[] = [
  // ---- Day 1 ----
  {
    id: "d1-vision",
    day: 1,
    order: 1,
    title: "Vision",
    items: [
      // Vision video: NOT added — no confirmed YouTube link yet.
      // Vision document: NOT added — Google Doc PDF not received yet.
      {
        kind: "assessment",
        id: "d1-vision-assessment",
        number: "1.1",
        title: "Vision alignment assessment",
        assessment: VISION_ASSESSMENT,
      },
    ],
  },

  // ---- Day 2 ----
  {
    id: "d2-magppie",
    day: 2,
    order: 1,
    title: "Magppie introduction",
    items: [
      {
        kind: "document",
        id: "d2-wellness-homes-deck",
        number: "2.1",
        title: "Wellness Homes by Magppie",
        file: "/api/document/d2-wellness-homes-deck",
        sizeLabel: null,
        sections: null,
      },
      // "The Magppie Truth" (9-part article): NOT added — text not received yet.
    ],
  },
  {
    id: "d2-culture-code",
    day: 2,
    order: 2,
    title: "Culture code",
    items: [
      // Culture code session video: NOT received.
      {
        kind: "assessment",
        id: "d2-coc-assessment",
        number: "2.2",
        title: "Code of conduct assessment",
        assessment: CODE_OF_CONDUCT_ASSESSMENT,
      },
    ],
  },

  // ---- Day 3 ----
  // No content received. Day 3 has no modules (empty).

  // ---- Day 4 (Sales) ----
  // Placed per the onboarding plan: Day 4 items 4.2 "Site stages" and 4.3
  // "Reading architectural layout". Both are practical job-foundation videos,
  // embedded from YouTube (privacy-friendly nocookie host) — no upload needed.
  {
    id: "d4-onsite",
    day: 4,
    order: 1,
    title: "On-site foundations",
    items: [
      {
        kind: "video",
        id: "d4-construction-site",
        number: "4.1",
        title: "Understanding a Construction Site",
        durationSeconds: 0, // YouTube — real duration read at play time
        src: null,
        youtubeId: "vkew-1KK3Sc",
        thumbnail: null,
      },
      {
        kind: "video",
        id: "d4-architectural-layout",
        number: "4.2",
        title: "Reading an Architectural Layout",
        durationSeconds: 0,
        src: null,
        youtubeId: "czrhWbjkjvM",
        thumbnail: null,
      },
    ],
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

/** The day's first available image — first video thumbnail, else none (photos pending). */
export function dayImage(dayNumber: number): string | null {
  const day = getDay(dayNumber);
  if (day?.photo) return day.photo;
  const firstVideo = itemsForDay(dayNumber).find((i) => i.kind === "video") as VideoItem | undefined;
  return firstVideo ? videoThumbnail(firstVideo) : null;
}

export const DAY_NUMBERS = DAYS.map((d) => d.number).sort((a, b) => a - b);
