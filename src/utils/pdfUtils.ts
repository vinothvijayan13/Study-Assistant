import jsPDF from 'jspdf';

export interface PDFContent {
  title: string;
  content: any[];
  type: 'keypoints' | 'questions' | 'analysis' | 'quiz-results';
}

export const downloadPDF = async ({ title, content, type }: PDFContent) => {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const lineHeight = 7;
  let yPosition = margin;

  // Helper function to check if we need a new page
  const checkNewPage = (requiredSpace: number = 30) => {
    if (yPosition > pageHeight - requiredSpace) {
      pdf.addPage();
      yPosition = margin;
    }
  };

  // Helper function to add text with word wrapping
  const addWrappedText = (text: string, x: number, fontSize: number = 12, fontStyle: string = 'normal') => {
    pdf.setFontSize(fontSize);
    pdf.setFont('helvetica', fontStyle);
    const lines = pdf.splitTextToSize(text, pageWidth - 2 * margin);
    
    checkNewPage(lines.length * lineHeight + 10);
    
    pdf.text(lines, x, yPosition);
    yPosition += lines.length * lineHeight + 5;
    return lines.length;
  };

  // Add title
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text(title, margin, yPosition);
  yPosition += lineHeight * 2;

  if (type === 'keypoints' || type === 'analysis') {
    content.forEach((analysis, index) => {
      checkNewPage(50);

      // File name header
      addWrappedText(`File: ${analysis.fileName || analysis.mainTopic || `Analysis ${index + 1}`}`, margin, 16, 'bold');

      // Summary
      if (analysis.summary) {
        addWrappedText('Summary:', margin, 14, 'bold');
        addWrappedText(analysis.summary, margin, 12, 'normal');
        yPosition += 5;
      }

      // Key Points
      if (analysis.keyPoints && analysis.keyPoints.length > 0) {
        addWrappedText('Key Study Points:', margin, 14, 'bold');
        
        analysis.keyPoints.forEach((point, pointIndex) => {
          checkNewPage(20);
          addWrappedText(`${pointIndex + 1}. ${point}`, margin + 10, 11, 'normal');
        });
        yPosition += 5;
      }

      // Study Points (Detailed)
      if (analysis.studyPoints && analysis.studyPoints.length > 0) {
        addWrappedText('Detailed Study Points:', margin, 14, 'bold');
        
        analysis.studyPoints.forEach((point, pointIndex) => {
          checkNewPage(40);
          
          // Point title with priority
          const priorityText = point.tnpscPriority ? ` [${point.tnpscPriority.toUpperCase()} Priority]` : '';
          addWrappedText(`${pointIndex + 1}. ${point.title}${priorityText}`, margin + 5, 12, 'bold');
          
          // Point description
          addWrappedText(point.description, margin + 10, 11, 'normal');
          
          // TNPSC Relevance
          if (point.tnpscRelevance) {
            addWrappedText(`TNPSC Context: ${point.tnpscRelevance}`, margin + 10, 10, 'italic');
          }
          
          // Memory tip
          if (point.memoryTip) {
            addWrappedText(`💡 Memory Tip: ${point.memoryTip}`, margin + 10, 10, 'italic');
          }
          
          yPosition += 5;
        });
      }

      // TNPSC Categories
      if (analysis.tnpscCategories && analysis.tnpscCategories.length > 0) {
        addWrappedText('TNPSC Categories:', margin, 14, 'bold');
        addWrappedText(analysis.tnpscCategories.join(', '), margin, 11, 'normal');
        yPosition += 10;
      }

      // TNPSC Relevance
      if (analysis.tnpscRelevance) {
        addWrappedText('TNPSC Exam Relevance:', margin, 14, 'bold');
        addWrappedText(analysis.tnpscRelevance, margin, 11, 'normal');
        yPosition += 15;
      }
    });
  } else if (type === 'questions') {
    content.forEach((question, index) => {
      checkNewPage(80);

      // Question number and metadata
      const questionHeader = `Question ${index + 1} - ${question.difficulty?.toUpperCase() || 'MEDIUM'} Level (${question.tnpscGroup || 'TNPSC'})`;
      addWrappedText(questionHeader, margin, 14, 'bold');

      // Question text
      addWrappedText(question.question, margin, 12, 'normal');

      // Options (if MCQ)
      if (question.options && question.options.length > 0) {
        yPosition += 5;
        question.options.forEach((option, optIndex) => {
          const optionText = `${String.fromCharCode(65 + optIndex)}. ${option}`;
          addWrappedText(optionText, margin + 10, 11, 'normal');
        });
      }

      // Answer
      if (question.answer) {
        yPosition += 5;
        addWrappedText(`Correct Answer: ${question.answer}`, margin, 12, 'bold');
      }

      // Explanation
      if (question.explanation) {
        addWrappedText(`Explanation: ${question.explanation}`, margin, 11, 'normal');
      }

      yPosition += 10; // Space between questions
    });
  } else if (type === 'quiz-results') {
    const result = content;
    
    // Quiz Summary
    addWrappedText(`Quiz Results Summary`, margin, 18, 'bold');
    addWrappedText(`Score: ${result.score}/${result.totalQuestions} (${result.percentage}%)`, margin, 14, 'bold');
    addWrappedText(`Difficulty Level: ${result.difficulty || 'Medium'}`, margin, 12, 'normal');
    addWrappedText(`Date: ${new Date().toLocaleDateString()}`, margin, 12, 'normal');
    yPosition += 10;

    // Performance message
    let performanceMsg = "Good effort! Keep practicing.";
    if (result.percentage >= 90) performanceMsg = "Outstanding performance! Excellent work!";
    else if (result.percentage >= 80) performanceMsg = "Great job! You're well prepared!";
    else if (result.percentage >= 70) performanceMsg = "Good work! Continue studying!";
    else if (result.percentage >= 60) performanceMsg = "Fair performance. More practice needed.";
    
    addWrappedText(performanceMsg, margin, 12, 'italic');
    yPosition += 10;

    // Answer Review
    addWrappedText('Detailed Answer Review:', margin, 16, 'bold');

    result.answers?.forEach((answer, index) => {
      checkNewPage(60);

      const statusIcon = answer.isCorrect ? '✓' : '✗';
      const statusText = answer.isCorrect ? 'CORRECT' : 'INCORRECT';
      
      addWrappedText(`${statusIcon} Q${index + 1}: ${statusText}`, margin, 12, 'bold');
      addWrappedText(answer.question.question, margin, 11, 'normal');

      if (answer.question.options && answer.question.options.length > 0) {
        answer.question.options.forEach((option, optIndex) => {
          const optionLetter = String.fromCharCode(65 + optIndex);
          const isUserAnswer = answer.userAnswer === optionLetter || answer.userAnswer === option;
          const isCorrectAnswer = answer.correctAnswer === optionLetter || answer.correctAnswer === option;
          
          let optionStyle = 'normal';
          if (isUserAnswer && isCorrectAnswer) optionStyle = 'bold'; // Correct user answer
          else if (isUserAnswer) optionStyle = 'bold'; // User's wrong answer
          else if (isCorrectAnswer) optionStyle = 'bold'; // Correct answer
          
          addWrappedText(`${optionLetter}. ${option}`, margin + 10, 10, optionStyle);
        });
      }

      addWrappedText(`Your Answer: ${answer.userAnswer}`, margin + 5, 11, 'normal');
      
      if (!answer.isCorrect) {
        addWrappedText(`Correct Answer: ${answer.correctAnswer}`, margin + 5, 11, 'bold');
      }

      if (answer.question.explanation) {
        addWrappedText(`Explanation: ${answer.question.explanation}`, margin + 5, 10, 'italic');
      }

      yPosition += 10;
    });
  }

  // Save the PDF
  const fileName = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
  pdf.save(fileName);
};