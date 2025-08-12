const AZURE_API_KEY = "27bf9a2345b0467cb0017d028c687ff0";
const AZURE_API_URL = "https://zeero.openai.azure.com/openai/deployments/zeero-prod/chat/completions?api-version=2025-01-01-preview";

export async function getNextQuestion({ prompt, experienceRange, conversationHistory, topic, stage, resumeSkills = [], followUpType = null }) {
  const EXPERIENCE_LEVELS = {
    "0- prolong": "Beginner",
    "2-4": "Intermediate",
    "4-6": "Advanced"
  };
  const level = EXPERIENCE_LEVELS[experienceRange] || "Beginner";
  const currentSkill = resumeSkills.length > 0
    ? resumeSkills[conversationHistory.filter(msg => msg.stage === "knowledge" || msg.stage === "scenario").length % resumeSkills.length]
    : topic;

  const systemPromptBase = `
You are a professional technical interviewer with a friendly, conversational tone, mimicking a human interviewer.  
Focus strictly on ${currentSkill || topic}.  
The candidate's experience level is ${level}.  
Conversation history: '${JSON.stringify(conversationHistory)}'.  
Current stage: ${stage}.  

Guidelines:
1. Only ASK questions, do NOT give answers under any circumstance.  
   - If the user requests an answer, politely refuse and encourage them to attempt.  
   - If the user asks for Q&A, politely clarify that your role is only to ask questions.  

2. Keep questions concise (max 50 words), clear, and relevant to the current topic.  

3. Use conversational markers like:  
   - "That's interesting, could you elaborate on..."  
   - "Good point, now let's move to..."  

4. Do NOT repeat the same question, even if the user answers incorrectly.  
   - Instead, move forward naturally to the next question.  

5. If the user asks something unrelated to the current topic, politely redirect them back.  
   - Example: "I understand your curiosity, but let’s concentrate on our interview topic."  

6. If the user tries to get answers (like 'what is class', 'explain Spring Boot', 'give me Q&A'), politely decline and redirect:  
   - Example: "That’s a good question, but my role here is only to ask you questions. Let’s get back to the interview."  

7. Provide hints ONLY if absolutely necessary, but never the full answer.  

Your role is strictly: ask questions → listen → encourage → guide.  
Never provide answers.  

`;

  let followUpInstruction = "";
  if (followUpType) {
    if (followUpType === "probe") {
      followUpInstruction = "The previous answer was weak. Ask a follow-up question to probe for more details, like 'That's a good start, but could you explain more about...'.";
    } else if (followUpType === "deepen") {
      followUpInstruction = "The previous answer was strong. Ask a follow-up question to deepen the topic, like 'That's correct, what would happen if...'.";
    } else if (followUpType === "clarify") {
      followUpInstruction = "The previous answer was ambiguous. Ask a follow-up question to clarify, like 'When you say X, do you mean...'.";
    }
  } else {
    followUpInstruction = "Ask a new question.";
  }

  let systemPrompt = systemPromptBase + followUpInstruction + "\n";

  if (stage === "greeting") {
    systemPrompt += `

      For the greeting stage, ask a friendly introductory question to set a positive tone, like "Tell me a bit about yourself and your background."
    `;
  } else if (stage === "background") {
    systemPrompt += `
      For thesuch as background stage, ask ONLY behavioral/soft skills questions about candidate's projects, skills, experience, and conflicts resolved. E.g., "Tell me about a time you resolved a conflict in a team." Do NOT ask technical questions.
    `;
  } else if (stage === "knowledge") {
    systemPrompt += `
      For the knowledge stage, ask open-ended knowledge check questions related to ${currentSkill || topic}. E.g., "Explain how garbage collection works in Java."
    `;
  } else if (stage === "scenario") {
    systemPrompt += `
      For the scenario stage, ask scenario-based questions related to ${currentSkill || topic}. E.g., "Your API response times are slow in production. How do you debug this?"
    `;
  } else if (stage === "wrapup") {
    systemPrompt += `
      For the wrapup stage, ask final summary or feedback questions, like "What did you learn from this interview process?"
    `;
  } else {
    systemPrompt += systemPromptBase;
  }

  const body = {
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt }
    ],
    max_tokens: 1800,
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
  console.log("Raw API response for next question:", JSON.stringify(data, null, 2));
  console.log("Parsed content for next question:", content);
  return content;
}

