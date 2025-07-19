
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, ChevronDown, ChevronUp } from "lucide-react";

interface PdfPageSelectorProps {
  fileName: string;
  totalPages: number;
  onPageRangeSelect: (startPage: number, endPage: number) => void;
  onAnalyzeAll: () => void;
  isAnalyzing: boolean;
}

const PdfPageSelector = ({ 
  fileName, 
  totalPages, 
  onPageRangeSelect, 
  onAnalyzeAll,
  isAnalyzing 
}: PdfPageSelectorProps) => {
  const [startPage, setStartPage] = useState(1);
  const [endPage, setEndPage] = useState(Math.min(10, totalPages));
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleQuickSelect = (pages: number) => {
    setStartPage(1);
    setEndPage(Math.min(pages, totalPages));
  };

  const handleRangeAnalysis = () => {
    onPageRangeSelect(startPage, endPage);
  };

  return (
    <Card className="p-6 bg-white/90 backdrop-blur-sm shadow-lg border-0">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-red-600" />
          <div>
            <h3 className="font-semibold text-gray-800">{fileName}</h3>
            <Badge className="bg-blue-100 text-blue-700">
              {totalPages} pages detected
            </Badge>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-700 mb-3">Quick Analysis</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageRangeSelect(1, Math.min(5, totalPages))}
                className="text-sm"
              >
                First 5 Pages
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageRangeSelect(1, Math.min(10, totalPages))}
                className="text-sm"
              >
                First 10 Pages
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageRangeSelect(1, Math.min(25, totalPages))}
                className="text-sm"
              >
                First 25 Pages
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageRangeSelect(1, totalPages)}
                disabled={isAnalyzing}
                className="text-sm"
              >
                Page Navigator
              </Button>
            </div>
          </div>

          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-center gap-2"
            >
              Custom Page Range
              {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>

            {showAdvanced && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      From Page
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={totalPages}
                      value={startPage}
                      onChange={(e) => setStartPage(Math.max(1, Math.min(parseInt(e.target.value) || 1, totalPages)))}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      To Page
                    </label>
                    <input
                      type="number"
                      min={startPage}
                      max={totalPages}
                      value={endPage}
                      onChange={(e) => setEndPage(Math.max(startPage, Math.min(parseInt(e.target.value) || startPage, totalPages)))}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div className="text-sm text-gray-600">
                  Selected: {endPage - startPage + 1} pages (Page {startPage} to {endPage})
                </div>

                <Button
                  onClick={onAnalyzeAll}
                  disabled={isAnalyzing}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {isAnalyzing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Comprehensive Analysis...
                    </>
                  ) : (
                    `Comprehensive Analysis (All Pages)`
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default PdfPageSelector;
