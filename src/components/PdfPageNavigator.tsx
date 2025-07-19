import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ChevronLeft, 
  ChevronRight, 
  FileText, 
  Brain, 
  Zap, 
  Download, 
  ArrowLeft,
  BookOpen,
  Target,
  Lightbulb,
  Clock,
  CheckCircle,
  Award
} from "lucide-react";
import { analyzeIndividualPage } from "@/services/geminiService";
import { extractPageRangeFromOcr } from "@/utils/pdfReader";
import { downloadPDF } from "@/utils/pdfUtils";
import { toast } from "sonner";

interface PageAnalysis {
  pageNumber: number;
  keyPoints: string[];
  studyPoints: Array<{
    title: string;
    description: string;
    importance: "high" | "medium" | "low";
    tnpscRelevance: string;
  }>;
  summary: string;
  tnpscRelevance: string;
  isAnalyzed: boolean;
}

interface PdfPageNavigatorProps {
  file: File;
  totalPages: number;
  fullText: string;
  outputLanguage: "english" | "tamil";
  onReset: () => void;
  onStartQuiz: (pageRange: { start: number; end: number }, difficulty: string) => void;
}

const PdfPageNavigator = ({ 
  file, 
  totalPages, 
  fullText, 
  outputLanguage, 
  onReset,
  onStartQuiz 
}: PdfPageNavigatorProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageAnalyses, setPageAnalyses] = useState<Map<number, PageAnalysis>>(new Map());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [quizStartPage, setQuizStartPage] = useState(1);
  const [quizEndPage, setQuizEndPage] = useState(Math.min(5, totalPages));
  const [difficulty, setDifficulty] = useState("medium");

  const currentAnalysis = pageAnalyses.get(currentPage);
  const analyzedPages = Array.from(pageAnalyses.values()).filter(p => p.isAnalyzed).length;
  const progressPercentage = (analyzedPages / totalPages) * 100;

  const analyzePage = async (pageNumber: number) => {
    if (pageAnalyses.has(pageNumber) && pageAnalyses.get(pageNumber)?.isAnalyzed) {
      return;
    }

    setIsAnalyzing(true);
    try {
      const pageContent = extractPageRangeFromOcr(fullText, pageNumber, pageNumber);
      
      if (!pageContent.trim()) {
        toast.error(`No content found on page ${pageNumber}`);
        return;
      }

      const analysis = await analyzeIndividualPage(pageContent, pageNumber, outputLanguage);
      
      const pageAnalysis: PageAnalysis = {
        ...analysis,
        isAnalyzed: true
      };

      setPageAnalyses(prev => new Map(prev.set(pageNumber, pageAnalysis)));
      toast.success(`Page ${pageNumber} analyzed successfully!`);
    } catch (error) {
      console.error(`Error analyzing page ${pageNumber}:`, error);
      toast.error(`Failed to analyze page ${pageNumber}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const navigateToPage = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
      if (!pageAnalyses.has(pageNumber) || !pageAnalyses.get(pageNumber)?.isAnalyzed) {
        analyzePage(pageNumber);
      }
    }
  };

  const analyzeAllPages = async () => {
    setIsAnalyzing(true);
    try {
      for (let i = 1; i <= totalPages; i++) {
        if (!pageAnalyses.has(i) || !pageAnalyses.get(i)?.isAnalyzed) {
          await analyzePage(i);
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      toast.success("All pages analyzed successfully!");
    } catch (error) {
      toast.error("Failed to analyze all pages");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDownloadPage = async () => {
    if (!currentAnalysis) {
      toast.error("No analysis available for this page");
      return;
    }

    try {
      await downloadPDF({
        title: `Page ${currentPage} Analysis - ${file.name}`,
        content: [currentAnalysis],
        type: 'analysis'
      });
      toast.success("Page analysis downloaded!");
    } catch (error) {
      toast.error("Failed to download analysis");
    }
  };

  const handleStartQuiz = () => {
    onStartQuiz({ start: quizStartPage, end: quizEndPage }, difficulty);
  };

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case "high": return "bg-red-100 text-red-700 border-red-200";
      case "medium": return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "low": return "bg-green-100 text-green-700 border-green-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  // Auto-analyze first page on mount
  useEffect(() => {
    if (currentPage === 1) {
      analyzePage(1);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="container mx-auto px-3 py-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Header */}
          <Card className="p-4 bg-white/90 backdrop-blur-sm shadow-xl border-0">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Button
                  onClick={onReset}
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 hover:text-gray-800"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-800">
                      {file.name.length > 20 ? file.name.substring(0, 20) + "..." : file.name}
                    </div>
                    <div className="text-xs text-gray-600">{totalPages} pages</div>
                  </div>
                </div>
              </div>

              {/* Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Analysis Progress</span>
                  <span>{analyzedPages}/{totalPages} pages</span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={analyzeAllPages}
                  disabled={isAnalyzing}
                  size="sm"
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-xs"
                >
                  {isAnalyzing ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Brain className="h-3 w-3 mr-2" />
                      Analyze All
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={handleDownloadPage}
                  variant="outline"
                  size="sm"
                  disabled={!currentAnalysis}
                  className="text-xs"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Save
                </Button>
              </div>
            </div>
          </Card>

          {/* Page Navigation */}
          <Card className="p-4 bg-white/90 backdrop-blur-sm shadow-lg border-0">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                  Page {currentPage}
                </h3>
                
                <div className="flex items-center gap-1">
                  <Button
                    onClick={() => navigateToPage(currentPage - 1)}
                    disabled={currentPage === 1 || isAnalyzing}
                    variant="outline"
                    size="sm"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <div className="px-3 py-1 bg-gray-100 rounded text-sm font-medium min-w-[60px] text-center">
                    {currentPage}/{totalPages}
                  </div>
                  
                  <Button
                    onClick={() => navigateToPage(currentPage + 1)}
                    disabled={currentPage === totalPages || isAnalyzing}
                    variant="outline"
                    size="sm"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Page Jump */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Jump to:</span>
                <input
                  type="number"
                  min="1"
                  max={totalPages}
                  value={currentPage}
                  onChange={(e) => navigateToPage(parseInt(e.target.value) || 1)}
                  className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center"
                />
                <Button
                  onClick={() => analyzePage(currentPage)}
                  disabled={isAnalyzing || (currentAnalysis?.isAnalyzed)}
                  size="sm"
                  variant="outline"
                  className="text-xs"
                >
                  {currentAnalysis?.isAnalyzed ? (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1 text-green-600" />
                      Done
                    </>
                  ) : (
                    <>
                      <Brain className="h-3 w-3 mr-1" />
                      Analyze
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>

          {/* Page Analysis Results */}
          {currentAnalysis && currentAnalysis.isAnalyzed ? (
            <div className="space-y-4">
              {/* Summary */}
              <Card className="p-4 bg-white/90 backdrop-blur-sm shadow-lg border-0">
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                    <Target className="h-4 w-4 text-green-600" />
                    Page Summary
                  </h4>
                  <p className="text-gray-700 text-sm leading-relaxed bg-gray-50 p-3 rounded-lg">
                    {currentAnalysis.summary}
                  </p>
                </div>
              </Card>

              {/* TNPSC Relevance */}
              <Card className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 shadow-lg border-0">
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                    <Award className="h-4 w-4 text-purple-600" />
                    TNPSC Relevance
                  </h4>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    {currentAnalysis.tnpscRelevance}
                  </p>
                </div>
              </Card>

              {/* Key Points */}
              <Card className="p-4 bg-white/90 backdrop-blur-sm shadow-lg border-0">
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-yellow-600" />
                    Key Points ({currentAnalysis.keyPoints.length})
                  </h4>
                  <div className="space-y-2">
                    {currentAnalysis.keyPoints.map((point, index) => (
                      <div key={index} className="flex items-start gap-2 p-2 bg-yellow-50 rounded-lg">
                        <div className="w-5 h-5 bg-yellow-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                          {index + 1}
                        </div>
                        <p className="text-gray-700 text-sm leading-relaxed">{point}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Study Points */}
              {currentAnalysis.studyPoints.length > 0 && (
                <Card className="p-4 bg-white/90 backdrop-blur-sm shadow-lg border-0">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-blue-600" />
                      Detailed Study Points ({currentAnalysis.studyPoints.length})
                    </h4>
                    <div className="space-y-3">
                      {currentAnalysis.studyPoints.map((point, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-3">
                          <div className="flex items-start justify-between mb-2">
                            <h5 className="font-medium text-gray-800 text-sm">{point.title}</h5>
                            <Badge className={`${getImportanceColor(point.importance)} border text-xs`}>
                              {point.importance}
                            </Badge>
                          </div>
                          <p className="text-gray-600 text-sm mb-2 leading-relaxed">{point.description}</p>
                          {point.tnpscRelevance && (
                            <div className="bg-blue-50 p-2 rounded border-l-2 border-blue-400">
                              <p className="text-xs text-blue-700 font-medium mb-1">TNPSC Context:</p>
                              <p className="text-xs text-blue-600 leading-relaxed">{point.tnpscRelevance}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              )}
            </div>
          ) : (
            <Card className="p-8 bg-white/90 backdrop-blur-sm shadow-lg border-0">
              <div className="text-center">
                {isAnalyzing ? (
                  <div className="space-y-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-600">Analyzing page {currentPage}...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Brain className="h-12 w-12 text-gray-400 mx-auto" />
                    <p className="text-gray-600">Click "Analyze" to get insights for this page</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Quiz Generation */}
          <Card className="p-4 bg-gradient-to-r from-green-50 to-blue-50 shadow-lg border-0">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Zap className="h-5 w-5 text-green-600" />
                Generate Practice Quiz
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From Page</label>
                  <input
                    type="number"
                    min="1"
                    max={totalPages}
                    value={quizStartPage}
                    onChange={(e) => setQuizStartPage(Math.max(1, Math.min(totalPages, parseInt(e.target.value) || 1)))}
                    className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To Page</label>
                  <input
                    type="number"
                    min={quizStartPage}
                    max={totalPages}
                    value={quizEndPage}
                    onChange={(e) => setQuizEndPage(Math.max(quizStartPage, Math.min(totalPages, parseInt(e.target.value) || quizStartPage)))}
                    className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="easy">🟢 Easy</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="hard">🔴 Hard</option>
                  <option value="very-hard">⚫ Very Hard</option>
                </select>
              </div>

              <div className="bg-white/70 p-3 rounded-lg">
                <div className="grid grid-cols-3 gap-4 text-center text-sm mb-3">
                  <div>
                    <div className="text-lg font-bold text-blue-600">{quizEndPage - quizStartPage + 1}</div>
                    <div className="text-gray-600">Pages</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-green-600">{(quizEndPage - quizStartPage + 1) * 5}</div>
                    <div className="text-gray-600">Questions</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-purple-600">{difficulty.toUpperCase()}</div>
                    <div className="text-gray-600">Level</div>
                  </div>
                </div>
                
                <Button
                  onClick={handleStartQuiz}
                  className="w-full bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Start Quiz (Pages {quizStartPage}-{quizEndPage})
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PdfPageNavigator;