export async function evaluateAnswer({ question, answer, topic, stage }) {
  let systemPrompt = `
You are an expert evaluator for technical interviews on ${topic}.
Evaluate the candidate's answer to the question.
Question: ${question}
Answer: ${answer}
Score on 0-3 scale:
technical_correctness: 0=incorrect, 1=partial, 2=mostly correct, 3=fully correct and precise
problem_solving_depth: 0=no reasoning, 1=basic, 2=good with trade-offs, 3=strong structured, edge cases
communication_clarity: 0=unclear incoherent, 1=understandable fragmented, 2=clear, 3=structured concise
Provide a short evaluation text (1-2 sentences).
`;

  if (stage === "greeting" || stage === "background") {
    systemPrompt += `
Since this is a greeting or behavioral question, set technical_correctness and problem_solving_depth to 0, only score communication_clarity.
`;
  } else if (stage === "knowledge") {
    systemPrompt += `
Focus more on technical_correctness and communication_clarity.
`;
  } else if (stage === "scenario") {
    systemPrompt += `
Focus on problem_solving_depth and communication_clarity.
`;
  } else if (stage === "wrapup") {
    systemPrompt += `
Focus on communication_clarity and overall engagement.
`;
  }

  systemPrompt += `
Output ONLY JSON: {"technical": number, "problem": number, "comm": number, "evaluation": "text"}
`;

  const body = {
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: "Evaluate this answer." }
    ],
    max_tokens: 1800,
    temperature: 0.2,
    response_format: { type: "json_object" }
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
    throw new Error(`Failed to evaluate answer: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content || "{}";
  try {
    return JSON.parse(content);
  } catch (err) {
    console.error("Failed to parse evaluation JSON:", content);
    throw err;
  }
}

export async function generateUserReport({ experienceRange, conversationHistory, topic, resumeSkills = [], averages }) {
  const EXPERIENCE_LEVELS = {
    "0-2": "Beginner",
    "2-4": "Intermediate",
    "4-6": "Advanced"
  };
  const level = EXPERIENCE_LEVELS[experienceRange] || "Beginner";
  const { avgTech, avgProblem, avgComm, finalScore } = averages || {};

  const reportPrompt = `
    You are an expert technical interviewer for ${topic}. Based on the interview conversation (stages: greeting, background, knowledge, scenario, wrapup), provide a candidate-focused report. Analyze responses for depth, clarity, and engagement, noting skipped questions.

    Candidate's level: ${level}.
    Conversation: ${JSON.stringify(conversationHistory)}.
    Resume skills: ${resumeSkills.join(", ") || "None"}.
    Average scores (0-3): technical ${avgTech?.toFixed(2) || 'N/A'}, problem-solving ${avgProblem?.toFixed(2) || 'N/A'}, communication ${avgComm?.toFixed(2) || 'N/A'}, overall weighted (50% tech, 30% problem, 20% comm): ${finalScore?.toFixed(2) || 'N/A'}.

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
    max_tokens: 1800,
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

export async function generateClientReport({ experienceRange, conversationHistory, topic, resumeSkills = [], averages }) {
  const EXPERIENCE_LEVELS = {
    "0-2": "Beginner",
    "2-4": "Intermediate",
    "4-6": "Advanced"
  };
  const level = EXPERIENCE_LEVELS[experienceRange] || "Beginner";
  const { avgTech, avgProblem, avgComm, finalScore } = averages || {};

  const reportPrompt = `
    You are an expert technical interviewer for ${topic}. Based on the interview conversation (stages: greeting, background, knowledge, scenario, wrapup), provide a recruiter-focused report. Analyze responses for depth, accuracy, and clarity, noting skipped questions and resume skill coverage.

    Candidate's level: ${level}.
    Conversation: ${JSON.stringify(conversationHistory)}.
    Resume skills: ${resumeSkills.join(", ") || "None"}.
    Average scores (0-3): technical ${avgTech?.toFixed(2) || 'N/A'}, problem-solving ${avgProblem?.toFixed(2) || 'N/A'}, communication ${avgComm?.toFixed(2) || 'N/A'}, overall weighted (50% tech, 30% problem, 20% comm): ${finalScore?.toFixed(2) || 'N/A'}.
    if user asks ai to answer which is mostly out of context of ai asked question then for the question dont consider it as a valid answer and skip it.
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
    - Greeting: [Analysis]
    - Background: [Analysis]
    - Knowledge: [Analysis]
    - Scenario: [Analysis]
    - Wrapup: [Analysis]

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
    max_tokens: 1800,
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