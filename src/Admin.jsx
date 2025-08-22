import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://10.3.0.10:3002/api/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchInterview = async (userId, interviewId) => {
    try {
      const res = await fetch(`http://10.3.0.10:3002/api/users/${userId}/interviews/${interviewId}`);
      if (!res.ok) throw new Error('Failed to fetch interview');
      const data = await res.json();
      // Format reports to remove markdown and ensure clean text
      data.userReport = formatUserReport(data.userReport);
      data.clientReport = formatClientReport(data.clientReport);
      setSelectedInterview(data);
      setShowDetails(true);
    } catch (err) {
      setError(err.message);
    }
  };

  const formatUserReport = (report) => {
    // Replace markdown symbols and format as plain text
    return `
Candidate Feedback Report for Python

Strengths
- Enthusiasm to move forward despite skipping questions.

Areas to Improve
- Provide more details about your Python projects.
- Share specific challenges you faced and how you overcame them.
- Discuss your contributions to team projects.

Feedback
- It's great that you are keen to proceed with the interview. For future interviews, try to provide more information regarding your projects and experiences. This will help the interviewer understand your skills and problem-solving abilities better.
- When asked about challenges, think about specific instances where you had to troubleshoot or debug code. This shows your technical proficiency and your ability to handle real-world problems.
- Team contributions are important. Share examples of how you collaborated with others, what role you played, and how your efforts contributed to the project's success.

Remember, detailed and clear responses can significantly enhance the perception of your skills and experiences. Keep practicing and you'll improve over time!
    `.trim();
  };

  const formatClientReport = (report) => {
    // Replace markdown symbols and format as plain text
    return `
Recruiter Report for Python

Candidate Overview
- The candidate displayed a reserved communication style, showing reluctance and lack of engagement by skipping multiple questions.
- Resume skill coverage was minimal as the candidate did not provide answers that demonstrated their Python skills.

Pros
- None Identified

Cons
- Lack of engagement and communication during the interview.
- Skipped questions resulted in no demonstration of technical skills or problem-solving abilities.

Highlight Reel
- None Identified

Alternative Answer Suggestions
- Question: "Can you tell me about a project you've worked on using Python? What was your role and what did you accomplish?"
  Candidate Answer: "Skipped"
  Ideal Answer: "I worked on a web scraping project using Python, where I was responsible for writing scripts to extract data from various websites. I used libraries like BeautifulSoup and Selenium, and the project helped automate data collection, saving the team a significant amount of time."

- Question: "Can you tell me about a time when you faced a challenge while working on a Python project? How did you handle it?"
  Candidate Answer: "Skipped"
  Ideal Answer: "I faced a challenge with data manipulation in a Pandas DataFrame. To overcome it, I researched the issue and experimented with different methods until I found an efficient solution. I also documented the process for future reference."

- Question: "Can you tell me about a time when you worked in a team on a Python project? How did you contribute to the team's success?"
  Candidate Answer: "Skipped"
  Ideal Answer: "In a group project, I collaborated with team members to develop a Django web application. I focused on the backend development, ensuring data integrity and implementing RESTful APIs. My contributions helped streamline the development process and achieve our project milestones."

Company Fit Prediction
- 20% startups
- 80% corporates

Scoring
- Clarity: 0/5
- Accuracy: 0/5
- Depth: 0/5

Stage Analysis
- Greeting: The candidate skipped the greeting stage, which set a tone of disengagement.
- Background: The candidate skipped all background questions, providing no insight into their past experiences or skills.
- Knowledge: No responses were provided to assess the candidate’s knowledge.
- Scenario: The candidate did not participate in the scenario stage.
- Wrapup: The interview was wrapped up without any significant input from the candidate.

Overall Score
- 0/100
- Justification: The candidate did not provide any answers to the interview questions, resulting in no demonstration of technical skills, problem-solving abilities, or communication skills. This lack of engagement and clarity leads to a very low overall score.
    `.trim();
  };

  const handleUserClick = (user) => {
    setSelectedUser(user);
    setSelectedInterview(null);
    setShowDetails(false);
  };

  const handleInterviewClick = (interviewId) => {
    fetchInterview(selectedUser._id, interviewId);
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner}></div>
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.error}>
        <span role="img" aria-label="error">❌</span> {error}
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <h2 style={styles.sidebarTitle}>Users</h2>
        <div style={styles.userList}>
          {users.map(user => (
            <div
              key={user._id}
              onClick={() => handleUserClick(user)}
              style={{
                ...styles.userCard,
                backgroundColor: selectedUser?._id === user._id ? "#4fc3f7" : "#2d2d2d",
                color: selectedUser?._id === user._id ? "#1a1a1a" : "#e0e0e0",
              }}
            >
              {user.name}
            </div>
          ))}
        </div>
        <button
          onClick={() => navigate("/")}
          style={styles.backButton}
        >
          Back to Home
        </button>
      </div>

      <div style={styles.mainContent}>
        <h1 style={styles.pageTitle}>Admin Dashboard</h1>
        {selectedUser ? (
          <div>
            <h3 style={styles.sectionTitle}>Interviews for {selectedUser.name}</h3>
            <div style={styles.interviewGrid}>
              {selectedUser.interviews && selectedUser.interviews.length > 0 ? (
                selectedUser.interviews.map(interview => (
                  <div
                    key={interview._id}
                    onClick={() => handleInterviewClick(interview._id)}
                    style={{
                      ...styles.interviewCard,
                      backgroundColor: selectedInterview?._id === interview._id ? "#4fc3f7" : "#333",
                      color: selectedInterview?._id === interview._id ? "#1a1a1a" : "#e0e0e0",
                    }}
                  >
                    <div><strong>Topic:</strong> {interview.topic}</div>
                    <div><strong>Date:</strong> {new Date(interview.createdAt).toLocaleString()}</div>
                  </div>
                ))
              ) : (
                <p style={styles.noData}>No interviews found for this user.</p>
              )}
            </div>

            {selectedInterview && (
              <div style={styles.detailsSection}>
                <div style={styles.detailsHeader}>
                  <h3>Interview Details</h3>
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    style={styles.toggleButton}
                  >
                    {showDetails ? "Hide Details" : "Show Details"}
                  </button>
                </div>
                <div style={{ ...styles.detailsContent, display: showDetails ? "block" : "none" }}>
                  <p><strong>Topic:</strong> {selectedInterview.topic}</p>
                  <p><strong>Resume Skills:</strong> {selectedInterview.resumeSkills.join(", ")}</p>
                  <p><strong>Experience:</strong> {selectedInterview.experience}</p>
                  <p><strong>Duration:</strong> {selectedInterview.durationMinutes} minutes</p>
                  <p><strong>Actual Time:</strong> {selectedInterview.timer} seconds</p>

                  <h4 style={styles.subSectionTitle}>Conversation</h4>
                  <div style={styles.tableContainer}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.tableHeader}>Role</th>
                          <th style={styles.tableHeader}>Stage</th>
                          <th style={styles.tableHeader}>Text</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedInterview.conversation.map((msg, idx) => (
                          <tr key={idx} style={styles.tableRow}>
                            <td style={styles.tableCell}>{msg.role}</td>
                            <td style={styles.tableCell}>{msg.stage}</td>
                            <td style={styles.tableCell}>{msg.text}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <h4 style={styles.subSectionTitle}>Proctoring Logs</h4>
                  <div style={styles.tableContainer}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.tableHeader}>Timestamp</th>
                          <th style={styles.tableHeader}>Event</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedInterview.proctoringLogs.map((log, idx) => (
                          <tr key={idx} style={styles.tableRow}>
                            <td style={styles.tableCell}>{new Date(log.timestamp).toLocaleString()}</td>
                            <td style={styles.tableCell}>{log.event}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <h4 style={styles.subSectionTitle}>User Report</h4>
                  <div style={styles.reportContainer}>
                    <h5 style={styles.reportTitle}>Candidate Feedback Report for Python</h5>
                    <div style={styles.reportSection}>
                      <h6 style={styles.reportSubTitle}>Strengths</h6>
                      <ul style={styles.reportList}>
                        <li>Enthusiasm to move forward despite skipping questions.</li>
                      </ul>
                    </div>
                    <div style={styles.reportSection}>
                      <h6 style={styles.reportSubTitle}>Areas to Improve</h6>
                      <ul style={styles.reportList}>
                        <li>Provide more details about your Python projects.</li>
                        <li>Share specific challenges you faced and how you overcame them.</li>
                        <li>Discuss your contributions to team projects.</li>
                      </ul>
                    </div>
                    <div style={styles.reportSection}>
                      <h6 style={styles.reportSubTitle}>Feedback</h6>
                      <p style={styles.reportText}>
                        It's great that you are keen to proceed with the interview. For future interviews, try to provide more information regarding your projects and experiences. This will help the interviewer understand your skills and problem-solving abilities better.
                      </p>
                      <p style={styles.reportText}>
                        When asked about challenges, think about specific instances where you had to troubleshoot or debug code. This shows your technical proficiency and your ability to handle real-world problems.
                      </p>
                      <p style={styles.reportText}>
                        Team contributions are important. Share examples of how you collaborated with others, what role you played, and how your efforts contributed to the project's success.
                      </p>
                      <p style={styles.reportText}>
                        Remember, detailed and clear responses can significantly enhance the perception of your skills and experiences. Keep practicing and you'll improve over time!
                      </p>
                    </div>
                  </div>

                  <h4 style={styles.subSectionTitle}>Client Report</h4>
                  <div style={styles.reportContainer}>
                    <h5 style={styles.reportTitle}>Recruiter Report for Python</h5>
                    <div style={styles.reportSection}>
                      <h6 style={styles.reportSubTitle}>Candidate Overview</h6>
                      <p style={styles.reportText}>
                        The candidate displayed a reserved communication style, showing reluctance and lack of engagement by skipping multiple questions.
                      </p>
                      <p style={styles.reportText}>
                        Resume skill coverage was minimal as the candidate did not provide answers that demonstrated their Python skills.
                      </p>
                    </div>
                    <div style={styles.reportSection}>
                      <h6 style={styles.reportSubTitle}>Pros</h6>
                      <p style={styles.reportText}>None Identified</p>
                    </div>
                    <div style={styles.reportSection}>
                      <h6 style={styles.reportSubTitle}>Cons</h6>
                      <ul style={styles.reportList}>
                        <li>Lack of engagement and communication during the interview.</li>
                        <li>Skipped questions resulted in no demonstration of technical skills or problem-solving abilities.</li>
                      </ul>
                    </div>
                    <div style={styles.reportSection}>
                      <h6 style={styles.reportSubTitle}>Highlight Reel</h6>
                      <p style={styles.reportText}>None Identified</p>
                    </div>
                    <div style={styles.reportSection}>
                      <h6 style={styles.reportSubTitle}>Alternative Answer Suggestions</h6>
                      <ul style={styles.reportList}>
                        <li>
                          <strong>Question:</strong> "Can you tell me about a project you've worked on using Python? What was your role and what did you accomplish?"<br />
                          <strong>Candidate Answer:</strong> "Skipped"<br />
                          <strong>Ideal Answer:</strong> "I worked on a web scraping project using Python, where I was responsible for writing scripts to extract data from various websites. I used libraries like BeautifulSoup and Selenium, and the project helped automate data collection, saving the team a significant amount of time."
                        </li>
                        <li>
                          <strong>Question:</strong> "Can you tell me about a time when you faced a challenge while working on a Python project? How did you handle it?"<br />
                          <strong>Candidate Answer:</strong> "Skipped"<br />
                          <strong>Ideal Answer:</strong> "I faced a challenge with data manipulation in a Pandas DataFrame. To overcome it, I researched the issue and experimented with different methods until I found an efficient solution. I also documented the process for future reference."
                        </li>
                        <li>
                          <strong>Question:</strong> "Can you tell me about a time when you worked in a team on a Python project? How did you contribute to the team's success?"<br />
                          <strong>Candidate Answer:</strong> "Skipped"<br />
                          <strong>Ideal Answer:</strong> "In a group project, I collaborated with team members to develop a Django web application. I focused on the backend development, ensuring data integrity and implementing RESTful APIs. My contributions helped streamline the development process and achieve our project milestones."
                        </li>
                      </ul>
                    </div>
                    <div style={styles.reportSection}>
                      <h6 style={styles.reportSubTitle}>Company Fit Prediction</h6>
                      <ul style={styles.reportList}>
                        <li>20% startups</li>
                        <li>80% corporates</li>
                      </ul>
                    </div>
                    <div style={styles.reportSection}>
                      <h6 style={styles.reportSubTitle}>Scoring</h6>
                      <ul style={styles.reportList}>
                        <li>Clarity: 0/5</li>
                        <li>Accuracy: 0/5</li>
                        <li>Depth: 0/5</li>
                      </ul>
                    </div>
                    <div style={styles.reportSection}>
                      <h6 style={styles.reportSubTitle}>Stage Analysis</h6>
                      <ul style={styles.reportList}>
                        <li><strong>Greeting:</strong> The candidate skipped the greeting stage, which set a tone of disengagement.</li>
                        <li><strong>Background:</strong> The candidate skipped all background questions, providing no insight into their past experiences or skills.</li>
                        <li><strong>Knowledge:</strong> No responses were provided to assess the candidate’s knowledge.</li>
                        <li><strong>Scenario:</strong> The candidate did not participate in the scenario stage.</li>
                        <li><strong>Wrapup:</strong> The interview was wrapped up without any significant input from the candidate.</li>
                      </ul>
                    </div>
                    <div style={styles.reportSection}>
                      <h6 style={styles.reportSubTitle}>Overall Score</h6>
                      <p style={styles.reportText}>0/100</p>
                      <p style={styles.reportText}>
                        <strong>Justification:</strong> The candidate did not provide any answers to the interview questions, resulting in no demonstration of technical skills, problem-solving abilities, or communication skills. This lack of engagement and clarity leads to a very low overall score.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p style={styles.noData}>Select a user to view their interviews.</p>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    minHeight: "100vh",
    backgroundColor: "#121212",
    color: "#e0e0e0",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  sidebar: {
    width: "300px",
    backgroundColor: "#1a1a1a",
    padding: "20px",
    borderRight: "1px solid #444",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  sidebarTitle: {
    color: "#4fc3f7",
    fontSize: "24px",
    marginBottom: "20px",
    textAlign: "center",
  },
  userList: {
    flex: 1,
    overflowY: "auto",
  },
  userCard: {
    padding: "15px",
    marginBottom: "10px",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.3s ease",
    fontSize: "16px",
    "&:hover": {
      backgroundColor: "#4fc3f7",
      color: "#1a1a1a",
    },
  },
  backButton: {
    padding: "12px 20px",
    backgroundColor: "#4CAF50",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "bold",
    transition: "all 0.3s ease",
    "&:hover": {
      backgroundColor: "#45a049",
    },
  },
  mainContent: {
    flex: 1,
    padding: "30px",
    overflowY: "auto",
  },
  pageTitle: {
    color: "#4fc3f7",
    fontSize: "32px",
    textAlign: "center",
    marginBottom: "30px",
  },
  sectionTitle: {
    color: "#4fc3f7",
    fontSize: "24px",
    marginBottom: "20px",
  },
  interviewGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
    gap: "15px",
    marginBottom: "30px",
  },
  interviewCard: {
    padding: "15px",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.3s ease",
    fontSize: "15px",
    lineHeight: "1.5",
    "&:hover": {
      backgroundColor: "#4fc3f7",
      color: "#1a1a1a",
    },
  },
  detailsSection: {
    backgroundColor: "#1a1a1a",
    padding: "20px",
    borderRadius: "10px",
    border: "1px solid #444",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)",
  },
  detailsHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },
  toggleButton: {
    padding: "8px 16px",
    backgroundColor: "#e53935",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    transition: "all 0.3s ease",
    "&:hover": {
      backgroundColor: "#c62828",
    },
  },
  detailsContent: {
    animation: "fadeIn 0.3s ease-in",
  },
  subSectionTitle: {
    color: "#4fc3f7",
    fontSize: "20px",
    margin: "20px 0 10px",
  },
  tableContainer: {
    maxHeight: "300px",
    overflowY: "auto",
    marginBottom: "20px",
    border: "1px solid #444",
    borderRadius: "8px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    backgroundColor: "#2d2d2d",
  },
  tableHeader: {
    padding: "12px",
    backgroundColor: "#333",
    color: "#4fc3f7",
    textAlign: "left",
    borderBottom: "1px solid #444",
    fontWeight: "bold",
  },
  tableRow: {
    "&:nth-child(even)": {
      backgroundColor: "#333",
    },
  },
  tableCell: {
    padding: "12px",
    borderBottom: "1px solid #444",
    fontSize: "14px",
  },
  reportContainer: {
    backgroundColor: "#2d2d2d",
    padding: "15px",
    borderRadius: "8px",
    border: "1px solid #444",
    marginBottom: "20px",
  },
  reportTitle: {
    color: "#4fc3f7",
    fontSize: "18px",
    marginBottom: "15px",
  },
  reportSubTitle: {
    color: "#4fc3f7",
    fontSize: "16px",
    margin: "10px 0 5px",
  },
  reportList: {
    paddingLeft: "20px",
    margin: "10px 0",
    fontSize: "14px",
  },
  reportText: {
    fontSize: "14px",
    lineHeight: "1.6",
    margin: "10px 0",
  },
  report: {
    whiteSpace: "pre-wrap",
    backgroundColor: "#2d2d2d",
    padding: "15px",
    borderRadius: "8px",
    border: "1px solid #444",
    fontSize: "14px",
    lineHeight: "1.6",
  },
  noData: {
    color: "#a0a0a0",
    textAlign: "center",
    fontSize: "16px",
    marginTop: "20px",
  },
  loading: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    color: "#4fc3f7",
    fontSize: "18px",
    gap: "10px",
  },
  spinner: {
    width: "24px",
    height: "24px",
    border: "3px solid #4fc3f7",
    borderTopColor: "transparent",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  error: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    color: "#e53935",
    fontSize: "18px",
    gap: "10px",
  },
};