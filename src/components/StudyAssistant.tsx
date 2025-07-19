import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Image, Settings, Languages, Brain, Zap } from "lucide-react";
import { analyzeImage, analyzeMultipleImages, analyzePdfContent, analyzePdfContentComprehensive, generateQuestions as generateQuestionsFromService } from "@/services/geminiService";
import { extractAllPdfText, findTotalPagesFromOcr, extractPageRangeFromOcr } from "@/utils/pdfReader";
import { toast } from "sonner";
import { useAppContext } from "@/contexts/AppContext";
import AnalysisResults from "./AnalysisResults";
import QuestionResults from "./QuestionResults";
import ModernQuizMode from "./ModernQuizMode";
import QuickAnalysisMode from "./QuickAnalysisMode";
import PdfPageSelector from "./PdfPageSelector";
import ComprehensivePdfResults from "./ComprehensivePdfResults";
import PdfPageNavigator from "./PdfPageNavigator";

export interface AnalysisResult {
  keyPoints: string[];
  summary: string;
  tnpscRelevance: string;
  studyPoints: StudyPoint[];
  tnpscCategories: string[];
  language?: string;
  mainTopic?: string;
}

export interface StudyPoint {
  title: string;
  description: string;
  importance: "high" | "medium" | "low";
  tnpscRelevance?: string;
  tnpscPriority?: "high" | "medium" | "low";
  memoryTip?: string;
}

export interface Question {
  question: string;
  options?: string[];
  answer: string;
  type: "mcq" | "assertion_reason";
  difficulty: string;
  tnpscGroup: string;
  explanation?: string;
}

export interface QuestionResult {
  questions: Question[];
  summary: string;
  keyPoints: string[];
  difficulty: string;
  totalQuestions?: number;
}

