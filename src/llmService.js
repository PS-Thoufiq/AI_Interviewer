const AZURE_API_KEY = "27bf9a2345b0467cb0017d028c687ff0"; // Replace with your Azure API key
const AZURE_API_URL = "https://zeero.openai.azure.com/openai/deployments/zeero-prod/chat/completions?api-version=2025-01-01-preview";

export async function getNextQuestion({ prompt, experienceRange, conversationHistory, topic }) {
  const EXPERIENCE_LEVELS = {
    "0-2": "Beginner",
    "2-4": "Intermediate",
    "4-6": "Advanced"
  };
  const level = EXPERIENCE_LEVELS[experienceRange] || "Beginner";

  const isCodingTopic = ["Java Spring Boot", "Python", "JavaScript", "Java", "C++", "React"].includes(topic);

  // Analyze conversation history to balance question types
  const questionTypes = conversationHistory
    .filter(msg => msg.role === "ai")
    .map(msg => msg.type || "regular")
    .slice(-5); // Consider last 5 questions for balance
  const typeCounts = questionTypes.reduce((acc, type) => {
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, { regular: 0, mcq: 0, coding: 0 });

  // Determine weights to avoid consecutive same-type questions
  let questionTypePrompt = "";
  if (isCodingTopic) {
    const minCount = Math.min(typeCounts.regular, typeCounts.mcq, typeCounts.coding);
    if (typeCounts.regular <= minCount) {
      questionTypePrompt = "Prefer a regular question.";
    } else if (typeCounts.mcq <= minCount) {
      questionTypePrompt = "Prefer an MCQ question.";
    } else {
      questionTypePrompt = "Prefer a coding question.";
    }
  } else {
    const minCount = Math.min(typeCounts.regular, typeCounts.mcq);
    if (typeCounts.regular <= minCount) {
      questionTypePrompt = "Prefer a regular question.";
    } else {
      questionTypePrompt = "Prefer an MCQ question.";
    }
  }

  const systemPrompt = `
    You are a professional technical interviewer with a friendly and conversational tone, mimicking a human interviewer. Focus exclusively on ${topic} and related topics. The candidate's experience level is ${level}. Their last input: '${prompt}'. Conversation history: '${JSON.stringify(conversationHistory)}'.

    If the candidate indicates unfamiliarity with a topic, avoid revisiting it. Instead, pivot intelligently to explore their strengths, such as project experience, use cases, or decision-making in familiar areas. Ensure questions feel natural, engaging, and contextually relevant to their responses.

    Generate one concise, clear, and specific interview question (max 50 words) related to '${topic}'. Tailor the question to their experience level and conversation history for a dynamic, human-like flow. ${questionTypePrompt} Choose between:
    1. Regular question (open-ended, conversational).
    2. MCQ with exactly 4 options (format: "Question: [Question text]\nOptions:\nA) [Option1]\nB) [Option2]\nC) [Option3]\nD) [Option4]"). If the question involves code, include it before the options in a code block: \`\`\`[language]\n[code]\n\`\`\`.
    ${isCodingTopic ? `3. Coding question (format: "Solve this problem: [Brief problem description]. Provide a solution in ${topic}.")` : ""}
    For MCQ, ensure options are clear, plausible, and exactly four. For coding questions, ensure the problem is solvable in a short code snippet appropriate for the experience level.
  `;

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
    throw new Error("Failed to fetch from Azure GPT-4o API");
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || "";
}

export async function generateReport({ experienceRange, conversationHistory, topic }) {
  const EXPERIENCE_LEVELS = {
    "0-2": "Beginner",
    "2-4": "Intermediate",
    "4-6": "Advanced"
  };
  const level = EXPERIENCE_LEVELS[experienceRange] || "Beginner";

  const reportPrompt = `
    You are an expert technical interviewer for ${topic}. Based on the interview conversation (questions and answers), provide a detailed, professional, and constructive report. Analyze the candidate's responses for depth, accuracy, and relevance to ${topic}, including their performance on regular, MCQ, and coding questions (if applicable). Note if the candidate skipped any MCQ questions.

    Candidate's level: ${level}.
    Conversation: ${JSON.stringify(conversationHistory)}.

    Format your response as:
    Pros:
    - [Specific strength, e.g., "Demonstrated strong understanding of core concepts"]
    - ...
    Cons:
    - [Specific area for improvement, e.g., "Limited knowledge of advanced topics"]
    - ...
    Score: NN/100
    Justification: [Detailed explanation of the score, referencing specific responses and their quality, max 150 words]

    Ensure the report is accurate, constructive, and feels like feedback from a human interviewer.
  `;

  const body = {
    messages: [
      { role: "system", content: reportPrompt },
      { role: "user", content: "Generate a candidate report based on the conversation." }
    ],
    max_tokens: 500,
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
    throw new Error("Failed to fetch report from Azure GPT-4o API");
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || "";
}