import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, CheckCircle, AlertTriangle, Brain, Trophy, Target, Award, Clock, Download, Sparkles } from "lucide-react";
import { QuestionResult, Question } from "./StudyAssistant";
import { downloadPDF } from "@/utils/pdfUtils";
import { saveStudyHistory } from "@/services/studyHistoryService";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/config/firebase";
import { toast } from "sonner";

interface ModernQuizModeProps {
  result: QuestionResult;
  onReset: () => void;
  onBackToAnalysis: () => void;
  difficulty: string;
  outputLanguage: "english" | "tamil";
}

interface UserAnswer {
  questionIndex: number;
  selectedOption: string;
}

interface QuizResult {
  score: number;
  totalQuestions: number;
  percentage: number;
  answers: {
    question: Question;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    questionIndex: number;
  }[];
}

const ModernQuizMode = ({ result, onReset, onBackToAnalysis, difficulty, outputLanguage }: ModernQuizModeProps) => {
  const [user] = useAuthState(auth);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [startTime] = useState<Date>(new Date());

  const questions = result.questions || [];
  const currentQuestion = questions[currentQuestionIndex];
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

  const getDifficultyColor = (diff: string) => {
    const colors = {
      'easy': 'from-green-500 to-emerald-600',
      'medium': 'from-yellow-500 to-orange-600', 
      'hard': 'from-red-500 to-pink-600',
      'very-hard': 'from-purple-500 to-indigo-600'
    };
    return colors[diff as keyof typeof colors] || 'from-gray-500 to-gray-600';
  };

  const getQuestionTypeIcon = (type: string) => {
    switch (type) {
      case 'mcq':
        return '📝';
      case 'assertion_reason':
        return '🔗';
      default:
        return '❓';
    }
  };

  const handleAnswerSelect = (value: string) => {
    setSelectedOption(value);
  };

  const handleNextQuestion = () => {
    if (!selectedOption.trim()) {
      toast.error("Please select an answer before proceeding");
      return;
    }

    const newAnswer: UserAnswer = {
      questionIndex: currentQuestionIndex,
      selectedOption: selectedOption
    };

    const updatedAnswers = [...userAnswers.filter(a => a.questionIndex !== currentQuestionIndex), newAnswer];
    setUserAnswers(updatedAnswers);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      const savedAnswer = updatedAnswers.find(a => a.questionIndex === currentQuestionIndex + 1);
      setSelectedOption(savedAnswer?.selectedOption || "");
    } else {
      calculateResults(updatedAnswers);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      const savedAnswer = userAnswers.find(a => a.questionIndex === currentQuestionIndex - 1);
      setSelectedOption(savedAnswer?.selectedOption || "");
    }
  };

  const calculateResults = (answers: UserAnswer[]) => {
    const results = answers.map(answer => {
      const question = questions[answer.questionIndex];
      const isCorrect = answer.selectedOption.toLowerCase().trim() === question.answer?.toLowerCase().trim();
      
      return {
        question,
        userAnswer: answer.selectedOption,
        correctAnswer: question.answer || "",
        isCorrect,
        questionIndex: answer.questionIndex
      };
    });

    const score = results.filter(r => r.isCorrect).length;
    const percentage = Math.round((score / questions.length) * 100);

    const quizResultData = {
      score,
      totalQuestions: questions.length,
      percentage,
      answers: results
    };

    setQuizResult(quizResultData);

    // Save quiz results to study history
    if (user) {
      saveStudyHistory(
        user.uid,
        "quiz",
        quizResultData,
        {
          fileName: `Quiz - ${difficulty.toUpperCase()}`,
          difficulty,
          language: outputLanguage,
          score,
          totalQuestions: questions.length,
          percentage,
          quizAnswers: results
        }
      ).catch(error => {
        console.error("Failed to save quiz results:", error);
      });
    }

    setQuizCompleted(true);
    toast.success("🎉 Quiz completed successfully!");
  };

  const getPerformanceMessage = (percentage: number) => {
    if (percentage >= 90) return "Outstanding! You're mastering TNPSC concepts! 🏆";
    if (percentage >= 80) return "Excellent work! You're well prepared! 🌟";
    if (percentage >= 70) return "Great job! Keep up the good work! 👏";
    if (percentage >= 60) return "Good effort! Review and improve! 📚";
    if (percentage >= 40) return "Fair performance. More practice needed! 💪";
    return "Keep studying! You'll improve with practice! 📖";
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-blue-600';
    if (percentage >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const handleDownloadResults = async () => {
    try {
      if (!quizResult) {
        toast.error("No quiz results available to download");
        return;
      }

      await downloadPDF({
        title: `TNPSC Quiz Results - ${difficulty.toUpperCase()}`,
        content: quizResult,
        type: 'quiz-results'
      });
      toast.success("Quiz results downloaded successfully!");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download results. Please try again.");
    }
  };

  const getTimeTaken = () => {
    const endTime = new Date();
    const diffMs = endTime.getTime() - startTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffSecs = Math.floor((diffMs % 60000) / 1000);
    return `${diffMins}m ${diffSecs}s`;
  };

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="glass-card p-8 max-w-md mx-auto text-center">
          <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-800 mb-4">No Questions Available</h3>
          <p className="text-gray-600 mb-6">
            Unable to generate quiz questions from the uploaded content. Please try uploading different files.
          </p>
          <Button onClick={onReset} className="btn-primary">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Upload New Files
          </Button>
        </Card>
      </div>
    );
  }

  if (quizCompleted && quizResult) {
    return (
      <div className="min-h-screen p-4">
        <div className="container mx-auto max-w-4xl space-y-6">
          {/* Results Header */}
          <Card className="glass-card p-8 text-center animate-fadeInScale hover-lift">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="p-4 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 shadow-elegant pulse-glow">
                <Trophy className="h-10 w-10 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold gradient-text">
                  Quiz Complete!
                </h1>
                <p className="text-gray-600 mt-2">TNPSC Practice Results</p>
              </div>
            </div>

            <div className="glass-card p-8 mb-6">
              <div className={`text-7xl font-bold mb-4 ${getScoreColor(quizResult.percentage)}`}>
                {quizResult.percentage}%
              </div>
              <div className="text-xl text-gray-700 mb-3">
                {quizResult.score} out of {quizResult.totalQuestions} questions correct
              </div>
              <div className="text-lg font-medium text-gray-600 glass-card p-4 mb-4">
                {getPerformanceMessage(quizResult.percentage)}
              </div>

              <div className="flex justify-center gap-6 text-sm text-gray-600 stagger-animation">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>Time: {getTimeTaken()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  <span>Difficulty: {difficulty.toUpperCase()}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={handleDownloadResults} 
                className="btn-secondary"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Results
              </Button>
              <Button 
                onClick={onBackToAnalysis} 
                className="btn-secondary"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Analysis
              </Button>
              <Button 
                onClick={onReset} 
                className="btn-primary"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                New Quiz
              </Button>
            </div>
          </Card>

          {/* Answer Review */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold gradient-text flex items-center gap-2">
              <Target className="h-6 w-6 text-blue-600" />
              Answer Review
            </h2>
            
            {quizResult.answers.map((answer, index) => (
              <Card key={index} className={`glass-card p-6 hover-lift animate-fadeInUp ${
                answer.isCorrect 
                  ? 'border-l-4 border-l-green-500' 
                  : 'border-l-4 border-l-red-500'
              }`} style={{animationDelay: `${index * 0.1}s`}}>
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${answer.isCorrect ? 'bg-green-100' : 'bg-red-100'}`}>
                        {answer.isCorrect ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                      <span className="text-lg font-semibold text-gray-800">
                        Question {index + 1} {getQuestionTypeIcon(answer.question.type)}
                      </span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Badge className={`bg-gradient-to-r ${getDifficultyColor(answer.question.difficulty)} text-white`}>
                        {answer.question.difficulty.toUpperCase()}
                      </Badge>
                      <Badge className="badge-elegant bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border-blue-200">
                        {answer.question.tnpscGroup}
                      </Badge>
                      <Badge className="badge-elegant bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 border-purple-200">
                        {answer.question.type.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="glass-card p-4">
                    <p className="text-gray-800 text-lg leading-relaxed">{answer.question.question}</p>
                  </div>
                  
                  <div className="space-y-3">
                    <div className={`p-4 rounded-xl ${
                      answer.isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-700">Your Answer:</span>
                        <span className={`font-medium ${answer.isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                          {answer.userAnswer}
                        </span>
                      </div>
                    </div>
                    
                    {!answer.isCorrect && (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-700">Correct Answer:</span>
                          <span className="font-medium text-green-700">{answer.correctAnswer}</span>
                        </div>
                      </div>
                    )}

                    {answer.question.explanation && (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                        <div className="flex items-start gap-2">
                          <span className="font-semibold text-gray-700">Explanation:</span>
                          <span className="text-blue-700">{answer.question.explanation}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <div className="container mx-auto max-w-4xl space-y-6">
        {/* Quiz Header */}
        <Card className="glass-card p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Button
                onClick={onBackToAnalysis}
                variant="ghost"
                className="text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Analysis
              </Button>
              
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 shadow-lg`}>
                  <Brain className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-800">TNPSC Smart Quiz</h1>
                  <p className="text-gray-600 text-sm">Question {currentQuestionIndex + 1} of {questions.length}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Progress</span>
                <span>{Math.round(progress)}% Complete</span>
              </div>
              <div className="progress-elegant">
                <div className="progress-fill" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          </div>
        </Card>

        {/* Current Question */}
        <Card className="glass-card p-8">
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getQuestionTypeIcon(currentQuestion?.type)}</span>
                  <h2 className="text-2xl font-bold text-gray-800">
                    Question {currentQuestionIndex + 1}
                  </h2>
                </div>
                <Badge className={`bg-gradient-to-r ${getDifficultyColor(difficulty)} text-white`}>
                  {difficulty.replace('-', ' ').toUpperCase()}
                </Badge>
              </div>
              
              <Badge variant="outline" className="text-sm">
                {currentQuestion?.tnpscGroup || "TNPSC"}
              </Badge>
            </div>
            
            <div className="glass-card p-6">
              <p className="text-gray-800 text-lg leading-relaxed">{currentQuestion?.question}</p>
            </div>
            
            {currentQuestion?.options && Array.isArray(currentQuestion.options) && currentQuestion.options.length > 0 && (
              <RadioGroup value={selectedOption} onValueChange={handleAnswerSelect}>
                <div className="space-y-4">
                  {currentQuestion.options.map((option, index) => (
                    <div key={index} className="group">
                      <div className={`quiz-option ${selectedOption === option ? 'selected' : ''}`}>
                        <div className="flex items-center space-x-4">
                          <RadioGroupItem value={option} id={`option-${index}`} className="w-5 h-5" />
                          <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                            <div className="flex items-start gap-3">
                              <span className={`font-bold text-lg px-3 py-1 rounded-full ${
                                selectedOption === option 
                                  ? 'bg-blue-500 text-white' 
                                  : 'bg-gray-200 text-gray-700'
                              }`}>
                                {String.fromCharCode(65 + index)}
                              </span>
                              <span className="text-gray-800 text-lg leading-relaxed">{option}</span>
                            </div>
                          </Label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            )}
          </div>

          <div className="flex justify-between items-center pt-6 border-t border-gray-200 mt-8">
            <Button
              onClick={handlePreviousQuestion}
              variant="outline"
              disabled={currentQuestionIndex === 0}
              className="btn-secondary"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            <div className="text-sm text-gray-600 text-center">
              <span className="font-medium">{currentQuestionIndex + 1}</span> of <span className="font-medium">{questions.length}</span>
            </div>

            <Button
              onClick={handleNextQuestion}
              className="btn-primary"
            >
              {currentQuestionIndex === questions.length - 1 ? (
                <>
                  <Award className="h-4 w-4 mr-2" />
                  Submit Quiz
                </>
              ) : (
                <>
                  Next Question
                  <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ModernQuizMode;