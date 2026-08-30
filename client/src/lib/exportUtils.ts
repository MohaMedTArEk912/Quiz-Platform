import { jsPDF } from 'jspdf';
import type { DetailedAttemptData, QuestionAnalyticsItem, QuestionAnalyticsSummary } from '../types';

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

        const result = q.isCorrect ? 'CORRECT' : 'WRONG';
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
    const wrongCount = breakdown.filter(q => !q.isCorrect).length;

    doc.text(`Score: ${attempt.score} pts  |  Total: ${breakdown.length} Qs  |  Correct: ${correctCount}  |  Wrong: ${wrongCount}  |  Duration: ${formatDuration(attempt.timeTaken || 0)}`, margin + 6, y + 26);

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

        const isWrong = !q.isCorrect;
        const cardBg = isWrong ? [254, 242, 242] : [240, 253, 244];
        const cardBorder = isWrong ? [254, 202, 202] : [187, 247, 208];

        doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
        doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2]);

        const startY = y;
        // Question Header line
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(isWrong ? 220 : 16, isWrong ? 38 : 185, isWrong ? 38 : 129);
        doc.text(`Question ${idx + 1} (${q.points || 10} pts) — ${isWrong ? 'WRONG' : 'CORRECT'}`, margin + 4, y + 5);

        y += 8;

        // Question text wrapped
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(30, 41, 59);
        const splitQuestion = doc.splitTextToSize(q.question, contentWidth - 8);
        doc.text(splitQuestion, margin + 4, y);
        y += splitQuestion.length * 4 + 2;

        // Student Answer
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

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(isWrong ? 185 : 16, isWrong ? 28 : 150, isWrong ? 28 : 100);
        const splitStudentAns = doc.splitTextToSize(`Student Answer: ${studentAns}`, contentWidth - 8);
        doc.text(splitStudentAns, margin + 4, y);
        y += splitStudentAns.length * 3.5 + 1;

        if (isWrong) {
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
        lines.push(`Total Questions Analyzed,${escapeCSV(summary.totalQuestionsAnalyzed)}`);
        lines.push(`High Failure Questions Count,${escapeCSV(summary.highFailureQuestionsCount)}`);
        lines.push(`Average Accuracy,${escapeCSV(summary.averageAccuracy + '%')}`);
        lines.push(`Average Failure Rate,${escapeCSV(summary.averageFailureRate + '%')}`);
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
