export class InterviewOrchestrator {
  constructor(topic, resumeSkills = []) {
    this.topic = topic;
    this.resumeSkills = resumeSkills.length > 0 ? resumeSkills : [topic];
    this.currentState = "greeting";
    this.transitions = {
      greeting: { next: "background" },
      background: { next: "technical" },
      technical: { next: "followup", alternate: "technical" },
      followup: { next: "mcq", alternate: "technical" },
      mcq: { next: "coding", alternate: "mcq" },
      coding: { next: "behavioral", alternate: "coding" },
      behavioral: { next: "wrapup" },
      wrapup: { next: null }
    };
    this.backgroundQuestionsAsked = 0;
    this.maxBackgroundQuestions = Math.floor(Math.random() * 6) + 10; // 10–15
    this.technicalQuestionsAsked = 0;
    this.maxTechnicalQuestions = 0; // No technical questions (replaced by MCQ/coding)
    this.mcqQuestionsAsked = 0;
    this.maxMcqQuestions = 10;
    this.codingQuestionsAsked = 0;
    this.maxCodingQuestions = this.isCodingTopic() ? Math.floor(Math.random() * 3) + 3 : 0; // 3–5
    this.followupCount = 0;
    this.maxFollowups = 2;
    this.behavioralQuestionsAsked = 0;
    this.maxBehavioralQuestions = 1;
    this.currentSkillIndex = 0;
    this.answeredWellCount = 0;
    this.totalAnswers = 0;
    this.experienceLevel = null; // Determined after background questions
    this.backgroundResponses = [];
  }

  isCodingTopic() {
    const currentSkill = this.getCurrentSkill();
    return ["Java Spring Boot", "Python", "Node.js Express", "React.js", "Angular", "TypeScript", "JavaScript", "Java", "C++", "C# .NET", "Swift", "Kotlin", "Flutter", "React Native", "Vue.js", "Svelte", "ASP.NET Core", "Laravel", "Django", "FastAPI", "Spring Cloud", "Go", "Ruby on Rails", "PHP"].includes(currentSkill);
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

  decideNextState(lastResponse, conversationHistory) {
    const currentTransition = this.transitions[this.currentState];

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
        return currentTransition.next; // Move to background
      case "background":
        this.backgroundQuestionsAsked++;
        this.currentSkillIndex++;
        if (this.backgroundQuestionsAsked < this.maxBackgroundQuestions) {
          return currentTransition.next; // Continue background
        }
        this.experienceLevel = this.determineExperienceLevel(); // Set level after background
        return "technical"; // Move to technical (will transition to MCQ)
      case "technical":
        this.technicalQuestionsAsked++;
        if (lastResponse && lastResponse.trim() !== "Skipped" && this.followupCount < this.maxFollowups) {
          return currentTransition.next; // Ask follow-up
        }
        this.currentSkillIndex++;
        return "mcq"; // Move to MCQ
      case "followup":
        this.followupCount++;
        return currentTransition.next; // Move to MCQ
      case "mcq":
        this.mcqQuestionsAsked++;
        if (this.mcqQuestionsAsked < this.maxMcqQuestions) {
          return currentTransition.alternate; // Continue MCQs
        }
        return currentTransition.next; // Move to coding
      case "coding":
        this.codingQuestionsAsked++;
        if (this.codingQuestionsAsked < this.maxCodingQuestions) {
          return currentTransition.alternate; // Continue coding
        }
        return currentTransition.next; // Move to behavioral
      case "behavioral":
        this.behavioralQuestionsAsked++;
        if (this.behavioralQuestionsAsked < this.maxBehavioralQuestions) {
          return currentTransition.alternate; // Stay in behavioral
        }
        return currentTransition.next; // Move to wrap-up
      case "wrapup":
        return null; // End interview
      default:
        return "mcq"; // Fallback
    }
  }

  getBoilerplateCode(skill) {
    switch (skill.toLowerCase()) {
      case "python":
        return "```python\ndef solution():\n    # Your code here\n    pass\n```";
      case "java spring boot":
      case "java":
        return "```java\npublic class Solution {\n    public static void main(String[] args) {\n        // Your code here\n    }\n}\n```";
      case "javascript":
      case "node.js express":
      case "react.js":
      case "angular":
      case "vue.js":
      case "svelte":
        return "```javascript\nfunction solution() {\n    // Your code here\n}\n```";
      case "c++":
        return "```cpp\n#include <iostream>\nusing namespace std;\nint main() {\n    // Your code here\n    return 0;\n}\n```";
      case "c# .net":
      case "asp.net core":
        return "```csharp\nusing System;\nclass Solution {\n    static void Main(string[] args) {\n        // Your code here\n    }\n}\n```";
      case "swift":
        return "```swift\nfunc solution() {\n    // Your code here\n}\n```";
      case "kotlin":
        return "```kotlin\nfun main() {\n    // Your code here\n}\n```";
      case "flutter":
      case "react native":
        return "```dart\nvoid main() {\n    // Your code here\n}\n```";
      case "ruby on rails":
      case "ruby":
        return "```ruby\n# Your code here\n```";
      case "php":
      case "laravel":
        return "```php\n<?php\n// Your code here\n?> \n```";
      case "go":
        return "```go\npackage main\nimport \"fmt\"\nfunc main() {\n    // Your code here\n}\n```";
      case "django":
      case "fastapi":
        return "```python\ndef solution():\n    # Your code here\n    pass\n```";
      default:
        return "";
    }
  }

  getStagePrompt(stage) {
    const currentSkill = this.getCurrentSkill();
    const experienceRange = this.experienceLevel || "0-2"; // Default to beginner until determined
    switch (stage) {
      case "greeting":
        return "Provide a friendly greeting to start the interview.";
      case "background":
        return `Ask a question about the candidate's background, projects, or experience with ${currentSkill}. Focus on understanding their expertise level.`;
      case "technical":
        return `Ask a follow-up question about ${currentSkill} based on the candidate's last response.`;
      case "followup":
        return `Ask a follow-up question based on the candidate's last response about ${currentSkill}.`;
      case "mcq":
        return `Ask an MCQ question about ${currentSkill} suitable for ${experienceRange} experience. Format as: "Question: [text]\nOptions:\nA) [Option1]\nB) [Option2]\nC) [Option3]\nD) [Option4]".`;
      case "coding":
        return `Ask a coding question about ${currentSkill} suitable for ${experienceRange} experience. Format as: "Solve this problem: [description]. Provide a solution in ${currentSkill}.\n${this.getBoilerplateCode(currentSkill)}"`;
      case "behavioral":
        return `Ask a behavioral question related to ${currentSkill}.`;
      case "wrapup":
        return "Provide a wrap-up message to conclude the interview.";
      default:
        return "Ask a relevant question.";
    }
  }
}