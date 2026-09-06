import type { DetailedAttemptData, QuestionAnalyticsItem, QuestionAnalyticsSummary, Quiz, AttemptData, UserData } from '../types';

/**
 * Clean CSV cell value and escape quotes / commas.
 */
const escapeCSV = (val: unknown): string => {
    if (val === undefined || val === null) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
};

/**
 * Trigger browser file download from string content with proper MIME type.
 */
export const downloadFile = (content: string, filename: string, mimeType = 'text/csv;charset=utf-8;') => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * Format duration from seconds to human readable string.
 */
const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
};

/**
 * Export a student's detailed quiz attempt breakdown to Excel-compatible CSV.
 */
export const exportAttemptToCSV = (attempt: DetailedAttemptData): void => {
    const lines: string[] = [];

    // UTF-8 BOM for Excel to properly render UTF-8 characters (Arabic, math, accents)
    lines.push('\uFEFF');

    // Section 1: Attempt Summary Header
    lines.push('QUIZ ATTEMPT REPORT');
    lines.push(`Attempt ID,${escapeCSV(attempt.attemptId)}`);
    lines.push(`Student Name,${escapeCSV(attempt.userName)}`);
    lines.push(`Student Email,${escapeCSV(attempt.userEmail)}`);
    lines.push(`Quiz Title,${escapeCSV(attempt.quizTitle)}`);
    lines.push(`Overall Score,${escapeCSV(attempt.score)}`);
    lines.push(`Percentage,${escapeCSV(attempt.percentage + '%')}`);
    lines.push(`Outcome,${escapeCSV(attempt.passed ? 'PASSED' : 'FAILED')}`);
    lines.push(`Duration,${escapeCSV(formatDuration(attempt.timeTaken || 0))}`);
    lines.push(`Completed At,${escapeCSV(attempt.completedAt ? new Date(attempt.completedAt).toLocaleString() : 'N/A')}`);

    // Integrity Telemetry Summary
    const telemetry = attempt.telemetry;
    const integrityScore = telemetry?.integrityScore ?? 100;
    const tabSwitches = telemetry?.tabSwitches ?? 0;
    const focusLoss = telemetry?.focusLossCount ?? 0;
    const copyPaste = telemetry?.copyPasteAttempts ?? 0;

    lines.push(`Integrity Score,${escapeCSV(integrityScore + '%')}`);
    lines.push(`Tab Switches,${escapeCSV(tabSwitches)}`);
    lines.push(`Focus Loss Count,${escapeCSV(focusLoss)}`);
    lines.push(`Copy/Paste Attempts,${escapeCSV(copyPaste)}`);
    lines.push(''); // Blank separator line

    // Section 2: Question by Question Breakdown Table
    lines.push([
        'Question #',
        'Question Prompt',
        'Question Type',
        'Max Points',
        'Student Selected Answer',
        'Correct Answer',
        'Result',
        'Explanation'
    ].map(escapeCSV).join(','));

    const breakdown = attempt.questionsBreakdown || [];
    breakdown.forEach((q, idx) => {
        const qNum = idx + 1;
        const qText = q.question;
        const qType = q.type || 'multiple-choice';
        const points = q.points || 10;

        let studentAns = 'No Answer Given';
        if (typeof q.studentAnswer === 'number' && Array.isArray(q.options) && q.options[q.studentAnswer]) {
            studentAns = `Option ${String.fromCharCode(65 + q.studentAnswer)}: ${q.options[q.studentAnswer]}`;
        } else if (q.studentAnswer !== undefined && q.studentAnswer !== null && q.studentAnswer !== '') {
            studentAns = typeof q.studentAnswer === 'object' ? JSON.stringify(q.studentAnswer) : String(q.studentAnswer);
        }

        let correctAns = 'Not Specified';
        if (typeof q.correctAnswer === 'number' && Array.isArray(q.options) && q.options[q.correctAnswer]) {
            correctAns = `Option ${String.fromCharCode(65 + q.correctAnswer)}: ${q.options[q.correctAnswer]}`;
        } else if (q.correctAnswer !== undefined && q.correctAnswer !== null) {
            correctAns = String(q.correctAnswer);
        }

        const isAnswered = q.isAnswered ?? (q.studentAnswer !== undefined && q.studentAnswer !== null && q.studentAnswer !== '');
        const result = q.isCorrect ? 'CORRECT' : (isAnswered ? 'WRONG' : 'UNANSWERED / SKIPPED');
        const explanation = q.explanation || 'None provided';

        lines.push([
            escapeCSV(qNum),
            escapeCSV(qText),
            escapeCSV(qType),
            escapeCSV(points),
            escapeCSV(studentAns),
            escapeCSV(correctAns),
            escapeCSV(result),
            escapeCSV(explanation)
        ].join(','));
    });

    const safeName = (attempt.userName || 'Student').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeQuiz = (attempt.quizTitle || 'Quiz').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${safeName}_${safeQuiz}_Attempt_Report.csv`;

    downloadFile(lines.join('\r\n'), filename);
};

/**
 * Export a student's detailed quiz attempt breakdown to a professional formatted PDF.
 */
export const exportAttemptToPDF = async (attempt: DetailedAttemptData): Promise<void> => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    const checkPageBreak = (neededHeight: number) => {
        if (y + neededHeight > pageHeight - margin) {
            doc.addPage();
            y = margin;
            renderPageHeader(false);
        }
    };

    const renderPageHeader = (isFirstPage: boolean) => {
        if (isFirstPage) {
            // Header Top Gradient Bar
            doc.setFillColor(79, 70, 229); // Indigo 600
            doc.rect(margin, y, contentWidth, 20, 'F');

            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.text('QUIZ PLATFORM — OFFICIAL ASSESSMENT REPORT', margin + 6, y + 8);

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(`Generated: ${new Date().toLocaleString()}`, margin + 6, y + 15);
            y += 26;
        } else {
            // Continuation Header
            doc.setFillColor(243, 244, 246);
            doc.rect(margin, y, contentWidth, 8, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(107, 114, 128);
            doc.text(`${attempt.quizTitle} — Student: ${attempt.userName}`, margin + 4, y + 5.5);
            y += 12;
        }
    };

    renderPageHeader(true);

    // Summary Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 42, 3, 3, 'FD');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(attempt.quizTitle || 'Quiz Assessment', margin + 6, y + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`Student: ${attempt.userName} (${attempt.userEmail})`, margin + 6, y + 14);
    doc.text(`Date Completed: ${attempt.completedAt ? new Date(attempt.completedAt).toLocaleString() : 'Recent'}`, margin + 6, y + 19);

    // Score & Outcome Badges
    const isPassed = Boolean(attempt.passed);
    const scoreColor = isPassed ? [16, 185, 129] : [239, 68, 68]; // Emerald vs Red
    doc.setFillColor(scoreColor[0], scoreColor[1], scoreColor[2]);
    doc.roundedRect(pageWidth - margin - 38, y + 5, 32, 14, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`${attempt.percentage}%`, pageWidth - margin - 22, y + 11, { align: 'center' });
    doc.setFontSize(7);
    doc.text(isPassed ? 'PASSED' : 'FAILED', pageWidth - margin - 22, y + 16, { align: 'center' });

    // Stats Row
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    const breakdown = attempt.questionsBreakdown || [];
    const correctCount = breakdown.filter(q => q.isCorrect).length;
    const wrongCount = breakdown.filter(q => !q.isCorrect && (q.isAnswered ?? (q.studentAnswer !== undefined && q.studentAnswer !== null && q.studentAnswer !== ''))).length;
    const unansweredCount = breakdown.filter(q => !(q.isAnswered ?? (q.studentAnswer !== undefined && q.studentAnswer !== null && q.studentAnswer !== ''))).length;

    doc.text(`Score: ${attempt.score} pts  |  Total: ${breakdown.length} Qs  |  Correct: ${correctCount}  |  Wrong: ${wrongCount}${unansweredCount > 0 ? `  |  Skipped: ${unansweredCount}` : ''}  |  Duration: ${formatDuration(attempt.timeTaken || 0)}`, margin + 6, y + 26);

    // Integrity Telemetry Row
    const telemetry = attempt.telemetry;
    const integrityScore = telemetry?.integrityScore ?? 100;
    const tabSwitches = telemetry?.tabSwitches ?? 0;
    const copyPaste = telemetry?.copyPasteAttempts ?? 0;

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(integrityScore >= 80 ? 16 : 220, integrityScore >= 80 ? 185 : 38, integrityScore >= 80 ? 129 : 38);
    doc.text(`Integrity Rating: ${integrityScore}%  •  Tab Switches: ${tabSwitches}  •  Copy/Paste Events: ${copyPaste}`, margin + 6, y + 34);

    y += 48;

    // Section Header: Detailed Breakdown
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('QUESTION-BY-QUESTION BREAKDOWN', margin, y);
    y += 6;

    // Render each question
    breakdown.forEach((q, idx) => {
        checkPageBreak(35);

        const isAnswered = q.isAnswered ?? (q.studentAnswer !== undefined && q.studentAnswer !== null && q.studentAnswer !== '');
        const isCorrect = q.isCorrect;
        const isWrong = !isCorrect && isAnswered;

        const cardBg = isCorrect ? [240, 253, 244] : isWrong ? [254, 242, 242] : [254, 249, 195];
        const cardBorder = isCorrect ? [187, 247, 208] : isWrong ? [254, 202, 202] : [253, 224, 71];

        doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
        doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2]);

        const startY = y;
        // Question Header line
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        const statusText = isCorrect ? 'CORRECT' : isWrong ? 'WRONG' : 'SKIPPED / UNANSWERED';
        doc.setTextColor(isCorrect ? 16 : isWrong ? 220 : 180, isCorrect ? 185 : isWrong ? 38 : 83, isCorrect ? 129 : isWrong ? 38 : 9);
        doc.text(`Question ${idx + 1} (${q.points || 10} pts) — ${statusText}`, margin + 4, y + 5);

        y += 8;

        // Question text wrapped
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(30, 41, 59);
        const splitQuestion = doc.splitTextToSize(q.question, contentWidth - 8);
        doc.text(splitQuestion, margin + 4, y);
        y += splitQuestion.length * 4 + 2;

        // Student Answer
        let studentAns = 'No Answer Given (Skipped / Not Reached)';
        if (typeof q.studentAnswer === 'number' && Array.isArray(q.options) && q.options[q.studentAnswer]) {
            studentAns = `Option ${String.fromCharCode(65 + q.studentAnswer)}: ${q.options[q.studentAnswer]}`;
        } else if (q.studentAnswer !== undefined && q.studentAnswer !== null && q.studentAnswer !== '') {
            studentAns = typeof q.studentAnswer === 'object' ? JSON.stringify(q.studentAnswer) : String(q.studentAnswer);
        }

        let correctAns = 'Not Specified';
        if (typeof q.correctAnswer === 'number' && Array.isArray(q.options) && q.options[q.correctAnswer]) {
            correctAns = `Option ${String.fromCharCode(65 + q.correctAnswer)}: ${q.options[q.correctAnswer]}`;
        } else if (q.correctAnswer !== undefined && q.correctAnswer !== null) {
            correctAns = String(q.correctAnswer);
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(isCorrect ? 16 : isWrong ? 185 : 160, isCorrect ? 150 : isWrong ? 28 : 100, isCorrect ? 100 : isWrong ? 28 : 20);
        const splitStudentAns = doc.splitTextToSize(`Student Answer: ${studentAns}`, contentWidth - 8);
        doc.text(splitStudentAns, margin + 4, y);
        y += splitStudentAns.length * 3.5 + 1;

        if (!isCorrect) {
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(16, 150, 100);
            const splitCorrectAns = doc.splitTextToSize(`Required Answer: ${correctAns}`, contentWidth - 8);
            doc.text(splitCorrectAns, margin + 4, y);
            y += splitCorrectAns.length * 3.5 + 1;
        }

        if (q.explanation) {
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(7.5);
            doc.setTextColor(100, 116, 139);
            const splitExp = doc.splitTextToSize(`Explanation: ${q.explanation}`, contentWidth - 8);
            doc.text(splitExp, margin + 4, y);
            y += splitExp.length * 3.2 + 2;
        }

        const cardHeight = y - startY + 2;
        doc.roundedRect(margin, startY, contentWidth, cardHeight, 2, 2, 'D');
        y += 4;
    });

    // Page numbering footer on all pages
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175);
        doc.text(
            `Page ${i} of ${totalPages} — Quiz Platform Inspector Report`,
            pageWidth / 2,
            pageHeight - 6,
            { align: 'center' }
        );
    }

    const safeName = (attempt.userName || 'Student').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeQuiz = (attempt.quizTitle || 'Quiz').replace(/[^a-zA-Z0-9_-]/g, '_');
    doc.save(`${safeName}_${safeQuiz}_Report.pdf`);
};

/**
 * Export aggregate question error analytics to an Excel-ready CSV.
 */
export const exportQuestionAnalyticsToCSV = (
    questions: QuestionAnalyticsItem[],
    summary?: QuestionAnalyticsSummary | null
): void => {
    const lines: string[] = [];

    // UTF-8 BOM
    lines.push('\uFEFF');

    // Section 1: Summary Stats
    lines.push('QUESTION PERFORMANCE & MISCONCEPTION ANALYTICS');
    lines.push(`Generated Date,${escapeCSV(new Date().toLocaleString())}`);
    if (summary) {
        const highFailureCount = summary.highFailureQuestionsCount ?? questions.filter(q => q.failureRate >= 40).length;
        const avgAcc = summary.avgAccuracy ?? summary.averageAccuracy ?? 0;
        const avgFail = summary.avgFailureRate ?? summary.averageFailureRate ?? 0;
        lines.push(`Total Questions Analyzed,${escapeCSV(summary.totalQuestionsAnalyzed)}`);
        lines.push(`Total Attempts Analyzed,${escapeCSV(summary.totalAttemptsAnalyzed ?? 0)}`);
        lines.push(`High Failure Questions Count,${escapeCSV(highFailureCount)}`);
        lines.push(`Average Accuracy,${escapeCSV(avgAcc + '%')}`);
        lines.push(`Average Failure Rate,${escapeCSV(avgFail + '%')}`);
    }
    lines.push('');

    // Section 2: Detailed Questions Table
    lines.push([
        'Question ID',
        'Quiz Title',
        'Quiz Category',
        'Question Prompt',
        'Question Type',
        'Total Attempts',
        'Correct Count',
        'Wrong Count',
        'Accuracy (%)',
        'Failure Rate (%)',
        'Most Common Misconception Choice',
        'Misconception Pick Count',
        'Explanation'
    ].map(escapeCSV).join(','));

    questions.forEach((q) => {
        lines.push([
            escapeCSV(q.questionId),
            escapeCSV(q.quizTitle),
            escapeCSV(q.quizCategory),
            escapeCSV(q.questionText),
            escapeCSV(q.type || 'multiple-choice'),
            escapeCSV(q.totalAttempts),
            escapeCSV(q.correctCount),
            escapeCSV(q.wrongCount),
            escapeCSV(q.accuracy + '%'),
            escapeCSV(q.failureRate + '%'),
            escapeCSV(q.mostCommonWrongChoice || 'N/A'),
            escapeCSV(q.mostCommonWrongCount || 0),
            escapeCSV(q.explanation || 'None provided')
        ].join(','));
    });

    const filename = `Question_Analytics_Report_${Date.now()}.csv`;
    downloadFile(lines.join('\r\n'), filename);
};

/**
 * Export any quiz to a standalone JSON file (identical structure to admin export).
 */
export const exportQuizToJSON = (quiz: Quiz): void => {
    const dataStr = JSON.stringify(quiz, null, 2);
    const safeTitle = (quiz.id || quiz.title || 'quiz').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '');
    const filename = `${safeTitle || 'quiz'}.json`;
    downloadFile(dataStr, filename, 'application/json;charset=utf-8;');
};

/**
 * Export a quiz into a printable PDF Assessment / Study Guide.
 */
export const exportQuizToPDF = async (quiz: Quiz): Promise<void> => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    const checkPageBreak = (neededHeight: number) => {
        if (y + neededHeight > pageHeight - margin) {
            doc.addPage();
            y = margin;
            renderPageHeader(false);
        }
    };

    const renderPageHeader = (isFirstPage: boolean) => {
        if (isFirstPage) {
            // Header Top Gradient Bar
            doc.setFillColor(79, 70, 229); // Indigo 600
            doc.rect(margin, y, contentWidth, 22, 'F');

            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.text('QUIZ ASSESSMENT & STUDY GUIDE', margin + 6, y + 9);

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(`Category: ${quiz.category || 'General'}  •  Difficulty: ${quiz.difficulty || 'Medium'}  •  Questions: ${quiz.questions?.length || 0}`, margin + 6, y + 16);
            y += 28;
        } else {
            // Continuation Header
            doc.setFillColor(243, 244, 246);
            doc.rect(margin, y, contentWidth, 8, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(107, 114, 128);
            doc.text(`${quiz.title || 'Quiz'} — Study Sheet`, margin + 4, y + 5.5);
            y += 12;
        }
    };

    renderPageHeader(true);

    // Summary Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 26, 3, 3, 'FD');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(quiz.title || 'Untitled Quiz', margin + 6, y + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    const descText = quiz.description || 'Practice assessment and study guide.';
    const splitDesc = doc.splitTextToSize(descText, contentWidth - 12);
    doc.text(splitDesc, margin + 6, y + 14);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(99, 102, 241);
    const timeLimitText = quiz.timeLimit === 0 ? 'Unlimited Time' : `${quiz.timeLimit} Minutes`;
    doc.text(`Time Limit: ${timeLimitText}  |  Passing Score: ${quiz.passingScore || 70}%  |  Rewards: ${quiz.coinsReward || 10} Coins, ${quiz.xpReward || 50} XP`, margin + 6, y + 21);

    y += 32;

    const questions = quiz.questions || [];

    questions.forEach((q, idx) => {
        checkPageBreak(35);

        const startY = y;
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(79, 70, 229);
        doc.text(`Question ${idx + 1} (${q.points || 10} pts)`, margin + 4, y + 6);
        y += 10;

        // Question text
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);
        const splitQuestion = doc.splitTextToSize(q.question, contentWidth - 8);
        doc.text(splitQuestion, margin + 4, y);
        y += splitQuestion.length * 4.2 + 2;

        // Code snippet if any
        if (q.codeSnippet) {
            checkPageBreak(20);
            doc.setFillColor(241, 245, 249);
            doc.setDrawColor(203, 213, 225);
            const snippetLines = doc.splitTextToSize(q.codeSnippet, contentWidth - 16);
            const snippetBoxHeight = snippetLines.length * 3.5 + 4;
            doc.roundedRect(margin + 4, y, contentWidth - 8, snippetBoxHeight, 2, 2, 'FD');
            doc.setFont('courier', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(30, 41, 59);
            doc.text(snippetLines, margin + 8, y + 4);
            y += snippetBoxHeight + 3;
        }

        // Options if multiple choice
        if (Array.isArray(q.options) && q.options.length > 0) {
            q.options.forEach((opt, optIdx) => {
                checkPageBreak(8);
                const letter = String.fromCharCode(65 + optIdx);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8.5);
                doc.setTextColor(71, 85, 105);
                const splitOpt = doc.splitTextToSize(`[   ]  ${letter}. ${opt}`, contentWidth - 10);
                doc.text(splitOpt, margin + 6, y);
                y += splitOpt.length * 3.8 + 1;
            });
            y += 2;
        }

        const cardHeight = y - startY + 2;
        doc.roundedRect(margin, startY, contentWidth, cardHeight, 2, 2, 'D');
        y += 5;
    });

    // Answer Key Section on a fresh page
    doc.addPage();
    y = margin;
    doc.setFillColor(15, 23, 42); // Dark slate header
    doc.rect(margin, y, contentWidth, 14, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('ANSWER KEY & EXPLANATIONS', margin + 6, y + 9);
    y += 20;

    questions.forEach((q, idx) => {
        checkPageBreak(25);
        const correctOptIndex = typeof q.correctAnswer === 'number'
            ? q.correctAnswer
            : (typeof q.correctAnswer === 'string' && !isNaN(Number(q.correctAnswer)) ? Number(q.correctAnswer) : null);
        const correctLetter = correctOptIndex !== null ? String.fromCharCode(65 + correctOptIndex) : '';
        const correctText = correctOptIndex !== null && Array.isArray(q.options) && q.options[correctOptIndex]
            ? q.options[correctOptIndex]
            : String(q.correctAnswer ?? 'N/A');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(16, 185, 129);
        doc.text(`Q${idx + 1}: ${correctLetter ? `(${correctLetter}) ` : ''}${correctText}`, margin + 4, y);
        y += 4.5;

        if (q.explanation) {
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            const splitExp = doc.splitTextToSize(`Explanation: ${q.explanation}`, contentWidth - 8);
            doc.text(splitExp, margin + 6, y);
            y += splitExp.length * 3.5 + 2;
        }
        y += 2;
    });

    // Page numbers
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175);
        doc.text(
            `Page ${i} of ${totalPages} — Quiz Platform Study Sheet`,
            pageWidth / 2,
            pageHeight - 6,
            { align: 'center' }
        );
    }

    const safeTitle = (quiz.title || 'Quiz').replace(/[^a-zA-Z0-9_-]/g, '_');
    doc.save(`${safeTitle}_Study_Sheet.pdf`);
};

/**
 * Export a user's entire quiz history / attempts to Excel-ready CSV.
 */
export const exportQuizHistoryToCSV = (attempts: AttemptData[], user?: UserData | null): void => {
    const lines: string[] = [];

    // UTF-8 BOM
    lines.push('\uFEFF');

    // Section 1: User Profile & History Summary
    lines.push('QUIZ PLATFORM — COMPLETE ASSESSMENT HISTORY');
    lines.push(`Export Date,${escapeCSV(new Date().toLocaleString())}`);
    if (user) {
        lines.push(`Student Name,${escapeCSV(user.name)}`);
        lines.push(`Student Email,${escapeCSV(user.email)}`);
        lines.push(`Level,${escapeCSV(user.level || 1)}`);
        lines.push(`Total XP,${escapeCSV(user.xp || 0)}`);
        lines.push(`Current Streak,${escapeCSV((user.streak || 0) + ' days')}`);
    }
    lines.push(`Total Quiz Attempts,${escapeCSV(attempts.length)}`);

    const passedCount = attempts.filter(a => a.passed || a.percentage >= 70).length;
    const avgScore = attempts.length > 0
        ? Math.round(attempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / attempts.length)
        : 0;

    lines.push(`Quizzes Passed,${escapeCSV(passedCount)}`);
    lines.push(`Average Score,${escapeCSV(avgScore + '%')}`);
    lines.push(''); // Blank row

    // Section 2: Attempts Table
    lines.push([
        '#',
        'Quiz Title',
        'Score',
        'Total Questions',
        'Percentage (%)',
        'Outcome',
        'Duration',
        'Date Completed',
        'Attempt ID'
    ].map(escapeCSV).join(','));

    const sortedAttempts = [...attempts].sort((a, b) =>
        new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime()
    );

    sortedAttempts.forEach((att, idx) => {
        const isPassed = att.passed !== undefined ? att.passed : (att.percentage >= 70);
        lines.push([
            escapeCSV(idx + 1),
            escapeCSV(att.quizTitle || 'Quiz'),
            escapeCSV(att.score ?? 0),
            escapeCSV(att.totalQuestions ?? 0),
            escapeCSV((att.percentage ?? 0) + '%'),
            escapeCSV(isPassed ? 'PASSED' : 'FAILED'),
            escapeCSV(formatDuration(att.timeTaken || 0)),
            escapeCSV(att.completedAt ? new Date(att.completedAt).toLocaleString() : 'N/A'),
            escapeCSV(att.attemptId || 'N/A')
        ].join(','));
    });

    const safeName = (user?.name || 'User').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${safeName}_Quiz_History.csv`;
    downloadFile(lines.join('\r\n'), filename);
};

