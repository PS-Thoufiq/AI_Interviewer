// TechSelection.js (unchanged)
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import * as pdfjsLib from "pdfjs-dist/build/pdf";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min?url";

// Set worker path correctly
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const technologies = [
"python","AWS","java","c","c++","javascript","Spring boot","Junit","React","Node.js","SQL"
];

export default function TechSelection() {
  const [selectedTech, setSelectedTech] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredTechs, setFilteredTechs] = useState(technologies);
  const [hoveredTech, setHoveredTech] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeSkills, setResumeSkills] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

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

 
  const extractTextFromPDF = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      
      // Load PDF document
      const pdf = await pdfjsLib.getDocument({
        data: arrayBuffer,
        // Enable worker if available, fallback to main thread if not
        disableWorker: false
      }).promise;
      
      let textContent = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const text = await page.getTextContent();
        textContent += text.items.map(item => item.str).join(" ") + " ";
      }
      
      return textContent;
    } catch (err) {
      console.error("Error extracting text from PDF:", err);
      throw new Error("Failed to extract text from PDF");
    }
  };

  const extractSkillsFromText = async (text) => {
    try {
      // Mock implementation - replace with your actual API call
      const mockSkills = technologies.filter(tech => 
        text.toLowerCase().includes(tech.toLowerCase())
      );
      
      return mockSkills.length > 0 ? mockSkills : ["General"];
    } catch (err) {
      console.error("Error extracting skills:", err);
      throw new Error("Failed to extract skills from text");
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.type !== "application/pdf") {
      setError("Please upload a valid PDF file.");
      return;
    }

    setResumeFile(file);
    setUploading(true);
    setError("");
    setResumeSkills([]);

    try {
      const textContent = await extractTextFromPDF(file);
      const skills = await extractSkillsFromText(textContent);
      setResumeSkills(skills);
    } catch (err) {
      console.error("Error processing resume:", err);
      setError(err.message || "Failed to process resume. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleStartInterview = () => {
    if (!selectedTech && resumeSkills.length === 0) {
      setError("Please select a technology or upload a resume with valid skills!");
      return;
    }
    navigate("/interview", {
      state: {
        topic: selectedTech || resumeSkills[0] || "General",
        resumeSkills: resumeSkills.length > 0 ? resumeSkills : selectedTech ? [selectedTech] : []
      }
    });
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
        Select Interview Technology or Upload Resume
      </h2>
      <p style={{
        color: '#a0a0a0',
        marginBottom: '30px',
        fontSize: '16px'
      }}>
        Choose a technology or upload your resume to start an AI-powered technical interview
      </p>

      <div style={{ marginBottom: '25px' }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <button
          onClick={() => fileInputRef.current.click()}
          disabled={uploading}
          style={{
            padding: "12px 30px",
            fontSize: "16px",
            backgroundColor: uploading ? "#333" : "#4fc3f7",
            color: uploading ? "#666" : "#1a1a1a",
            border: "none",
            borderRadius: "6px",
            cursor: uploading ? "not-allowed" : "pointer",
            fontWeight: "bold",
            marginBottom: "15px",
            transition: "all 0.2s"
          }}
        >
          {uploading ? "Processing Resume..." : "Upload Resume"}
        </button>
        {resumeSkills.length > 0 && (
          <div style={{ marginTop: '10px', color: '#4fc3f7' }}>
            Detected Skills: {resumeSkills.join(", ")}
          </div>
        )}
        {error && (
          <div style={{ color: "#e53935", marginTop: "10px" }}>
            {error}
          </div>
        )}
      </div>

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
          backgroundColor: (selectedTech || resumeSkills.length > 0) ? "#4fc3f7" : "#333",
          color: (selectedTech || resumeSkills.length > 0) ? "#1a1a1a" : "#666",
          border: "none",
          borderRadius: "6px",
          cursor: (selectedTech || resumeSkills.length > 0) ? "pointer" : "not-allowed",
          fontWeight: "bold",
          transition: "all 0.2s"
        }}
        disabled={!selectedTech && resumeSkills.length === 0}
      >
        Start Interview
      </button>

      <div style={{
        marginTop: '40px',
        color: '#666',
        fontSize: '14px'
      }}>
        <p>Select a technology or upload your resume to begin a realistic technical interview</p>
        <p>Practice your skills and get AI-powered feedback</p>
      </div>
    </div>
  );
}