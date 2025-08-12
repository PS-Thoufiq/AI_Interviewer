
const AZURE_API_KEY = "27bf9a2345b0467cb0017d028c687ff0";
const AZURE_API_URL = "https://zeero.openai.azure.com/openai/deployments/zeero-prod/chat/completions?api-version=2025-01-01-preview";

export async function getNextQuestion({ prompt, experienceRange, conversationHistory, topic, stage, resumeSkills = [] }) {
  const EXPERIENCE_LEVELS = {
    "0-2": "Beginner",
    "2-4": "Intermediate",
    "4-6": "Advanced"
  };
  const level = EXPERIENCE_LEVELS[experienceRange] || "Beginner";
  const currentSkill = resumeSkills.length > 0
    ? resumeSkills[conversationHistory.filter(msg => msg.stage === "mcq" || msg.stage === "coding").length % resumeSkills.length]
    : topic;

  const systemPromptBase = `
    You are a professional technical interviewer with a friendly, conversational tone, mimicking a human interviewer. Focus on ${currentSkill || topic}. The candidate's experience level is ${level}. Their last input: '${prompt}'. Conversation history: '${JSON.stringify(conversationHistory)}'. Current stage: ${stage}.

    Ensure questions are concise (max 50 words), clear, and relevant.
  `;

  let systemPrompt = "";

  if (stage === "background") {
    systemPrompt = systemPromptBase + `
      For the background stage, ask ONLY questions about candidate's projects, skills, and experience related to their background. Do NOT ask multiple choice or coding questions.
    `;
  } else if (stage === "mcq") {
    systemPrompt = systemPromptBase + `
      For the MCQ stage, provide exactly four plausible multiple choice options for technical questions related to ${currentSkill || topic}.
      Format as:
      Question: [text]
      Options:
      A) [Option1]
      B) [Option2]
      C) [Option3]
      D) [Option4]
    `;
  } else if (stage === "coding") {
    systemPrompt = systemPromptBase + `
      For the coding stage, provide a coding problem for ${currentSkill || topic} with a clear problem description and boilerplate code.
      Format strictly as:
      Solve this problem: [Problem description]
      Boilerplate Code:
      \`\`\`[language]
      [Boilerplate code]
      \`\`\`
      Example:
      Solve this problem: Write a function to reverse a string in ${currentSkill || topic}.
      Boilerplate Code:
      \`\`\`python
      def reverse_string(s):
          # Your code here
          pass
      \`\`\`
    `;
  } else if (stage === "wrapup") {
    systemPrompt = systemPromptBase + `
      For the wrapup stage, ask any final summary or feedback questions.
    `;
  } else {
    systemPrompt = systemPromptBase;
  }

  const body = {
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt }
    ],
    max_tokens: 200,
    temperature: 0.7
  };

  const response = await fetch(AZURE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": AZURE_API_KEY
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch from Azure GPT-4o API: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content || "";
  console.log("API response for next question:", content); // Debug
  return content;
}

export async function generateUserReport({ experienceRange, conversationHistory, topic, resumeSkills = [] }) {
  const EXPERIENCE_LEVELS = {
    "0-2": "Beginner",
    "2-4": "Intermediate",
    "4-6": "Advanced"
  };
  const level = EXPERIENCE_LEVELS[experienceRange] || "Beginner";

  const reportPrompt = `
    You are an expert technical interviewer for ${topic}. Based on the interview conversation (stages: greeting, background, mcq, coding, wrapup), provide a candidate-focused report. Analyze responses for depth, clarity, and engagement, noting skipped questions.

    Candidate's level: ${level}.
    Conversation: ${JSON.stringify(conversationHistory)}.
    Resume skills: ${resumeSkills.join(", ") || "None"}.

    Format in markdown:
    # Candidate Feedback Report for ${topic}
    ## Strengths
    - [Specific strength, e.g., "Clear explanation of concepts"]
    - ...

    ## Areas to Improve
    - [Specific area, e.g., "Need more depth in advanced topics"]
    - ...

    ## Feedback
    - [Constructive feedback, e.g., "Your project descriptions were detailed, but try to elaborate on technical challenges faced."]
    - ...

    Ensure the report is encouraging, actionable, and formatted for clarity.
  `;

  const body = {
    messages: [
      { role: "system", content: reportPrompt },
      { role: "user", content: "Generate a candidate-focused report." }
    ],
    max_tokens: 400,
    temperature: 0.7
  };

  const response = await fetch(AZURE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": AZURE_API_KEY
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error("Failed to fetch user report from Azure GPT-4o API");
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || "";
}

export async function generateClientReport({ experienceRange, conversationHistory, topic, resumeSkills = [] }) {
  const EXPERIENCE_LEVELS = {
    "0-2": "Beginner",
    "2-4": "Intermediate",
    "4-6": "Advanced"
  };
  const level = EXPERIENCE_LEVELS[experienceRange] || "Beginner";

  const reportPrompt = `
    You are an expert technical interviewer for ${topic}. Based on the interview conversation (stages: greeting, background, mcq, coding, wrapup), provide a recruiter-focused report. Analyze responses for depth, accuracy, and clarity, noting skipped questions and resume skill coverage.

    Candidate's level: ${level}.
    Conversation: ${JSON.stringify(conversationHistory)}.
    Resume skills: ${resumeSkills.join(", ") || "None"}.

    Format in markdown:
    # Recruiter Report for ${topic}
    ## Candidate Overview
    - Summarize communication style, confidence, and engagement.
    - Mention resume skills covered.

    ## Pros
    - [Specific strength]
    - ...

    ## Cons
    - [Specific area for improvement]
    - ...

    ## Highlight Reel
    - [Best answer or moment]
    - ...

    ## Alternative Answer Suggestions
    - [Question: "Original question"] [Candidate Answer: "Response"] [Ideal Answer: "Top response"]
    - ...

    ## Company Fit Prediction
    - Predict company type (e.g., startups, corporates) with percentages (e.g., "82% startups").

    ## Scoring
    - Clarity: N/5
    - Accuracy: N/5
    - Depth: N/5

    ## Stage Analysis
    - Background: [Analysis]
    - MCQ: [Analysis]
    - Coding: [Analysis]

    ## Overall Score
    - NN/100
    - Justification: [Explanation, max 150 words]

    Ensure the report is professional, detailed, and formatted for clarity.
  `;

  const body = {
    messages: [
      { role: "system", content: reportPrompt },
      { role: "user", content: "Generate a recruiter-focused report." }
    ],
    max_tokens: 800,
    temperature: 0.7
  };

  const response = await fetch(AZURE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": AZURE_API_KEY
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error("Failed to fetch client report from Azure GPT-4o API");
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || "";
}