import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { getNextQuestion, generateReport } from "./llmService";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import { jsPDF } from "jspdf";

export default function Interview() {
  const location = useLocation();
  const topic = location.state?.topic || "Java Spring Boot";
  const INITIAL_AI_QUESTION = `Hello! I'm your AI interviewer specialized in ${topic}. I'll be asking you questions based on your experience level. Let's start with your introduction — please tell me about your background and work with ${topic}.`;

  const [experience, setExperience] = useState("");
  const [conversation, setConversation] = useState([]);
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState("");
  const [report, setReport] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [experienceError, setExperienceError] = useState("");
  const [mcqSelection, setMcqSelection] = useState(null);

  // Speech-to-text hooks
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  const lastAIIndex = useRef(0);

  // Initialize interview with first question
  useEffect(() => {
    if (interviewStarted && conversation.length === 0) {
      setConversation([{ role: "ai", text: INITIAL_AI_QUESTION, type: "regular" }]);
    }
  }, [interviewStarted, conversation.length, INITIAL_AI_QUESTION]);

  // Text-to-speech
  const speak = (text, questionType) => {
    if (!window.speechSynthesis) {
      console.warn("Text-to-speech not supported in this browser.");
      return;
    }
    // Speak only for regular questions
    if (questionType === "regular") {
      const utter = new window.SpeechSynthesisUtterance(text);
      utter.lang = "en-US";
      window.speechSynthesis.speak(utter);
    }
  };

  // Read new AI question
  useEffect(() => {
    const aiMessages = conversation.filter((msg) => msg.role === "ai");
    if (aiMessages.length > lastAIIndex.current) {
      const newAI = aiMessages[aiMessages.length - 1];
      speak(newAI.text, newAI.type);
      lastAIIndex.current = aiMessages.length;
    }
  }, [conversation]);

  // Sync transcript to answer
  useEffect(() => {
    setAnswer(transcript);
  }, [transcript]);

  // Parse AI question to determine type
  const parseQuestionType = (text) => {
    if (text.includes("Options:\nA)")) {
      return "mcq";
    } else if (text.startsWith("Solve this problem:")) {
      return "coding";
    }
    return "regular";
  };

  // Parse MCQ question, code, and options
  const parseMcqOptions = (text) => {
    const parts = text.split("\nOptions:\n");
    const questionPart = parts[0].split("```");
    const question = questionPart[0].replace("Question: ", "").trim();
    const code = questionPart.length > 1 ? questionPart[1].split("\n").slice(1, -1).join("\n") : "";
    const options = parts[1]
      ? parts[1]
          .split("\n")
          .filter(line => line.match(/^[A-D]\)/))
          .map(line => line.replace(/^[A-D]\)\s*/, ""))
      : [];
    return { question, code, options };
  };

  // Handle sending the answer
  const handleSend = async () => {
    if (!answer.trim() && !mcqSelection) return;

    const lastQuestion = conversation[conversation.length - 1];
    const isMcq = lastQuestion.type === "mcq";
    const userAnswer = isMcq ? (mcqSelection || "Skipped") : answer;

    const updatedConversation = [...conversation, { role: "user", text: userAnswer, type: isMcq ? "mcq" : lastQuestion.type }];
    setConversation(updatedConversation);
    setLoading(true);

    try {
      const aiResponse = await getNextQuestion({
        prompt: userAnswer,
        experienceRange: experience,
        conversationHistory: updatedConversation,
        topic,
      });
      const questionType = parseQuestionType(aiResponse);
      setConversation([...updatedConversation, { role: "ai", text: aiResponse, type: questionType }]);
    } catch (err) {
      console.error("Error fetching next question:", err);
      setConversation([
        ...updatedConversation,
        { role: "ai", text: "Sorry, there was an error contacting the AI.", type: "regular" },
      ]);
    }
    setAnswer("");
    setMcqSelection(null);
    resetTranscript();
    setLoading(false);
  };

  // Auto-stop listening after 10s of no speech change
  useEffect(() => {
    if (!listening) return;
    let lastTranscript = transcript;
    const interval = setInterval(() => {
      if (transcript === lastTranscript && transcript.trim() !== "") {
        SpeechRecognition.stopListening();
        clearInterval(interval);
      } else {
        lastTranscript = transcript;
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [listening, transcript]);

  // Generate report handler
  const handleGenerateReport = async () => {
    setReport("");
    setReportLoading(true);
    try {
      const reportText = await generateReport({
        experienceRange: experience,
        conversationHistory: conversation.filter((msg, idx) => idx > 0),
        topic,
      });
      setReport(reportText);
    } catch (err) {
      console.error("Error generating report:", err);
      setReport("Sorry, there was an error generating the report.");
    }
    setReportLoading(false);
  };

  // Download report as PDF
  const downloadReport = () => {
    if (!report) return;

    const doc = new jsPDF();

    // Add title
    doc.setFontSize(20);
    doc.setTextColor(44, 62, 80);
    doc.text(`Interview Report: ${topic}`, 105, 20, { align: "center" });

    // Add date
    doc.setFontSize(10);
    doc.setTextColor(149, 165, 166);
    doc.text(`Generated on ${new Date().toLocaleString()}`, 105, 28, { align: "center" });

    // Add experience level
    doc.setFontSize(12);
    doc.text(`Experience Level: ${getExperienceLabel(experience)}`, 15, 40);

    // Add content
    doc.setFontSize(12);
    doc.setTextColor(33, 37, 41);

    const splitText = doc.splitTextToSize(report, 180);
    doc.text(splitText, 15, 50);

    // Add footer
    doc.setFontSize(10);
    doc.setTextColor(149, 165, 166);
    doc.text("AI Interviewer Report", 105, 285, { align: "center" });

    doc.save(`interview-report-${topic}-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const getExperienceLabel = (value) => {
    switch (value) {
      case "0-2":
        return "0-2 years (Beginner)";
      case "2-4":
        return "2-4 years (Intermediate)";
      case "4-6":
        return "4-6 years (Advanced)";
      default:
        return "Not specified";
    }
  };

  const handleStartInterview = () => {
    if (!experience) {
      setExperienceError("Please select your experience level");
      return;
    }
    setShowInstructions(false);
    setInterviewStarted(true);
  };

  const conversationHistory = conversation.filter((msg, idx) => idx > 0);

  if (!browserSupportsSpeechRecognition) {
    return <div style={{ color: "#fff" }}>Your browser does not support speech recognition.</div>;
  }

  return (
    <div
      style={{
        maxWidth: 800,
        margin: "2rem auto",
        padding: 20,
        backgroundColor: "#1a1a1a",
        color: "#e0e0e0",
        borderRadius: 10,
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)",
      }}
    >
      {/* Instructions Modal */}
      {showInstructions && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.9)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "#2d2d2d",
              padding: "30px",
              borderRadius: "10px",
              maxWidth: "700px",
              maxHeight: "80vh",
              overflow: "auto",
              color: "#e0e0e0",
              border: "1px solid #444",
            }}
          >
            <h2 style={{ color: "#4fc3f7", textAlign: "center", marginBottom: "20px" }}>
              Interview Instructions
            </h2>
            <ol style={{ lineHeight: "1.8", textAlign: "left", paddingLeft: "20px" }}>
              <li style={{ marginBottom: "10px" }}>Read the AI's question carefully. Regular questions will be read aloud, while MCQ and coding questions will be displayed only.</li>
              <li style={{ marginBottom: "10px" }}>
                To answer through voice (for regular or coding questions):
                <ul style={{ paddingLeft: "20px", marginTop: "5px" }}>
                  <li>
                    Click <strong style={{ color: "#4fc3f7" }}>"Start Answer"</strong> to begin recording
                  </li>
                  <li>Speak clearly into your microphone</li>
                  <li>
                    Click <strong style={{ color: "#4fc3f7" }}>"Stop"</strong> when finished
                  </li>
                </ul>
              </li>
              <li style={{ marginBottom: "10px" }}>
                After stopping, your transcribed answer will appear in the text box.
              </li>
              <li style={{ marginBottom: "10px" }}>
                You can:
                <ul style={{ paddingLeft: "20px", marginTop: "5px" }}>
                  <li>
                    Send the answer as-is by clicking{" "}
                    <strong style={{ color: "#4fc3f7" }}>"Send Answer"</strong>
                  </li>
                  <li>Edit the text before sending if needed</li>
                </ul>
              </li>
              <li style={{ marginBottom: "10px" }}>
                For MCQ questions, select one option or choose "Skip" if you don't know the answer, then click{" "}
                <strong style={{ color: "#4fc3f7" }}>"Send Answer"</strong>.
              </li>
              <li style={{ marginBottom: "10px" }}>
                For coding questions, write your code in the provided text area.
              </li>
              <li style={{ marginBottom: "10px" }}>
                Click <strong style={{ color: "#4fc3f7" }}>"🔊 Read Last Question"</strong> to hear
                the last regular question again (MCQ and coding questions are not read aloud).
              </li>
              <li style={{ marginBottom: "10px" }}>
                After the interview, click{" "}
                <strong style={{ color: "#4fc3f7" }}>"Generate Report"</strong> to get your
                evaluation.
              </li>
              <li>You can download the report as a PDF file.</li>
            </ol>

            <div style={{ margin: "20px 0" }}>
              <label style={{ display: "block", marginBottom: "8px", color: "#a0a0a0" }}>
                Select your experience level:
              </label>
              <select
                value={experience}
                onChange={(e) => {
                  setExperience(e.target.value);
                  setExperienceError("");
                }}
                style={{
                  padding: "10px",
                  borderRadius: "6px",
                  backgroundColor: "#333",
                  color: "#e0e0e0",
                  border: experienceError ? "1px solid #e53935" : "1px solid #444",
                  width: "100%",
                  fontSize: "16px",
                }}
              >
                <option value="">Select experience level</option>
                <option value="0-2">0-2 years (Beginner)</option>
                <option value="2-4">2-4 years (Intermediate)</option>
                <option value="4-6">4-6 years (Advanced)</option>
              </select>
              {experienceError && (
                <div style={{ color: "#e53935", marginTop: "5px", fontSize: "14px" }}>
                  {experienceError}
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "center", marginTop: "25px" }}>
              <button
                onClick={handleStartInterview}
                style={{
                  padding: "12px 30px",
                  backgroundColor: "#4fc3f7",
                  color: "#1a1a1a",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "16px",
                  fontWeight: "bold",
                  transition: "all 0.3s",
                  ":hover": {
                    backgroundColor: "#3da8d8",
                  },
                }}
              >
                Start Interview
              </button>
            </div>
          </div>
        </div>
      )}

      <h2 style={{ color: "#4fc3f7", textAlign: "center", marginBottom: "20px" }}>
        AI Interviewer ({topic})
      </h2>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "20px",
          padding: "10px",
          backgroundColor: "#2d2d2d",
          borderRadius: "6px",
        }}
      >
        <span style={{ color: "#a0a0a0", marginRight: "10px" }}>Experience Level:</span>
        <strong style={{ color: "#4fc3f7" }}>{getExperienceLabel(experience)}</strong>
      </div>

      <div
        style={{
          margin: "1rem 0",
          minHeight: "400px",
          border: "1px solid #444",
          padding: "20px",
          borderRadius: "8px",
          background: "#2d2d2d",
          overflowY: "auto",
          maxHeight: "500px",
        }}
      >
        {conversation.length === 0 && !interviewStarted ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
              color: "#a0a0a0",
            }}
          >
            Please select your experience level and start the interview
          </div>
        ) : (
          conversation.map((msg, idx) => (
            <div
              key={idx}
              style={{
                margin: "0.5rem 0",
                padding: "10px 15px",
                borderRadius: "8px",
                background: msg.role === "ai" ? "#333" : "#1e88e5",
                color: msg.role === "ai" ? "#e0e0e0" : "#fff",
                maxWidth: "80%",
                alignSelf: msg.role === "ai" ? "flex-start" : "flex-end",
                marginLeft: msg.role === "ai" ? "0" : "auto",
                marginRight: msg.role === "ai" ? "auto" : "0",
                wordBreak: "break-word",
              }}
            >
              <b>{msg.role === "ai" ? "AI" : "You"}:</b>{" "}
              {msg.role === "ai" && msg.type === "mcq" ? (
                <div>
                  <div>{parseMcqOptions(msg.text).question}</div>
                  {parseMcqOptions(msg.text).code && (
                    <pre
                      style={{
                        background: "#1a1a1a",
                        padding: "10px",
                        borderRadius: "6px",
                        whiteSpace: "pre-wrap",
                        margin: "10px 0",
                      }}
                    >
                      {parseMcqOptions(msg.text).code}
                    </pre>
                  )}
                </div>
              ) : msg.role === "ai" && msg.type === "coding" ? (
                <div>
                  <pre
                    style={{
                      background: "#1a1a1a",
                      padding: "10px",
                      borderRadius: "6px",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {msg.text}
                  </pre>
                </div>
              ) : (
                msg.text
              )}
            </div>
          ))
        )}

        <div style={{ marginTop: "20px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "10px",
              color: "#a0a0a0",
            }}
          >
            <b>Your Answer:</b>
            {listening && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginLeft: "10px",
                  color: "#4caf50",
                }}
              >
                <div
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    backgroundColor: "#4caf50",
                    marginRight: "5px",
                    animation: "pulse 1.5s infinite",
                  }}
                ></div>
                Listening...
              </div>
            )}
          </div>
          {conversation.length > 0 &&
          conversation[conversation.length - 1].role === "ai" &&
          conversation[conversation.length - 1].type === "mcq" ? (
            <div>
              {[...parseMcqOptions(conversation[conversation.length - 1].text).options, "Skip"].map(
                (option, i) => (
                  <label
                    key={i}
                    style={{
                      display: "block",
                      margin: "10px 0",
                      color: "#e0e0e0",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name="mcq"
                      value={option}
                      checked={mcqSelection === option}
                      onChange={(e) => setMcqSelection(e.target.value)}
                      style={{ marginRight: "10px" }}
                      disabled={loading || !interviewStarted}
                    />
                    {i < 4 ? String.fromCharCode(65 + i) + ") " : ""}{option}
                  </label>
                )
              )}
            </div>
          ) : (
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder={interviewStarted ? "Speak or type your answer..." : "Please start the interview first"}
              style={{
                width: "100%",
                minHeight: "80px",
                border: "1px solid #444",
                padding: "12px",
                background: "#333",
                color: "#e0e0e0",
                borderRadius: "6px",
                resize: "vertical",
                fontSize: "16px",
                fontFamily:
                  conversation.length > 0 &&
                  conversation[conversation.length - 1].type === "coding"
                  ? "monospace"
                  : "inherit",
              }}
              disabled={loading || !interviewStarted}
            />
          )}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          justifyContent: "center",
          marginTop: "20px",
        }}
      >
        <button
          onClick={() => {
            resetTranscript();
            setAnswer("");
            SpeechRecognition.startListening({ continuous: true, language: "en-US" });
          }}
          disabled={
            listening ||
            loading ||
            !interviewStarted ||
            (conversation.length > 0 &&
              conversation[conversation.length - 1].type === "mcq")
          }
          style={buttonStyle}
        >
          Start Answer
        </button>
        <button
          onClick={() => {
            SpeechRecognition.stopListening();
          }}
          disabled={!listening || loading}
          style={buttonStyle}
        >
          Stop
        </button>
        <button
          onClick={handleSend}
          disabled={
            loading ||
            (!answer.trim() && !mcqSelection) ||
            listening ||
            !interviewStarted
          }
          style={{ ...buttonStyle, backgroundColor: "#1e88e5" }}
        >
          Send Answer
        </button>
        <button
          onClick={() => speak(conversation[conversation.length - 1]?.text, conversation[conversation.length - 1]?.type)}
          disabled={loading || !interviewStarted || conversation.length === 0}
          style={buttonStyle}
        >
          🔊 Read Last Question
        </button>
        <button
          onClick={handleGenerateReport}
          disabled={
            reportLoading || loading || conversationHistory.length === 0 || !interviewStarted
          }
          style={{ ...buttonStyle, backgroundColor: "#43a047" }}
        >
          {reportLoading ? "Generating..." : "Generate Report"}
        </button>
        {report && (
          <button
            onClick={downloadReport}
            style={{ ...buttonStyle, backgroundColor: "#e53935" }}
          >
            Download PDF
          </button>
        )}
      </div>

      {loading && (
        <div
          style={{
            marginTop: "15px",
            textAlign: "center",
            color: "#4fc3f7",
          }}
        >
          <div
            style={{
              display: "inline-block",
              marginRight: "10px",
            }}
          >
            Processing
          </div>
          <div
            style={{
              display: "inline-flex",
              gap: "5px",
            }}
          >
            <div style={dotStyle(0)}></div>
            <div style={dotStyle(0.2)}></div>
            <div style={dotStyle(0.4)}></div>
          </div>
        </div>
      )}

      {report && (
        <div
          style={{
            marginTop: "30px",
            padding: "20px",
            background: "#2d2d2d",
            border: "1px solid #444",
            borderRadius: "8px",
            whiteSpace: "pre-line",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "15px",
              borderBottom: "1px solid #444",
              paddingBottom: "10px",
            }}
          >
            <h3 style={{ margin: 0, color: "#4fc3f7" }}>Interview Report</h3>
          </div>
          <div style={{ lineHeight: "1.6" }}>{report}</div>
        </div>
      )}
    </div>
  );
}

// Button style object
const buttonStyle = {
  padding: "10px 16px",
  backgroundColor: "#333",
  color: "#e0e0e0",
  border: "1px solid #444",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: "500",
  transition: "all 0.2s",
  minWidth: "120px",
  ":hover": {
    backgroundColor: "#444",
  },
  ":disabled": {
    backgroundColor: "#2a2a2a",
    color: "#666",
    cursor: "not-allowed",
    borderColor: "#333",
  },
};

// Loading dot style
const dotStyle = (delay) => ({
  width: "8px",
  height: "8px",
  backgroundColor: "#4fc3f7",
  borderRadius: "50%",
  animation: `bounce 1.4s infinite ${delay}s`,
  "@keyframes bounce": {
    "0%, 80%, 100%": {
      transform: "scale(0)",
      opacity: 0.5,
    },
    "40%": {
      transform: "scale(1)",
      opacity: 1,
    },
  },
});

// Add global styles
document.head.insertAdjacentHTML(
  "beforeend",
  `
  <style>
    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.5; }
      100% { opacity: 1; }
    }
    textarea:focus, select:focus, button:focus, input:focus {
      outline: 1px solid #4fc3f7;
      box-shadow: 0 0 0 2px rgba(79, 195, 247, 0.3);
    }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
        'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
        sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      background-color: #121212;
      color: #e0e0e0;
    }
    code {
      font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
        monospace;
    }
  </style>
`
);