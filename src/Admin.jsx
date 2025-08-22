import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";

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
      setSelectedInterview(data);
      setShowDetails(true);
    } catch (err) {
      setError(err.message);
    }
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
                    {/* <h5 style={styles.reportTitle}>Candidate Feedback Report</h5> */}
                    <ReactMarkdown
                      components={{
                        h1: ({ children }) => <h1 style={styles.reportTitle}>{children}</h1>,
                        h2: ({ children }) => <h2 style={styles.reportSubTitle}>{children}</h2>,
                        p: ({ children }) => <p style={styles.reportText}>{children}</p>,
                        ul: ({ children }) => <ul style={styles.reportList}>{children}</ul>,
                        li: ({ children }) => <li>{children}</li>,
                      }}
                    >
                      {selectedInterview.userReport || "No user report available."}
                    </ReactMarkdown>
                  </div>

                  <h4 style={styles.subSectionTitle}>Client Report</h4>
                  <div style={styles.reportContainer}>
                    {/* <h5 style={styles.reportTitle}>Recruiter Report</h5> */}
                    <ReactMarkdown
                      components={{
                        h1: ({ children }) => <h1 style={styles.reportTitle}>{children}</h1>,
                        h2: ({ children }) => <h2 style={styles.reportSubTitle}>{children}</h2>,
                        p: ({ children }) => <p style={styles.reportText}>{children}</p>,
                        ul: ({ children }) => <ul style={styles.reportList}>{children}</ul>,
                        li: ({ children }) => <li>{children}</li>,
                      }}
                    >
                      {selectedInterview.clientReport || "No client report available."}
                    </ReactMarkdown>
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