const StudyAssistant = () => {
  const {
    selectedFiles,
    setSelectedFiles,
    analysisResults,
    setAnalysisResults,
    questionResult,
    setQuestionResult,
    difficulty,
    setDifficulty,
    outputLanguage,
    setOutputLanguage,
    clearAppState
  } = useAppContext();

  const [currentView, setCurrentView] = useState<"upload" | "analysis" | "questions" | "quiz" | "quick-analysis" | "pdf-page-select" | "comprehensive-pdf" | "pdf-navigator">("upload");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [pdfInfo, setPdfInfo] = useState<{file: File; totalPages: number} | null>(null);
  const [pdfFullText, setPdfFullText] = useState<string>("");
  const [comprehensiveResults, setComprehensiveResults] = useState<{
    pageAnalyses: Array<{
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
    }>;
    overallSummary: string;
    totalKeyPoints: string[];
    tnpscCategories: string[];
  } | null>(null);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => 
      file.type.startsWith('image/') || file.type === 'application/pdf'
    );
    
    if (validFiles.length !== fileArray.length) {
      toast.error("Only image files (PNG, JPG, etc.) and PDF files are supported");
    }
    
    setSelectedFiles(validFiles);
  };

  const analyzeFiles = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Please select files to analyze");
      return;
    }

    // Check if there's a PDF file
    const pdfFile = selectedFiles.find(file => file.type === 'application/pdf');
    if (pdfFile) {
      try {
        const fullText = await extractAllPdfText(pdfFile);
        const totalPages = findTotalPagesFromOcr(fullText);
        
        if (totalPages > 0) {
          setPdfInfo({ file: pdfFile, totalPages });
          setPdfFullText(fullText);
          setCurrentView("pdf-page-select");
          return;
        } else {
          // Fallback to regular PDF analysis if no OCR markers found
          toast.info("No page markers found. Analyzing entire PDF...");
          await analyzePdfFile(pdfFile);
        }
      } catch (error) {
        console.error("PDF analysis error:", error);
        toast.error("Failed to analyze PDF. Please try again.");
      }
      return;
    }

    // Handle image files
    setIsAnalyzing(true);
    try {
      const results: AnalysisResult[] = [];
      
      for (const file of selectedFiles) {
        if (file.type.startsWith('image/')) {
          const result = await analyzeImage(file, outputLanguage);
          results.push({
            ...result,
            language: outputLanguage,
            mainTopic: result.studyPoints?.[0]?.title || "Study Material"
          });
        }
      }
      
      setAnalysisResults(results);
      setCurrentView("analysis");
      toast.success("Analysis completed successfully!");
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Failed to analyze files. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzePdfFile = async (file: File, startPage?: number, endPage?: number) => {
    setIsAnalyzing(true);
    try {
      const fullText = await extractAllPdfText(file);
      let contentToAnalyze = fullText;
      
      if (startPage && endPage) {
        contentToAnalyze = extractPageRangeFromOcr(fullText, startPage, endPage);
        toast.info(`Analyzing pages ${startPage} to ${endPage}...`);
      }
      
      const result = await analyzePdfContent(contentToAnalyze, outputLanguage);
      setAnalysisResults([{
        ...result,
        language: outputLanguage,
        mainTopic: `${file.name} ${startPage && endPage ? `(Pages ${startPage}-${endPage})` : ''}`
      }]);
      setCurrentView("analysis");
      toast.success("PDF analysis completed successfully!");
    } catch (error) {
      console.error("PDF analysis error:", error);
      toast.error("Failed to analyze PDF. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzeComprehensivePdf = async (file: File) => {
    setIsAnalyzing(true);
    try {
      const fullText = await extractAllPdfText(file);
      toast.info("Starting comprehensive analysis of all pages...");
      
      const result = await analyzePdfContentComprehensive(fullText, outputLanguage);
      setComprehensiveResults(result);
      setCurrentView("comprehensive-pdf");
      toast.success(`Comprehensive analysis completed! Analyzed ${result.pageAnalyses.length} pages.`);
    } catch (error) {
      console.error("Comprehensive PDF analysis error:", error);
      toast.error("Failed to analyze PDF comprehensively. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePdfPageRangeSelect = (startPage: number, endPage: number) => {
    if (pdfInfo) {
      setCurrentView("pdf-navigator");
    }
  };

  const handlePdfAnalyzeAll = () => {
    if (pdfInfo) {
      analyzeComprehensivePdf(pdfInfo.file);
    }
  };

  const handleComprehensiveQuizGeneration = async (startPage: number, endPage: number) => {
    if (!pdfInfo || !comprehensiveResults) return;
    
    setIsGeneratingQuestions(true);
    try {
      const fullText = await extractAllPdfText(pdfInfo.file);
      const contentToAnalyze = extractPageRangeFromOcr(fullText, startPage, endPage);
      
      const analysisResult = await analyzePdfContent(contentToAnalyze, outputLanguage);
      const result = await generateQuestionsFromService([analysisResult], difficulty, outputLanguage);
      
      setQuestionResult({
        ...result,
        totalQuestions: result.questions?.length || 0
      });
      setCurrentView("questions");
      toast.success("Questions generated successfully!");
    } catch (error) {
      console.error("Question generation error:", error);
      toast.error("Failed to generate questions. Please try again.");
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const generateQuestionsFromAnalysis = async () => {
    if (analysisResults.length === 0) return;
    
    setIsGeneratingQuestions(true);
    try {
      const result = await generateQuestionsFromService(analysisResults, difficulty, outputLanguage);
      setQuestionResult({
        ...result,
        totalQuestions: result.questions?.length || 0
      });
      setCurrentView("questions");
      toast.success("Questions generated successfully!");
    } catch (error) {
      console.error("Question generation error:", error);
      toast.error("Failed to generate questions. Please try again.");
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const handleGenerateNextPage = async (pageNumber: number) => {
    if (!pdfInfo) return;
    
    console.log(`StudyAssistant: Generating page ${pageNumber}`);
    
    try {
      const fullText = await extractAllPdfText(pdfInfo.file);
      const pageContent = extractPageRangeFromOcr(fullText, pageNumber, pageNumber);
      
      if (!pageContent.trim()) {
        toast.error(`No content found on page ${pageNumber}`);
        return;
      }
      
      console.log(`Page ${pageNumber} content length:`, pageContent.length);
      
      const result = await analyzePdfContent(pageContent, outputLanguage);
      
      console.log(`Page ${pageNumber} analysis result:`, result);
      
      // Add the new page analysis to existing results
      const newPageAnalysis = {
        pageNumber,
        keyPoints: result.keyPoints || [],
        studyPoints: (result.studyPoints || []).map(point => ({
          title: point.title,
          description: point.description,
          importance: point.importance,
          tnpscRelevance: point.tnpscRelevance || ''
        })),
        summary: result.summary || '',
        tnpscRelevance: result.tnpscRelevance || ''
      };
      
      setComprehensiveResults(prev => {
        if (!prev) return null;
        
        // Check if page already exists
        const pageExists = prev.pageAnalyses.some(p => p.pageNumber === pageNumber);
        if (pageExists) {
          console.log(`Page ${pageNumber} already exists, not adding duplicate`);
          return prev; // Don't add duplicate
        }
        
        console.log(`Adding new page ${pageNumber} to results`);
        const updatedResults = {
          ...prev,
          pageAnalyses: [...prev.pageAnalyses, newPageAnalysis].sort((a, b) => a.pageNumber - b.pageNumber),
          totalKeyPoints: [...prev.totalKeyPoints, ...(result.keyPoints || [])]
        };
        
        console.log(`Updated results now has ${updatedResults.pageAnalyses.length} pages`);
        return updatedResults;
      });
      
      console.log(`Page ${pageNumber} analysis completed successfully`);
    } catch (error) {
      console.error(`Error analyzing page ${pageNumber}:`, error);
      toast.error(`Failed to analyze page ${pageNumber}. Please try again.`);
      throw error; // Re-throw to be caught by the component
    }
  };

  const startQuickAnalysis = () => {
    if (selectedFiles.length === 0) {
      toast.error("Please select files first");
      return;
    }
    setCurrentView("quick-analysis");
  };

  const handleQuickAnalysisQuiz = (result: QuestionResult) => {
    setQuestionResult({
      ...result,
      totalQuestions: result.questions?.length || 0
    });
    setCurrentView("quiz");
  };

  const handlePdfNavigatorQuiz = async (pageRange: { start: number; end: number }, difficulty: string) => {
    if (!pdfInfo) return;
    
    setIsGeneratingQuestions(true);
    try {
      const contentToAnalyze = extractPageRangeFromOcr(pdfFullText, pageRange.start, pageRange.end);
      
      const analysisResult = await analyzePdfContent(contentToAnalyze, outputLanguage);
      const result = await generateQuestionsFromService([analysisResult], difficulty, outputLanguage);
      
      setQuestionResult({
        ...result,
        totalQuestions: result.questions?.length || 0
      });
      setCurrentView("questions");
      toast.success("Questions generated successfully!");
    } catch (error) {
      console.error("Question generation error:", error);
      toast.error("Failed to generate questions. Please try again.");
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const resetToUpload = () => {
    clearAppState();
    setCurrentView("upload");
  };

  const startQuizFromAnalysis = () => {
    if (questionResult) {
      setCurrentView("quiz");
    }
  };

  if (currentView === "quick-analysis") {
    return (
      <QuickAnalysisMode
        files={selectedFiles}
        difficulty={difficulty}
        outputLanguage={outputLanguage}
        onStartQuiz={handleQuickAnalysisQuiz}
        onReset={resetToUpload}
      />
    );
  }

  if (currentView === "quiz" && questionResult) {
    return (
      <ModernQuizMode
        result={questionResult}
        onReset={resetToUpload}
        onBackToAnalysis={() => setCurrentView("analysis")}
        difficulty={difficulty}
        outputLanguage={outputLanguage}
      />
    );
  }

  if (currentView === "questions" && questionResult) {
    return (
      <QuestionResults
        result={questionResult}
        onReset={resetToUpload}
        selectedFiles={selectedFiles}
        onStartQuiz={startQuizFromAnalysis}
      />
    );
  }

  if (currentView === "analysis" && analysisResults.length > 0) {
    return (
      <AnalysisResults
        result={analysisResults[0]}
        onReset={resetToUpload}
        selectedFiles={selectedFiles}
        onGenerateQuestions={generateQuestionsFromAnalysis}
        onStartQuiz={startQuizFromAnalysis}
        isGeneratingQuestions={isGeneratingQuestions}
      />
    );
  }

  if (currentView === "comprehensive-pdf" && comprehensiveResults) {
    return (
      <ComprehensivePdfResults
        pageAnalyses={comprehensiveResults.pageAnalyses}
        overallSummary={comprehensiveResults.overallSummary}
        totalKeyPoints={comprehensiveResults.totalKeyPoints}
        onReset={resetToUpload}
        onGenerateQuestions={handleComprehensiveQuizGeneration}
        onGenerateNextPage={handleGenerateNextPage}
        isGeneratingQuestions={isGeneratingQuestions}
        totalPdfPages={pdfInfo?.totalPages || 0}
      />
    );
  }

  if (currentView === "pdf-navigator" && pdfInfo) {
    return (
      <PdfPageNavigator
        file={pdfInfo.file}
        totalPages={pdfInfo.totalPages}
        fullText={pdfFullText}
        outputLanguage={outputLanguage}
        onReset={resetToUpload}
        onStartQuiz={handlePdfNavigatorQuiz}
      />
    );
  }

  if (currentView === "pdf-page-select" && pdfInfo) {
    return (
      <div className="min-h-screen p-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full pulse-glow">
                <Brain className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-4xl font-bold gradient-text">
                PDF Page Selection
              </h1>
            </div>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Choose which pages you want to analyze for TNPSC preparation
            </p>
          </div>

          <PdfPageSelector
            fileName={pdfInfo.file.name}
            totalPages={pdfInfo.totalPages}
            onPageRangeSelect={handlePdfPageRangeSelect}
            onAnalyzeAll={handlePdfAnalyzeAll}
            isAnalyzing={isAnalyzing}
          />

          <div className="mt-6 text-center">
            <Button
              onClick={resetToUpload}
              className="btn-secondary"
            >
              Back to Upload
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-8 animate-fadeInUp">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="p-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full shadow-elegant pulse-glow">
              <Brain className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold gradient-text">
              Ram's AI
            </h1>
          </div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Transform your TNPSC preparation with AI-powered analysis. Upload your study materials and get instant insights, key points, and practice questions.
          </p>
        </div>

        <Card className="glass-card p-8 mb-8 animate-fadeInScale hover-lift">
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <label className="block text-sm font-semibold text-gray-700">
                  <Settings className="h-4 w-4 inline mr-2" />
                  Difficulty Level
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="input-elegant"
                >
                  <option value="easy">🟢 Easy - Basic concepts</option>
                  <option value="medium">🟡 Medium - Standard level</option>
                  <option value="hard">🔴 Hard - Advanced level</option>
                  <option value="very-hard">⚫ Very Hard - Expert level</option>
                </select>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-semibold text-gray-700">
                  <Languages className="h-4 w-4 inline mr-2" />
                  Output Language
                </label>
                <select
                  value={outputLanguage}
                  onChange={(e) => setOutputLanguage(e.target.value as "english" | "tamil")}
                  className="input-elegant"
                >
                  <option value="english">🇬🇧 English</option>
                  <option value="tamil">🇮🇳 தமிழ் (Tamil)</option>
                </select>
              </div>
            </div>

            <div className="glass-card p-8 border-2 border-dashed border-gray-300 hover:border-blue-400 transition-all duration-300 hover:bg-blue-50/30">
              <input
                type="file"
                multiple
                accept="image/*,application/pdf"
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer block text-center">
                <Upload className="h-16 w-16 text-gray-400 mx-auto mb-4 icon-bounce" />
                <p className="text-xl font-semibold text-gray-700 mb-2">
                  Upload Your Study Materials
                </p>
                <p className="text-gray-500 text-lg">
                  Drag & drop or click to select images and PDF files
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  Supports: JPG, PNG, GIF, PDF (up to 10MB each)
                </p>
              </label>
            </div>

            {selectedFiles.length > 0 && (
              <div className="space-y-6">
                <h3 className="font-semibold text-gray-800 text-lg">
                  <span className="gradient-text">Selected Files ({selectedFiles.length})</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-animation">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="glass-card p-4 hover-lift">
                      <div className="flex items-center gap-3 mb-3">
                        {file.type.startsWith('image/') ? (
                          <Image className="h-6 w-6 text-blue-600" />
                        ) : (
                          <FileText className="h-6 w-6 text-red-600" />
                        )}
                        <span className="text-sm font-medium text-gray-700">
                          {file.type.startsWith('image/') ? 'Image' : 'PDF'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <div className="font-medium truncate mb-1">{file.name}</div>
                        <div className="text-xs">({(file.size / 1024 / 1024).toFixed(2)} MB)</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-6">
                  <Button
                    onClick={analyzeFiles}
                    disabled={isAnalyzing}
                    className="flex-1 btn-primary py-6 text-lg"
                  >
                    {isAnalyzing ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Settings className="h-5 w-5 mr-3" />
                        Detailed Analysis
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={startQuickAnalysis}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-6 text-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 border-0 rounded-xl"
                  >
                    <Zap className="h-5 w-5 mr-3" />
                    Quick Quiz
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Features Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 stagger-animation">
          <Card className="glass-card p-6 text-center hover-lift">
            <div className="p-3 bg-blue-100 rounded-full w-fit mx-auto mb-4">
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Smart Analysis</h3>
            <p className="text-gray-600 text-sm">
              AI-powered analysis extracts key points and creates crisp, memorable study notes
            </p>
          </Card>

          <Card className="glass-card p-6 text-center hover-lift">
            <div className="p-3 bg-purple-100 rounded-full w-fit mx-auto mb-4">
              <Brain className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">MCQ & Assertion Questions</h3>
            <p className="text-gray-600 text-sm">
              Generate TNPSC-style multiple choice and assertion-reason questions for practice
            </p>
          </Card>

          <Card className="glass-card p-6 text-center hover-lift">
            <div className="p-3 bg-green-100 rounded-full w-fit mx-auto mb-4">
              <Zap className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Instant Results</h3>
            <p className="text-gray-600 text-sm">
              Get immediate feedback with detailed explanations and performance tracking
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StudyAssistant;