import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { History, Download, Trash2, Calendar, FileText, Trophy } from "lucide-react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/config/firebase";
import { getStudyHistory, deleteStudyHistory, StudyHistoryRecord } from "@/services/studyHistoryService";
import { toast } from "sonner";
import { downloadPDF } from "@/utils/pdfUtils";


const StudyHistory = () => {
  const [user] = useAuthState(auth);
  const [studyHistory, setStudyHistory] = useState<StudyHistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStudyHistory();
    } else {
      setIsLoading(false); // Stop loading if there's no user
    }
  }, [user]);

  const fetchStudyHistory = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const history = await getStudyHistory(user.uid);
      
      // Convert Firestore timestamps to Date objects
      const processedHistory = history.map(record => ({
        ...record,
        timestamp: record.timestamp.toDate()
      }));
      
      setStudyHistory(processedHistory);
    } catch (error) {
      console.error("Error fetching study history:", error);
      toast.error("Failed to load study history");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (record: StudyHistoryRecord) => {
    try {
      let title, content, type;
      
      // --- CORRECTED: Removed .toDate() ---
      const dateString = record.timestamp.toLocaleDateString();

      if (record.type === "quiz" && record.quizData) {
        title = `Quiz Results - ${dateString}`;
        content = record.quizData;
        type = "quiz-results";
      } else if (record.type === "analysis" && record.analysisData) {
        title = `Study Analysis - ${dateString}`;
        content = [record.analysisData];
        type = "analysis";
      } else {
        // Fallback to original data structure
        title = record.type === "quiz" 
          ? `Quiz Results - ${dateString}`
          : `Study Analysis - ${dateString}`;
        content = record.data;
        type = record.type === "quiz" ? "quiz-results" : "analysis";
      }
      
      await downloadPDF({ title, content, type });
      
      toast.success("Downloaded successfully!");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download");
    }
  };

  const handleDelete = async (recordId: string) => {
    try {
      const record = studyHistory.find(r => r.id === recordId);
      await deleteStudyHistory(recordId, record?.fileUrls);
      setStudyHistory(prev => prev.filter(record => record.id !== recordId));
      toast.success("Record deleted successfully");
    } catch (error) {
      toast.error("Failed to delete record");
    }
  };

  const getScoreColor = (score: number, total: number) => {
    const percentage = (score / total) * 100;
    if (percentage >= 80) return "text-green-600 bg-green-50";
    if (percentage >= 60) return "text-blue-600 bg-blue-50";
    if (percentage >= 40) return "text-orange-600 bg-orange-50";
    return "text-red-600 bg-red-50";
  };

  if (!user && !isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <Card className="p-8 max-w-md mx-auto text-center">
          <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Login Required</h3>
          <p className="text-gray-600">Please login to view your study history.</p>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your study history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <Card className="p-6 bg-white/90 backdrop-blur-sm shadow-xl border-0">
            <div className="flex items-center gap-3 mb-4">
              <History className="h-6 w-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-800">Study History</h1>
            </div>
            <p className="text-gray-600">
              Track your learning progress and access previous study sessions
            </p>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{studyHistory.length}</div>
                <div className="text-sm text-blue-700">Total Sessions</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {studyHistory.filter(h => h.type === "analysis").length}
                </div>
                <div className="text-sm text-green-700">Analyses</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {studyHistory.filter(h => h.type === "quiz").length}
                </div>
                <div className="text-sm text-purple-700">Quizzes</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {Math.round(studyHistory.filter(h => h.type === "quiz").reduce((acc, h) => 
                    acc + (h.score || 0) / (h.totalQuestions || 1), 0
                  ) / Math.max(studyHistory.filter(h => h.type === "quiz").length, 1) * 100) || 0}%
                </div>
                <div className="text-sm text-orange-700">Avg Score</div>
              </div>
            </div>
          </Card>

          {/* History List */}
          <div className="space-y-4">
            {studyHistory.length === 0 ? (
              <Card className="p-8 text-center bg-white/90 backdrop-blur-sm shadow-xl border-0">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-800 mb-2">No Study History</h3>
                <p className="text-gray-600">
                  Start analyzing documents and taking quizzes to build your study history.
                </p>
              </Card>
            ) : (
              studyHistory.map((record) => (
                <Card key={record.id} className="p-6 bg-white/90 backdrop-blur-sm shadow-lg border-0">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {record.type === "quiz" ? (
                          <Trophy className="h-5 w-5 text-purple-600" />
                        ) : (
                          <FileText className="h-5 w-5 text-blue-600" />
                        )}
                        <h3 className="font-semibold text-gray-800">
                          {record.type === "quiz" ? "Quiz Session" : "Document Analysis"}
                        </h3>
                        {record.fileName && (
                          <Badge variant="outline" className="text-xs">
                            {record.fileName}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {/* --- CORRECTED: Removed .toDate() --- */}
                          {record.timestamp.toLocaleDateString()} at {record.timestamp.toLocaleTimeString()}
                        </div>
                        <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                          {record.difficulty.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">
                          {record.language === "tamil" ? "தமிழ்" : "English"}
                        </Badge>
                      </div>

                      {record.type === "quiz" && record.score !== undefined && (
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(record.score, record.totalQuestions || 1)}`}>
                          <Trophy className="h-4 w-4" />
                          Score: {record.score}/{record.totalQuestions} ({Math.round((record.score / (record.totalQuestions || 1)) * 100)}%)
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(record)}
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(record.id)}
                        className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudyHistory;