import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const technologies = [
  "Service Now","Java Spring Boot", "Python", "Node.js Express", "React.js", "Angular",
  "AWS", "Docker", "Kubernetes", "SQL Databases", "GraphQL",
  "Frontend Development", "Backend Development", "Full Stack Development", "DevOps",
  "Machine Learning", "Data Science", "Mobile Development", "Cybersecurity",
  "Blockchain", "Internet of Things (IoT)", "AR/VR Development", "Game Development",
  "API Development", "Software Testing", "Agile Methodologies", "Microservices Architecture",
  "Cloud Computing", "Big Data Technologies", "UI/UX Design", "Cross-Platform Development",
  "Serverless Architecture", "Progressive Web Apps (PWAs)", "Graph Databases", "NoSQL Databases",
  "WebAssembly", "TypeScript", "Rust", "Go", "Ruby on Rails", "PHP", "C# .NET", "Swift", "Kotlin",
  "Flutter", "React Native", "Vue.js", "Svelte", "ASP.NET Core", "Laravel", "Django", "FastAPI",
  "Spring Cloud", "Apache Kafka", "Redis"
];

export default function TechSelection() {
  const [selectedTech, setSelectedTech] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredTechs, setFilteredTechs] = useState(technologies);
  const [hoveredTech, setHoveredTech] = useState(null);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const filtered = technologies.filter(tech =>
      tech.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredTechs(filtered);
  }, [searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleStartInterview = () => {
    if (!selectedTech) {
      alert("Please select a technology!");
      return;
    }
    navigate("/interview", { state: { topic: selectedTech } });
  };

  const handleTechSelect = (tech) => {
    setSelectedTech(tech);
    setSearchTerm(tech);
    setShowDropdown(false);
  };

  return (
    <div style={{
      maxWidth: 800,
      margin: "2rem auto",
      padding: 20,
      backgroundColor: "#1a1a1a",
      color: "#e0e0e0",
      borderRadius: 10,
      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)",
      textAlign: "center",
      position: "relative"
    }}>
      <h2 style={{
        color: '#4fc3f7',
        marginBottom: '20px',
        fontSize: '28px'
      }}>
        Select Interview Technology
      </h2>
      <p style={{
        color: '#a0a0a0',
        marginBottom: '30px',
        fontSize: '16px'
      }}>
        Choose a technology to start your AI-powered technical interview
      </p>

      <div style={{ position: 'relative', marginBottom: '25px' }}>
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowDropdown(true);
            if (!e.target.value) setSelectedTech("");
          }}
          onFocus={() => setShowDropdown(true)}
          placeholder="Search technologies..."
          style={{
            width: "100%",
            padding: "12px 15px",
            fontSize: "16px",
            borderRadius: "6px",
            backgroundColor: "#2d2d2d",
            color: "#e0e0e0",
            border: "1px solid #444",
            cursor: 'pointer'
          }}
        />

        {showDropdown && (
          <div
            ref={dropdownRef}
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              maxHeight: '300px',
              overflowY: 'auto',
              backgroundColor: '#2d2d2d',
              border: '1px solid #444',
              borderRadius: '0 0 6px 6px',
              zIndex: 100,
              marginTop: '2px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
            }}
          >
            {filteredTechs.length > 0 ? (
              filteredTechs.map((tech) => (
                <div
                  key={tech}
                  onClick={() => handleTechSelect(tech)}
                  onMouseEnter={() => setHoveredTech(tech)}
                  onMouseLeave={() => setHoveredTech(null)}
                  style={{
                    padding: "10px 15px",
                    cursor: "pointer",
                    backgroundColor: hoveredTech === tech ? "#4fc3f7" : "transparent",
                    color: hoveredTech === tech ? "#1a1a1a" : "#e0e0e0",
                    borderBottom: '1px solid #444',
                    textAlign: 'left',
                    transition: 'background-color 0.2s, color 0.2s'
                  }}
                >
                  {tech}
                </div>
              ))
            ) : (
              <div style={{ padding: "10px 15px", color: "#a0a0a0" }}>
                No matching technologies found
              </div>
            )}
          </div>
        )}
      </div>

      <button
        onClick={handleStartInterview}
        style={{
          padding: "12px 30px",
          fontSize: "16px",
          backgroundColor: selectedTech ? "#4fc3f7" : "#333",
          color: selectedTech ? "#1a1a1a" : "#666",
          border: "none",
          borderRadius: "6px",
          cursor: selectedTech ? "pointer" : "not-allowed",
          fontWeight: "bold",
          transition: "all 0.2s"
        }}
        disabled={!selectedTech}
      >
        Start Interview
      </button>

      <div style={{
        marginTop: '40px',
        color: '#666',
        fontSize: '14px'
      }}>
        <p>Select your preferred technology to begin a realistic technical interview</p>
        <p>Practice your skills and get AI-powered feedback</p>
      </div>
    </div>
  );
}