/**
 * Export a user's entire quiz history as a structured PDF Academic Transcript.
 */
export const exportQuizHistoryToPDF = async (attempts: AttemptData[], user?: UserData | null): Promise<void> => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    const checkPageBreak = (neededHeight: number) => {
        if (y + neededHeight > pageHeight - margin) {
            doc.addPage();
            y = margin;
            renderPageHeader(false);
        }
    };

    const renderPageHeader = (isFirstPage: boolean) => {
        if (isFirstPage) {
            doc.setFillColor(79, 70, 229); // Indigo 600
            doc.rect(margin, y, contentWidth, 22, 'F');

            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.text('OFFICIAL QUIZ & ASSESSMENT TRANSCRIPT', margin + 6, y + 9);

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(`Generated: ${new Date().toLocaleString()}`, margin + 6, y + 16);
            y += 28;
        } else {
            doc.setFillColor(243, 244, 246);
            doc.rect(margin, y, contentWidth, 8, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(107, 114, 128);
            doc.text(`Academic Transcript — ${user?.name || 'Student'}`, margin + 4, y + 5.5);
            y += 12;
        }
    };

    renderPageHeader(true);

    // Summary Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 32, 3, 3, 'FD');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(user?.name || 'Student Profile', margin + 6, y + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`Email: ${user?.email || 'N/A'}  •  Level: ${user?.level || 1}  •  XP: ${user?.xp || 0}  •  Streak: ${user?.streak || 0} Days`, margin + 6, y + 15);

    const passedCount = attempts.filter(a => a.passed || a.percentage >= 70).length;
    const avgScore = attempts.length > 0
        ? Math.round(attempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / attempts.length)
        : 0;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(79, 70, 229);
    doc.text(`Total Attempts: ${attempts.length}  |  Passed: ${passedCount}  |  Average Score: ${avgScore}%`, margin + 6, y + 24);

    y += 38;

    // Table Header
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text('QUIZ TITLE', margin + 3, y + 5.5);
    doc.text('SCORE', margin + 95, y + 5.5);
    doc.text('RESULT', margin + 120, y + 5.5);
    doc.text('TIME', margin + 145, y + 5.5);
    doc.text('DATE', margin + 165, y + 5.5);
    y += 10;

    const sortedAttempts = [...attempts].sort((a, b) =>
        new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime()
    );

    sortedAttempts.forEach((att, idx) => {
        checkPageBreak(10);
        const isPassed = att.passed !== undefined ? att.passed : (att.percentage >= 70);

        if (idx % 2 === 1) {
            doc.setFillColor(248, 250, 252);
            doc.rect(margin, y - 3.5, contentWidth, 7.5, 'F');
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
        const splitTitle = doc.splitTextToSize(att.quizTitle || 'Quiz', 88);
        doc.text(splitTitle[0] || 'Quiz', margin + 3, y + 1);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text(`${att.score}/${att.totalQuestions} (${att.percentage}%)`, margin + 95, y + 1);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(isPassed ? 16 : 220, isPassed ? 185 : 38, isPassed ? 129 : 38);
        doc.text(isPassed ? 'PASSED' : 'FAILED', margin + 120, y + 1);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(formatDuration(att.timeTaken || 0), margin + 145, y + 1);
        doc.text(att.completedAt ? new Date(att.completedAt).toLocaleDateString() : 'Recent', margin + 165, y + 1);

        y += 7.5;
    });

    // Page numbering
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175);
        doc.text(
            `Page ${i} of ${totalPages} — Official Academic Record`,
            pageWidth / 2,
            pageHeight - 6,
            { align: 'center' }
        );
    }

    const safeName = (user?.name || 'Student').replace(/[^a-zA-Z0-9_-]/g, '_');
    doc.save(`${safeName}_Quiz_History_Transcript.pdf`);
};

/**
 * Export user quiz history as a JSON dataset.
 */
export const exportQuizHistoryToJSON = (attempts: AttemptData[], user?: UserData | null): void => {
    const data = {
        exportedAt: new Date().toISOString(),
        student: user ? {
            name: user.name,
            email: user.email,
            level: user.level,
            xp: user.xp,
            streak: user.streak,
            totalAttempts: user.totalAttempts
        } : null,
        totalAttempts: attempts.length,
        attempts
    };

    const dataStr = JSON.stringify(data, null, 2);
    const safeName = (user?.name || 'User').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${safeName}_Quiz_History.json`;
    downloadFile(dataStr, filename, 'application/json;charset=utf-8;');
};

