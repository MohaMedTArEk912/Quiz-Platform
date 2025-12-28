import { forwardRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Award } from 'lucide-react';

interface CertificateProps {
    userName: string;
    courseTitle: string;
    score: number;
    totalQuestions: number;
    date: string;
    certificateId: string;
}

export const Certificate = forwardRef<HTMLDivElement, CertificateProps>(({
    userName,
    courseTitle,
    score,
    totalQuestions,
    date,
    certificateId
}, ref) => {
    const percentage = Math.round((score / totalQuestions) * 100);

    return (
        <div className="hidden"> {/* Hidden from normal view, used for capture */}
            <div
                ref={ref}
                className="w-[1000px] h-[700px] bg-white text-gray-900 p-10 relative overflow-hidden"
                style={{ fontFamily: 'Georgia, serif' }}
            >
                {/* Decorative Border */}
                <div className="absolute inset-4 border-4 border-double border-indigo-900 z-10"></div>
                <div className="absolute inset-6 border border-indigo-200 z-10"></div>

                {/* Corner Decorations */}
                <div className="absolute top-4 left-4 w-16 h-16 border-t-4 border-l-4 border-indigo-900 z-20"></div>
                <div className="absolute top-4 right-4 w-16 h-16 border-t-4 border-r-4 border-indigo-900 z-20"></div>
                <div className="absolute bottom-4 left-4 w-16 h-16 border-b-4 border-l-4 border-indigo-900 z-20"></div>
                <div className="absolute bottom-4 right-4 w-16 h-16 border-b-4 border-r-4 border-indigo-900 z-20"></div>

                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-5 z-0 flex items-center justify-center">
                    <Award className="w-[500px] h-[500px]" />
                </div>

                {/* Content */}
                <div className="relative z-30 h-full flex flex-col items-center justify-center text-center space-y-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Award className="w-12 h-12 text-indigo-700" />
                        <span className="text-2xl font-bold text-indigo-900 tracking-widest uppercase">
                            Quiz Platform Academy
                        </span>
                    </div>

                    <h1 className="text-6xl font-bold text-indigo-900 mb-2">
                        Certificate of Achievement
                    </h1>

                    <p className="text-xl text-gray-600 italic">
                        This is to certify that
                    </p>

                    <div className="text-5xl font-bold text-indigo-700 border-b-2 border-indigo-200 pb-2 px-12 min-w-[400px]">
                        {userName}
                    </div>

                    <p className="text-xl text-gray-600 italic mt-4">
                        has successfully completed the quiz
                    </p>

                    <div className="text-4xl font-bold text-gray-800 my-2">
                        {courseTitle}
                    </div>

                    <p className="text-lg text-gray-600">
                        with a score of <span className="font-bold text-indigo-700">{percentage}%</span>
                        <br />
                        ({score} out of {totalQuestions} correct)
                    </p>

                    <div className="flex justify-between items-end w-full px-20 mt-12">
                        <div className="text-center">
                            <div className="text-lg font-bold text-indigo-900 border-t border-gray-400 pt-2 px-8">
                                {date}
                            </div>
                            <div className="text-sm text-gray-500 uppercase tracking-wider mt-1">Date</div>
                        </div>

                        <div className="flex flex-col items-center">
                            {/* QR Code for verification */}
                            <div className="border-4 border-white shadow-lg">
                                <QRCodeSVG value={`https://quiz-platform.app/verify/${certificateId}`} size={80} level="H" />
                            </div>
                            <div className="text-[10px] text-gray-400 mt-2 font-mono">
                                ID: {certificateId}
                            </div>
                        </div>

                        <div className="text-center">
                            <div className="text-lg font-bold text-indigo-900 border-t border-gray-400 pt-2 px-8" style={{ fontFamily: 'Cursive' }}>
                                Quiz Master
                            </div>
                            <div className="text-sm text-gray-500 uppercase tracking-wider mt-1">Instructor</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

Certificate.displayName = 'Certificate';
