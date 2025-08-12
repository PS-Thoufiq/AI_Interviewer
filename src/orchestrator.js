export class InterviewOrchestrator {
  constructor(topic, resumeSkills = []) {
    this.topic = topic;
    this.resumeSkills = resumeSkills.length > 0 ? resumeSkills : [topic];
    this.currentState = "greeting";
    this.backgroundQuestionsAsked = 0;
    this.maxBackgroundQuestions = 10;
    this.mcqQuestionsAsked = 0;
    this.maxMcqQuestions = 10;
    this.codingQuestionsAsked = 0;
    this.maxCodingQuestions = 4;
    this.currentSkillIndex = 0;
    this.answeredWellCount = 0;
    this.totalAnswers = 0;
    this.experienceLevel = null;
    this.backgroundResponses = [];
    this.nonCodingTopics = [
      "aws",
      "devops",
      "docker",
      "machine learning",
      "data science",
      "cybersecurity",
      "internet of things (iot)",
      "ar/vr development",
      "game development",
      "agile methodologies",
      "microservices architecture",
      "cloud computing",
      "big data technologies",
      "ui/ux design",
      "cross-platform development",
      "serverless architecture",
      "progressive web apps (pwas)"
    ];
  }

  getCurrentState() {
    return this.currentState;
  }

  getCurrentSkill() {
    return this.resumeSkills[this.currentSkillIndex % this.resumeSkills.length];
  }

  evaluateAnswerQuality(answer) {
    if (!answer || answer === "Skipped" || answer.length < 20) {
      return false; // Poor answer
    }
    return true; // Good answer
  }

  determineExperienceLevel() {
    const answerRate = this.totalAnswers > 0 ? this.answeredWellCount / this.totalAnswers : 0;
    if (answerRate >= 0.8) return "4-6"; // Advanced
    if (answerRate >= 0.5) return "2-4"; // Intermediate
    return "0-2"; // Beginner
  }

  isNonCodingTopic() {
    const topicLower = this.topic.toLowerCase().trim();
    const skillsLower = this.resumeSkills.map(skill => skill.toLowerCase().trim());
    return this.nonCodingTopics.some(nonCodingTopic => {
      const nonCodingTopicLower = nonCodingTopic.toLowerCase();
      return topicLower === nonCodingTopicLower || 
             skillsLower.some(skill => skill === nonCodingTopicLower);
    });
  }

  decideNextState(lastResponse, conversationHistory) {
    if (lastResponse && this.currentState !== "greeting") {
      this.totalAnswers++;
      if (this.evaluateAnswerQuality(lastResponse)) {
        this.answeredWellCount++;
      }
      if (this.currentState === "background") {
        this.backgroundResponses.push(lastResponse);
      }
    }

    switch (this.currentState) {
      case "greeting":
        this.currentState = "background";
        return "background";
      case "background":
        this.backgroundQuestionsAsked++;
        this.currentSkillIndex++;
        if (this.backgroundQuestionsAsked < this.maxBackgroundQuestions) {
          this.currentState = "background";
          return "background";
        }
        this.experienceLevel = this.determineExperienceLevel();
        this.currentState = "mcq";
        return "mcq";
      case "mcq":
        this.mcqQuestionsAsked++;
        if (this.mcqQuestionsAsked < this.maxMcqQuestions) {
          this.currentState = "mcq";
          return "mcq";
        }
        if (this.isNonCodingTopic()) {
          console.log("Non-coding topic detected, skipping coding stage");
          this.currentState = "wrapup";
          return "wrapup";
        }
        this.currentState = "coding";
        return "coding";
      case "coding":
        this.codingQuestionsAsked++;
        if (this.codingQuestionsAsked < this.maxCodingQuestions) {
          this.currentState = "coding";
          return "coding";
        }
        this.currentState = "wrapup";
        return "wrapup";
      case "wrapup":
        return null;
      default:
        return "mcq"; // Fallback
    }
  }

  getBoilerplateCode(skill) {
    switch (skill.toLowerCase()) {
      case "python":
        return "def solution():\n    # Your code here\n    pass\n";
      case "java spring boot":
      case "java":
        return "public class Solution {\n    public static void main(String[] args) {\n        // Your code here\n    }\n}\n";
      case "javascript":
      case "node.js express":
      case "react.js":
      case "angular":
      case "vue.js":
      case "svelte":
        return "function solution() {\n    // Your code here\n}\n";
      case "c++":
        return "#include <iostream>\nusing namespace std;\nint main() {\n    // Your code here\n    return 0;\n}\n";
      case "c# .net":
      case "asp.net core":
        return "using System;\nclass Solution {\n    static void Main(string[] args) {\n        // Your code here\n    }\n}\n";
      case "swift":
        return "func solution() {\n    // Your code here\n}\n";
      case "kotlin":
        return "fun main() {\n    // Your code here\n}\n";
      case "flutter":
      case "react native":
        return "void main() {\n    // Your code here\n}\n";
      case "ruby on rails":
      case "ruby":
        return "# Your code here\n";
      case "php":
      case "laravel":
        return "<?php\n// Your code here\n?>\n";
      case "go":
        return "package main\nimport \"fmt\"\nfunc main() {\n    // Your code here\n}\n";
      case "django":
      case "fastapi":
        return "def solution():\n    # Your code here\n    pass\n";
      default:
        return "";
    }
  }
}