import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getNextQuestion, generateUserReport, generateClientReport, evaluateAnswer } from "./llmService";
import { InterviewOrchestrator } from "./orchestrator";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import { jsPDF } from "jspdf";
import ReactMarkdown from "react-markdown";
import logo from "./assets/zeero-ai.png";
import InterviewSecurity from "./InterviewSecurity";

const VOICE_RATE = 1.3;

export default function Interview() {
  const location = useLocation();
  const { userName, topic, resumeSkills = [] } = location.state || { userName: '', topic: "Java Spring Boot", resumeSkills: [] };
  const INITIAL_AI_QUESTION = `Hello! I'm your AI interviewer specialized in ${resumeSkills.length > 0 ? resumeSkills.join(", ") : topic}. I'll be asking you questions to assess your background and skills. Let's start with your introduction — please tell me about your background and work with ${resumeSkills.length > 0 ? resumeSkills.join(", ") : topic}.`;

  const [experience, setExperience] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("15");
  const [durationError, setDurationError] = useState("");
  const [conversation, setConversation] = useState([]);
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState("");
  const [userReport, setUserReport] = useState("");
  const [clientReport, setClientReport] = useState("");
  const [showUserReportPopup, setShowUserReportPopup] = useState(false);
  const [showClientReportPopup, setShowClientReportPopup] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [experienceError, setExperienceError] = useState("");
  const [timer, setTimer] = useState(0);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [proctoringLogs, setProctoringLogs] = useState([]);
  const [shouldListen, setShouldListen] = useState(false);
  const orchestratorRef = useRef(null);
  const timerRef = useRef(null);
  const lastAIIndex = useRef(0);
  const isWaitingForAnswer = useRef(false);
  const currentQuestionText = useRef("");
  const navigate = useNavigate();

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  const addProctoringLog = (log) => setProctoringLogs((prev) => [...prev, { timestamp: new Date().toISOString(), event: log }]);

  useEffect(() => {
    const updateVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices.filter(voice => voice.lang.startsWith("en-")));
    };
    window.speechSynthesis.onvoiceschanged = updateVoices;
    updateVoices();
  }, []);

  useEffect(() => {
    if (interviewStarted && conversation[conversation.length - 1]?.stage !== "wrapup") {
      timerRef.current = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [interviewStarted, conversation]);

  useEffect(() => {
    if (interviewStarted && timer >= Number(durationMinutes) * 60) {
      handleEndInterview();
    }
  }, [timer, interviewStarted, durationMinutes]);

  useEffect(() => {
    if (interviewStarted && !orchestratorRef.current) {
      orchestratorRef.current = new InterviewOrchestrator(topic, resumeSkills);
    }
  }, [interviewStarted, topic, resumeSkills]);

  useEffect(() => {
    if (interviewStarted && conversation.length === 0) {
      setConversation([{ role: "ai", text: INITIAL_AI_QUESTION, type: "regular", stage: "greeting" }]);
    }
  }, [interviewStarted, conversation.length]);

  useEffect(() => {
    if (!listening && shouldListen) {
      SpeechRecognition.startListening({ continuous: true, language: "en-US" });
    }
  }, [listening, shouldListen]);

  const speak = (text) => {
    if (!window.speechSynthesis) {
      console.warn("Text-to-speech not supported in this browser.");
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-US";
    utter.rate = VOICE_RATE;
    if (selectedVoice) utter.voice = selectedVoice;
    utter.onend = () => {
      if (isWaitingForAnswer.current) {
        resetTranscript();
        setAnswer("");
        setShouldListen(true);
      }
    };
    window.speechSynthesis.speak(utter);
    isWaitingForAnswer.current = true;
  };

  const playDemoVoice = (voice) => {
    if (!window.speechSynthesis) {
      console.warn("Text-to-speech not supported in this browser.");
      return;
    }
    const demoText = "Hello, I'm your AI interviewer.";
    const utter = new SpeechSynthesisUtterance(demoText);
    utter.lang = "en-US";
    utter.rate = VOICE_RATE;
    if (voice) utter.voice = voice;
    window.speechSynthesis.speak(utter);
  };

  useEffect(() => {
    const aiMessages = conversation.filter((msg) => msg.role === "ai");
    if (aiMessages.length > lastAIIndex.current) {
      const newAI = aiMessages[aiMessages.length - 1];
      currentQuestionText.current = newAI.text;
      speak(newAI.text);
      lastAIIndex.current = aiMessages.length;
    }
  }, [conversation]);

  useEffect(() => {
    setAnswer(transcript);
  }, [transcript]);

  const handleSend = async () => {
    if (!answer.trim()) return;

    if (listening) {
      SpeechRecognition.stopListening();
    }
    setShouldListen(false);
    isWaitingForAnswer.current = false;

    const userAnswer = answer;
    const lastQuestion = conversation[conversation.length - 1];
    const updatedConversation = [...conversation, { role: "user", text: userAnswer, type: "regular", stage: lastQuestion.stage }];
    setConversation(updatedConversation);
    setLoading(true);
    setErrorMessage("");

    try {
      let evaluation = null;
      if (lastQuestion.stage !== "greeting" && lastQuestion.stage !== "wrapup") {
        evaluation = await evaluateAnswer({
          question: lastQuestion.text,
          answer: userAnswer,
          topic,
          stage: lastQuestion.stage
        });
        orchestratorRef.current.addAnswerScore(evaluation, evaluation.evaluation);
      }

      const followUpType = evaluation ? orchestratorRef.current.determineFollowUpType(evaluation) : null;

      const nextStage = orchestratorRef.current.decideNextState(userAnswer);
      if (!nextStage) {
        setConversation([...updatedConversation, { role: "ai", text: "Thank you for the interview! Please generate your reports.", type: "regular", stage: "wrapup" }]);
        setLoading(false);
        clearInterval(timerRef.current);
        return;
      }

      const aiResponse = await getNextQuestion({
        prompt: userAnswer,
        experienceRange: orchestratorRef.current.experienceLevel || experience || "0-2",
        conversationHistory: updatedConversation,
        topic,
        stage: nextStage,
        resumeSkills,
        followUpType
      });
      setConversation([...updatedConversation, { role: "ai", text: aiResponse, type: "regular", stage: nextStage }]);
    } catch (err) {
      console.error("Error fetching next question:", err);
      setErrorMessage(`Error contacting AI: ${err.message}`);
      setConversation([
        ...updatedConversation,
        { role: "ai", text: `Sorry, there was an error contacting the AI: ${err.message}`, type: "regular", stage: "error" }
      ]);
    }
    setAnswer("");
    resetTranscript();
    setLoading(false);
  };

  const handleSkip = async () => {
    const lastQuestion = conversation[conversation.length - 1];

    if (listening) {
      SpeechRecognition.stopListening();
    }
    setShouldListen(false);
    isWaitingForAnswer.current = false;

    const updatedConversation = [...conversation, { role: "user", text: "Skipped", type: "regular", stage: lastQuestion.stage }];
    setConversation(updatedConversation);
    setLoading(true);
    setErrorMessage("");

    try {
      const nextStage = orchestratorRef.current.decideNextState("Skipped");
      if (!nextStage) {
        setConversation([...updatedConversation, { role: "ai", text: "Thank you for the interview! Please generate your reports.", type: "regular", stage: "wrapup" }]);
        setLoading(false);
        clearInterval(timerRef.current);
        return;
      }

      const aiResponse = await getNextQuestion({
        prompt: "Skipped",
        experienceRange: orchestratorRef.current.experienceLevel || experience || "0-2",
        conversationHistory: updatedConversation,
        topic,
        stage: nextStage,
        resumeSkills
      });
      setConversation([...updatedConversation, { role: "ai", text: aiResponse, type: "regular", stage: nextStage }]);
    } catch (err) {
      console.error("Error fetching next question:", err);
      setErrorMessage(`Error contacting AI: ${err.message}`);
      setConversation([
        ...updatedConversation,
        { role: "ai", text: `Sorry, there was an error contacting the AI: ${err.message}`, type: "regular", stage: "error" }
      ]);
    }
    setAnswer("");
    resetTranscript();
    setLoading(false);
  };

  const handleEndInterview = async () => {
    window.speechSynthesis.cancel();
    setShouldListen(false);
    SpeechRecognition.stopListening();
    isWaitingForAnswer.current = false;
    setLoading(true);
    setErrorMessage("");

    const updatedConversation = [...conversation, {
      role: "ai",
      text: "Thank you for the interview! Generating your reports...",
      type: "regular",
      stage: "wrapup"
    }];
    setConversation(updatedConversation);

    try {
      const averages = orchestratorRef.current.computeAverages();
      const [userReportText, clientReportText] = await Promise.all([
        generateUserReport({
          experienceRange: orchestratorRef.current?.experienceLevel || experience || "0-2",
          conversationHistory: updatedConversation.filter((msg, idx) => idx > 0),
          topic,
          resumeSkills,
          averages
        }),
        generateClientReport({
          experienceRange: orchestratorRef.current?.experienceLevel || experience || "0-2",
          conversationHistory: updatedConversation.filter((msg, idx) => idx > 0),
          topic,
          resumeSkills,
          averages
        })
      ]);

      setUserReport(userReportText);
      setClientReport(clientReportText);

      // Save to backend
      const saveRes = await fetch('http://10.3.0.10:3002/api/interviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName,
          topic,
          resumeSkills,
          experience: orchestratorRef.current?.experienceLevel || experience || "0-2",
          durationMinutes: Number(durationMinutes),
          conversation: updatedConversation,
          proctoringLogs,
          userReport: userReportText,
          clientReport: clientReportText,
          timer
        })
      });
      if (!saveRes.ok) {
        console.error('Failed to save to database:', await saveRes.text());
      }

      const downloadReport = (reportText, type) => {
        const doc = new jsPDF();
        const pageHeight = doc.internal.pageSize.height;
        const margin = 15;
        const lineHeight = 7;
        const maxY = pageHeight - 20;

        doc.setFontSize(20);
        doc.setTextColor(44, 62, 80);
        doc.text(
          `${type === 'user' ? 'Candidate Feedback' : 'Recruiter'} Report: ${resumeSkills.length > 0 ? resumeSkills.join(", ") : topic}`,
          105, 20, { align: "center" }
        );
        doc.setFontSize(10);
        doc.setTextColor(149, 165, 166);
        doc.text(`Generated on ${new Date().toLocaleString()}`, 105, 28, { align: "center" });
        doc.setFontSize(12);
        doc.setTextColor(33, 37, 41);
        doc.text(`Experience Level: ${getExperienceLabel(orchestratorRef.current?.experienceLevel || experience || "0-2")}`, 15, 40);
        let y = 40 + lineHeight;
        if (resumeSkills.length > 0) {
          doc.text(`Resume Skills: ${resumeSkills.join(", ")}`, 15, y);
          y += lineHeight;
        }
        doc.text(`Interview Duration: ${formatTimer(timer)}`, 15, y);
        y += lineHeight * 2;

        const processedText = reportText.replace(/## /g, "").replace(/# /g, "");
        const splitText = doc.splitTextToSize(processedText, 180);

        for (let i = 0; i < splitText.length; i++) {
          if (y + lineHeight > maxY) {
            doc.addPage();
            y = 20;
          }
          doc.text(splitText[i], margin, y);
          y += lineHeight;
        }

        if (y + 20 > maxY) {
          doc.addPage();
          y = 20;
        } else {
          y = pageHeight - 12;
        }

        doc.setFontSize(10);
        doc.setTextColor(149, 165, 166);
        doc.text(`AI Interviewer ${type === 'user' ? 'Candidate' : 'Recruiter'} Report`, 105, y, { align: "center" });

        doc.save(`${type}-report-${topic}-${new Date().toISOString().slice(0, 10)}.pdf`);
      };

      downloadReport(userReportText, 'user');
      downloadReport(clientReportText, 'client');

      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (err) {
      console.error("Error generating reports or saving to database:", err);
      setErrorMessage(`Error: ${err.message}`);
      setTimeout(() => {
        navigate("/");
      }, 1000);
    } finally {
      setLoading(false);
      clearInterval(timerRef.current);
    }
  };

  const handleGenerateUserReport = async () => {
    setUserReport("");
    setReportLoading(true);
    setErrorMessage("");
    try {
      const averages = orchestratorRef.current.computeAverages();
      const reportText = await generateUserReport({
        experienceRange: orchestratorRef.current?.experienceLevel || experience || "0-2",
        conversationHistory: conversation.filter((msg, idx) => idx > 0),
        topic,
        resumeSkills,
        averages
      });
      setUserReport(reportText);
      setShowUserReportPopup(true);
    } catch (err) {
      console.error("Error generating user report:", err);
      setErrorMessage(`Error generating user report: ${err.message}`);
      setUserReport(`Sorry, there was an error generating the user report: ${err.message}`);
      setShowUserReportPopup(true);
    }
    setReportLoading(false);
  };

  const handleGenerateClientReport = async () => {
    setClientReport("");
    setReportLoading(true);
    setErrorMessage("");
    try {
      const averages = orchestratorRef.current.computeAverages();
      const reportText = await generateClientReport({
        experienceRange: orchestratorRef.current?.experienceLevel || experience || "0-2",
        conversationHistory: conversation.filter((msg, idx) => idx > 0),
        topic,
        resumeSkills,
        averages
      });
      setClientReport(reportText);
      setShowClientReportPopup(true);
    } catch (err) {
      console.error("Error generating client report:", err);
      setErrorMessage(`Error generating client report: ${err.message}`);
      setClientReport(`Sorry, there was an error generating the client report: ${err.message}`);
      setShowClientReportPopup(true);
    }
    setReportLoading(false);
  };

  const downloadUserReport = () => {
    if (!userReport) return;

    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    const margin = 15;
    const lineHeight = 7;
    const maxY = pageHeight - 20;

    doc.setFontSize(20);
    doc.setTextColor(44, 62, 80);
    doc.text(`Candidate Feedback Report: ${resumeSkills.length > 0 ? resumeSkills.join(", ") : topic}`, 105, 20, { align: "center" });
    doc.setFontSize(10);
    doc.setTextColor(149, 165, 166);
    doc.text(`Generated on ${new Date().toLocaleString()}`, 105, 28, { align: "center" });
    doc.setFontSize(12);
    doc.setTextColor(33, 37, 41);
    doc.text(`Experience Level: ${getExperienceLabel(orchestratorRef.current?.experienceLevel || experience || "0-2")}`, 15, 40);
    let y = 40 + lineHeight;
    if (resumeSkills.length > 0) {
      doc.text(`Resume Skills: ${resumeSkills.join(", ")}`, 15, y);
      y += lineHeight;
    }
    doc.text(`Interview Duration: ${formatTimer(timer)}`, 15, y);
    y += lineHeight * 2;

    const processedText = userReport.replace(/## /g, "").replace(/# /g, "");
    const splitText = doc.splitTextToSize(processedText, 180);

    for (let i = 0; i < splitText.length; i++) {
      if (y + lineHeight > maxY) {
        doc.addPage();
        y = 20;
      }
      doc.text(splitText[i], margin, y);
      y += lineHeight;
    }

    if (y + 20 > maxY) {
      doc.addPage();
      y = 20;
    } else {
      y = pageHeight - 12;
    }

    doc.setFontSize(10);
    doc.setTextColor(149, 165, 166);
    doc.text("AI Interviewer Candidate Report", 105, y, { align: "center" });
    doc.save(`candidate-report-${topic}-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const downloadClientReport = () => {
    if (!clientReport) return;

    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    const margin = 15;
    const lineHeight = 7;
    const maxY = pageHeight - 20;

    doc.setFontSize(20);
    doc.setTextColor(44, 62, 80);
    doc.text(`Recruiter Report: ${resumeSkills.length > 0 ? resumeSkills.join(", ") : topic}`, 105, 20, { align: "center" });
    doc.setFontSize(10);
    doc.setTextColor(149, 165, 166);
    doc.text(`Generated on ${new Date().toLocaleString()}`, 105, 28, { align: "center" });
    doc.setFontSize(12);
    doc.setTextColor(33, 37, 41);
    doc.text(`Experience Level: ${getExperienceLabel(orchestratorRef.current?.experienceLevel || experience || "0-2")}`, 15, 40);
    let y = 40 + lineHeight;
    if (resumeSkills.length > 0) {
      doc.text(`Resume Skills: ${resumeSkills.join(", ")}`, 15, y);
      y += lineHeight;
    }
    doc.text(`Interview Duration: ${formatTimer(timer)}`, 15, y);
    y += lineHeight * 2;

    const processedText = clientReport.replace(/## /g, "").replace(/# /g, "");
    const splitText = doc.splitTextToSize(processedText, 180);

    for (let i = 0; i < splitText.length; i++) {
      if (y + lineHeight > maxY) {
        doc.addPage();
        y = 20;
      }
      doc.text(splitText[i], margin, y);
      y += lineHeight;
    }

    if (y + 20 > maxY) {
      doc.addPage();
      y = 20;
    } else {
      y = pageHeight - 12;
    }

    doc.setFontSize(10);
    doc.setTextColor(149, 165, 166);
    doc.text("AI Interviewer Recruiter Report", 105, y, { align: "center" });
    doc.save(`recruiter-report-${topic}-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const formatTimer = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
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

  const validateDuration = (value) => {
    const num = Number(value);
    if (!value.trim() || isNaN(num) || num < 1) {
      return "Please enter a valid duration (positive number in minutes)";
    }
    return "";
  };

  const handleStartInterview = () => {
    if (!experience) {
      setExperienceError("Please select your experience level");
      return;
    }
    const durationValidation = validateDuration(durationMinutes);
    if (durationValidation) {
      setDurationError(durationValidation);
      return;
    }
    setShowInstructions(false);
    setInterviewStarted(true);
    addProctoringLog("Interview started");
  };

  const handleImageError = (e) => {
    console.error("Failed to load AI avatar image:", e);
    e.target.src = "https://via.placeholder.com/40?text=AI";
  };

  if (!browserSupportsSpeechRecognition) {
    return <div style={{ color: "#fff" }}>Your browser does not support speech recognition.</div>;
  }

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        backgroundColor: "#121212",
        padding: "20px",
        boxSizing: "border-box",
      }}
    >
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
              <li style={{ marginBottom: "10px" }}>Read the AI's question carefully. Questions will be read aloud.</li>
              <li style={{ marginBottom: "10px" }}>
                To answer through voice:
                <ul style={{ paddingLeft: "20px", marginTop: "5px" }}>
                  <li>
                    Click <strong style={{ color: "#4fc3f7" }}>"Start Answer"</strong> to begin recording
                  </li>
                  <li>Speak clearly into your microphone</li>
                  <li>
                    Click <strong style={{ color: "#4fc3f7" }}>"Stop and Send"</strong> when finished to submit your answer
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
                Click <strong style={{ color: "#4fc3f7" }}>"🔊 Read Last Question"</strong> to hear
                the last question again at any time.
              </li>
              <li style={{ marginBottom: "10px" }}>
                The interview will end automatically after {durationMinutes} minutes, or click{" "}
                <strong style={{ color: "#4fc3f7" }}>"End Interview"</strong> to conclude early.
              </li>
              <li style={{ marginBottom: "10px" }}>
                This interview uses your webcam for AI proctoring to detect malpractices like looking away. Please grant camera permission and keep your face visible.
              </li>
              <li>
                Generate two reports: one for your feedback and one for recruiters.
              </li>
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

            <div style={{ margin: "20px 0" }}>
              <label style={{ display: "block", marginBottom: "8px", color: "#a0a0a0" }}>
                Interview duration (minutes):
              </label>
              <input
                type="number"
                value={durationMinutes}
                onChange={(e) => {
                  setDurationMinutes(e.target.value);
                  setDurationError(validateDuration(e.target.value));
                }}
                placeholder="e.g., 15"
                style={{
                  padding: "10px",
                  borderRadius: "6px",
                  backgroundColor: "#333",
                  color: "#e0e0e0",
                  border: durationError ? "1px solid #e53935" : "1px solid #444",
                  width: "100%",
                  fontSize: "16px",
                }}
              />
              {durationError && (
                <div style={{ color: "#e53935", marginTop: "5px", fontSize: "14px" }}>
                  {durationError}
                </div>
              )}
            </div>

            <div style={{ margin: "20px 0" }}>
              <label style={{ display: "block", marginBottom: "8px", color: "#a0a0a0" }}>
                Select AI voice:
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <select
                  value={selectedVoice?.name || ""}
                  onChange={(e) => {
                    const voice = availableVoices.find(v => v.name === e.target.value);
                    setSelectedVoice(voice || null);
                  }}
                  style={{
                    padding: "10px",
                    borderRadius: "6px",
                    backgroundColor: "#333",
                    color: "#e0e0e0",
                    border: "1px solid #444",
                    width: "100%",
                    fontSize: "16px",
                  }}
                >
                  <option value="">Default Voice</option>
                  {availableVoices.map(voice => (
                    <option key={voice.name} value={voice.name}>{voice.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => playDemoVoice(selectedVoice)}
                  disabled={!selectedVoice}
                  style={{
                    padding: "10px 20px",
                    backgroundColor: selectedVoice ? "#4fc3f7" : "#333",
                    color: selectedVoice ? "#1a1a1a" : "#666",
                    border: "none",
                    borderRadius: "6px",
                    cursor: selectedVoice ? "pointer" : "not-allowed",
                    fontSize: "14px",
                  }}
                >
                  Play Demo
                </button>
              </div>
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
                }}
              >
                Start Interview
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          gap: "20px",
        }}
      >
        <div
          style={{
            flex: "3",
            backgroundColor: "#1a1a1a",
            borderRadius: "10px",
            padding: "20px",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)",
            display: "flex",
            flexDirection: "column",
            height: "100%",
          }}
        >
          <h2 style={{
            color: "#4fc3f7",
            textAlign: "center",
            marginBottom: "20px"
          }}>
            ZEERO AI Interviewer ({resumeSkills.length > 0 ? resumeSkills.join(", ") : topic})
          </h2>

          {errorMessage && (
            <div style={{
              backgroundColor: "#e53935",
              color: "#fff",
              padding: "10px",
              borderRadius: "6px",
              marginBottom: "10px",
              textAlign: "center",
            }}>
              {errorMessage}
            </div>
          )}

          <div
            style={{
              flex: "1",
              overflowY: "auto",
              border: "1px solid #444",
              padding: "20px",
              borderRadius: "8px",
              background: "#2d2d2d",
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
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {msg.role === "ai" && (
                    <img
                      src={logo}
                      alt="AI Avatar"
                      onError={handleImageError}
                      style={{
                        width: "60px",
                        height: "60px",
                        borderRadius: "50%",
                        marginRight: "10px",
                        border: "2px solid #4fc3f7",
                        objectFit: "cover",
                      }}
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <b>{msg.role === "ai" ? "ZEERO AI" : "You"}</b>
                      {msg.role === "ai" && idx === conversation.length - 1 && (
                        <button
                          onClick={handleSkip}
                          disabled={loading || !interviewStarted}
                          style={{
                            padding: "5px 10px",
                            backgroundColor: "#e53935",
                            color: "#fff",
                            border: "none",
                            borderRadius: "4px",
                            cursor: loading || !interviewStarted ? "not-allowed" : "pointer",
                            fontSize: "12px",
                            marginLeft: "10px",
                          }}
                        >
                          Skip
                        </button>
                      )}
                    </div>
                    <ReactMarkdown
                      components={{
                        code: ({ node, inline, children, ...props }) => (
                          <code style={{ fontFamily: "monospace", background: "#1a1a1a", padding: inline ? "2px 4px" : "10px", borderRadius: "4px", display: inline ? "inline" : "block" }} {...props}>
                            {children}
                          </code>
                        ),
                      }}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  </div>
                </div>
              ))
            )}
          </div>

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
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder={interviewStarted ? "Speak or type your answer..." : "Please start the interview first"}
              spellCheck={true}
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
                fontFamily: "inherit",
              }}
              disabled={loading || !interviewStarted}
            />
          </div>
        </div>

        <div
          style={{
            flex: "1",
            backgroundColor: "#1a1a1a",
            borderRadius: "10px",
            padding: "20px",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)",
            display: "flex",
            flexDirection: "column",
            gap: "15px",
            height: "100%",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                padding: "10px",
                backgroundColor: "#2d2d2d",
                borderRadius: "6px",
                marginBottom: "15px",
              }}
            >
              <span style={{ color: "#a0a0a0", marginRight: "10px" }}>Experience Level:</span>
              <strong style={{ color: "#4fc3f7" }}>
                {getExperienceLabel(orchestratorRef.current?.experienceLevel || experience || "0-2")}
              </strong>
            </div>
            <div
              style={{
                padding: "10px",
                backgroundColor: "#2d2d2d",
                borderRadius: "6px",
                marginBottom: "15px",
              }}
            >
              <span style={{ color: "#a0a0a0", marginRight: "10px" }}>Interview On:</span>
              <strong style={{ color: "#4fc3f7" }}>{resumeSkills.length > 0 ? resumeSkills.join(", ") : topic}</strong>
            </div>
            <div
              style={{
                padding: "10px",
                backgroundColor: "#2d2d2d",
                borderRadius: "6px",
                marginBottom: "15px",
              }}
            >
              <span style={{ color: "#a0a0a0", marginRight: "10px" }}>Current Stage:</span>
              <strong style={{ color: "#4fc3f7" }}>
                {conversation.length > 0 ? conversation[conversation.length - 1].stage : "Not Started"}
              </strong>
            </div>
            <div
              style={{
                padding: "10px",
                backgroundColor: "#2d2d2d",
                borderRadius: "6px",
                marginBottom: "15px",
              }}
            >
              <span style={{ color: "#a0a0a0", marginRight: "10px" }}>Timer:</span>
              <strong style={{ color: "#4fc3f7" }}>{formatTimer(timer)}</strong>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <button
              onClick={() => {
                window.speechSynthesis.cancel();
                navigate("/");
              }}
              style={{
                padding: "10px 20px",
                backgroundColor: "#4CAF50",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "16px",
                fontWeight: "bold",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.2)",
                transition: "background-color 0.3s ease"
              }}
            >
              Go Home
            </button>
            <button
              onClick={() => {
                window.speechSynthesis.cancel();
                resetTranscript();
                setAnswer("");
                setShouldListen(true);
              }}
              disabled={listening || loading || !interviewStarted}
              style={buttonStyle}
            >
              Start Answer
            </button>
            <button
              onClick={() => {
                SpeechRecognition.stopListening();
                setShouldListen(false);
                handleSend();
              }}
              disabled={listening ? false : !answer.trim() || loading || !interviewStarted}
              style={buttonStyle}
            >
              Stop and Send
            </button>
            <button
              onClick={handleSend}
              disabled={loading || !answer.trim() || listening || !interviewStarted}
              style={{ ...buttonStyle, backgroundColor: "#1e88e5" }}
            >
              Send Answer
            </button>
            <button
              onClick={() => {
                window.speechSynthesis.cancel();
                speak(conversation[conversation.length - 1]?.text);
              }}
              disabled={loading || !interviewStarted || conversation.length === 0}
              style={buttonStyle}
            >
              🔊 Read Last Question
            </button>
            <button
              onClick={handleEndInterview}
              disabled={loading || !interviewStarted || conversation[conversation.length - 1]?.stage === "wrapup"}
              style={{ ...buttonStyle, backgroundColor: "#e53935" }}
            >
              {loading ? "Generating Reports..." : "End Interview"}
            </button>
            <button
              onClick={handleGenerateUserReport}
              disabled={reportLoading || loading || conversation.length <= 1 || !interviewStarted}
              style={{ ...buttonStyle, backgroundColor: "#43a047" }}
            >
              {reportLoading ? "Generating..." : "Generate User Report"}
            </button>
            <button
              onClick={handleGenerateClientReport}
              disabled={reportLoading || loading || conversation.length <= 1 || !interviewStarted}
              style={{ ...buttonStyle, backgroundColor: "#43a047" }}
            >
              {reportLoading ? "Generating..." : "Generate Client Report"}
            </button>
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
        </div>
      </div>

      {showUserReportPopup && (
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
              position: "relative",
            }}
          >
            <button
              onClick={() => setShowUserReportPopup(false)}
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                backgroundColor: "#e53935",
                color: "#fff",
                border: "none",
                borderRadius: "50%",
                width: "30px",
                height: "30px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                cursor: "pointer",
                fontSize: "16px",
              }}
            >
              X
            </button>
            <h2 style={{ color: "#4fc3f7", textAlign: "center", marginBottom: "20px" }}>
              Candidate Feedback Report
            </h2>
            {userReport ? (
              <div style={{ lineHeight: "1.6" }}>
                <ReactMarkdown
                  components={{
                    h1: ({ children }) => <h1 style={{ color: "#4fc3f7", margin: "20px 0 10px" }}>{children}</h1>,
                    h2: ({ children }) => <h2 style={{ color: "#4fc3f7", margin: "15px 0 10px" }}>{children}</h2>,
                    p: ({ children }) => <p style={{ margin: "10px 0", color: "#e0e0e0" }}>{children}</p>,
                    ul: ({ children }) => <ul style={{ paddingLeft: "20px", margin: "10px 0", color: "#e0e0e0" }}>{children}</ul>,
                    li: ({ children }) => <li style={{ margin: "5px 0" }}>{children}</li>,
                  }}
                >
                  {userReport}
                </ReactMarkdown>
                <div style={{ textAlign: "center", marginTop: "20px" }}>
                  <button
                    onClick={downloadUserReport}
                    style={{
                      padding: "10px 20px",
                      backgroundColor: "#0288d1",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "16px",
                      fontWeight: "bold",
                    }}
                  >
                    Download Report
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", color: "#a0a0a0" }}>
                Generating report...
              </div>
            )}
          </div>
        </div>
      )}

      {showClientReportPopup && (
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
              position: "relative",
            }}
          >
            <button
              onClick={() => setShowClientReportPopup(false)}
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                backgroundColor: "#e53935",
                color: "#fff",
                border: "none",
                borderRadius: "50%",
                width: "30px",
                height: "30px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                cursor: "pointer",
                fontSize: "16px",
              }}
            >
              X
            </button>
            <h2 style={{ color: "#4fc3f7", textAlign: "center", marginBottom: "20px" }}>
              Recruiter Report
            </h2>
            {clientReport ? (
              <div style={{ lineHeight: "1.6" }}>
                <ReactMarkdown
                  components={{
                    h1: ({ children }) => <h1 style={{ color: "#4fc3f7", margin: "20px 0 10px" }}>{children}</h1>,
                    h2: ({ children }) => <h2 style={{ color: "#4fc3f7", margin: "15px 0 10px" }}>{children}</h2>,
                    p: ({ children }) => <p style={{ margin: "10px 0", color: "#e0e0e0" }}>{children}</p>,
                    ul: ({ children }) => <ul style={{ paddingLeft: "20px", margin: "10px 0", color: "#e0e0e0" }}>{children}</ul>,
                    li: ({ children }) => <li style={{ margin: "5px 0" }}>{children}</li>,
                  }}
                >
                  {clientReport}
                </ReactMarkdown>
                <div style={{ textAlign: "center", marginTop: "20px" }}>
                  <button
                    onClick={downloadClientReport}
                    style={{
                      padding: "10px 20px",
                      backgroundColor: "#0288d1",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "16px",
                      fontWeight: "bold",
                    }}
                  >
                    Download Report
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", color: "#a0a0a0" }}>
                Generating report...
              </div>
            )}
          </div>
        </div>
      )}

      <InterviewSecurity addProctoringLog={addProctoringLog} />

      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
          @keyframes bounce {
            0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
            40% { transform: scale(1); opacity: 1; }
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
          button:hover:not(:disabled) {
            background-color: #4fc3f7;
            color: #1a1a1a;
          }
        `}
      </style>
    </div>
  );
}

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
};

const dotStyle = (delay) => ({
  width: "8px",
  height: "8px",
  backgroundColor: "#4fc3f7",
  borderRadius: "50%",
  animation: `bounce 1.4s infinite ${delay}s`,
});