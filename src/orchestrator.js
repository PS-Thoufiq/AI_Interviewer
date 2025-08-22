export class InterviewOrchestrator {
  constructor(topic, resumeSkills = []) {
    this.topic = topic;
    this.resumeSkills = resumeSkills.length > 0 ? resumeSkills : [topic];
    this.currentState = "greeting";
    this.backgroundQuestionsAsked = 0;
    this.maxBackgroundQuestions = 2;
    this.knowledgeQuestionsAsked = 0;
    this.maxKnowledgeQuestions = 2;
    this.scenarioQuestionsAsked = 0;
    this.maxScenarioQuestions = 6;
    this.currentSkillIndex = 0;
    this.experienceLevel = null;
    this.backgroundResponses = [];
    this.technicalScores = [];
    this.commScores = [];
    this.evaluations = [];
  }

  getCurrentState() {
    return this.currentState;
  }

  getCurrentSkill() {
    return this.resumeSkills[this.currentSkillIndex % this.resumeSkills.length];
  }

  addAnswerScore(scores, evaluation) {
    this.technicalScores.push(scores.technical);
    this.commScores.push(scores.comm);
    this.evaluations.push(evaluation);
  }

  computeAverages() {
    const count = this.technicalScores.length;
    if (count === 0) return { avgTech: 0, avgComm: 0, finalScore: 0 };
    const avgTech = this.technicalScores.reduce((a, b) => a + b, 0) / count;
    const avgComm = this.commScores.reduce((a, b) => a + b, 0) / count;
    const finalScore = 0.7 * avgTech + 0.3 * avgComm;
    return { avgTech, avgComm, finalScore };
  }

  determineFollowUpType(scores) {
    const avg = (scores.technical + scores.comm) / 2;
    if (scores.comm < 1.5) return "clarify";
    if (avg < 1.5) return "probe";
    if (avg > 2.5) return "deepen";
    return null;
  }

  determineExperienceLevel() {
    const responseCount = this.backgroundResponses.length;
    if (responseCount >= 4) return "4-6"; // Advanced
    if (responseCount >= 2) return "2-4"; // Intermediate
    return "0-2"; // Beginner
  }

  decideNextState(lastResponse) {
    if (lastResponse && this.currentState !== "greeting") {
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
        this.currentState = "knowledge";
        return "knowledge";
      case "knowledge":
        this.knowledgeQuestionsAsked++;
        if (this.knowledgeQuestionsAsked < this.maxKnowledgeQuestions) {
          this.currentState = "knowledge";
          return "knowledge";
        }
        this.currentState = "scenario";
        return "scenario";
      case "scenario":
        this.scenarioQuestionsAsked++;
        if (this.scenarioQuestionsAsked < this.maxScenarioQuestions) {
          this.currentState = "scenario";
          return "scenario";
        }
        this.currentState = "wrapup";
        return "wrapup";
      case "wrapup":
        return null;
      default:
        return "knowledge"; // Fallback
    }
  }
}
