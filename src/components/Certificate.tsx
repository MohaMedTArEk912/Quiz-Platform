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
        <div> {/* Removed hidden class to allow html2canvas capture; visibility handled by parent */}
            <div
                ref={ref}
                className="w-[1000px] h-[700px] p-10 relative overflow-hidden"
                style={{
                    fontFamily: 'Georgia, serif',
                    backgroundColor: '#ffffff',
                    color: '#111827' // gray-900
                }}
            >
                {/* Decorative Border */}
                <div
                    className="absolute inset-4 border-4 border-double z-10"
                    style={{ borderColor: '#312e81' }} // indigo-900
                ></div>
                <div
                    className="absolute inset-6 border z-10"
                    style={{ borderColor: '#c7d2fe' }} // indigo-200
                ></div>

                {/* Corner Decorations */}
                <div className="absolute top-4 left-4 w-16 h-16 border-t-4 border-l-4 z-20" style={{ borderColor: '#312e81' }}></div>
                <div className="absolute top-4 right-4 w-16 h-16 border-t-4 border-r-4 z-20" style={{ borderColor: '#312e81' }}></div>
                <div className="absolute bottom-4 left-4 w-16 h-16 border-b-4 border-l-4 z-20" style={{ borderColor: '#312e81' }}></div>
                <div className="absolute bottom-4 right-4 w-16 h-16 border-b-4 border-r-4 z-20" style={{ borderColor: '#312e81' }}></div>

                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-5 z-0 flex items-center justify-center">
                    <Award className="w-[500px] h-[500px]" color="#000000" />
                </div>

                {/* Content */}
                <div className="relative z-30 h-full flex flex-col items-center justify-center text-center space-y-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Award className="w-12 h-12" color="#4338ca" /> {/* indigo-700 */}
                        <span
                            className="text-2xl font-bold tracking-widest uppercase"
                            style={{ color: '#312e81' }} // indigo-900
                        >
                            Quiz Platform Academy
                        </span>
                    </div>

                    <h1
                        className="text-6xl font-bold mb-2"
                        style={{ color: '#312e81' }} // indigo-900
                    >
                        Certificate of Achievement
                    </h1>

                    <p
                        className="text-xl italic"
                        style={{ color: '#4b5563' }} // gray-600
                    >
                        This is to certify that
                    </p>

                    <div
                        className="text-5xl font-bold border-b-2 pb-2 px-12 min-w-[400px]"
                        style={{
                            color: '#4338ca', // indigo-700
                            borderColor: '#c7d2fe' // indigo-200
                        }}
                    >
                        {userName}
                    </div>

                    <p
                        className="text-xl italic mt-4"
                        style={{ color: '#4b5563' }} // gray-600
                    >
                        has successfully completed the quiz
                    </p>

                    <div
                        className="text-4xl font-bold my-2"
                        style={{ color: '#1f2937' }} // gray-800
                    >
                        {courseTitle}
                    </div>

                    <p
                        className="text-lg"
                        style={{ color: '#4b5563' }} // gray-600
                    >
                        with a score of <span className="font-bold" style={{ color: '#4338ca' }}>{percentage}%</span>
                        <br />
                        ({score} out of {totalQuestions} correct)
                    </p>

                    <div className="flex justify-between items-end w-full px-20 mt-12">
                        <div className="text-center">
                            <div
                                className="text-lg font-bold border-t pt-2 px-8"
                                style={{
                                    color: '#312e81', // indigo-900
                                    borderColor: '#9ca3af' // gray-400
                                }}
                            >
                                {date}
                            </div>
                            <div
                                className="text-sm uppercase tracking-wider mt-1"
                                style={{ color: '#6b7280' }} // gray-500
                            >
                                Date
                            </div>
                        </div>

                        <div className="flex flex-col items-center">
                            {/* QR Code for verification */}
                            <div className="border-4 bg-white shadow-lg" style={{ borderColor: '#ffffff' }}>
                                <QRCodeSVG value={`https://quiz-platform.app/verify/${certificateId}`} size={80} level="H" />
                            </div>
                            <div
                                className="text-[10px] mt-2 font-mono"
                                style={{ color: '#9ca3af' }} // gray-400
                            >
                                ID: {certificateId}
                            </div>
                        </div>

                        <div className="text-center">
                            <div
                                className="text-lg font-bold border-t pt-2 px-8"
                                style={{
                                    fontFamily: 'Cursive',
                                    color: '#312e81', // indigo-900
                                    borderColor: '#9ca3af' // gray-400
                                }}
                            >
                                Quiz Master
                            </div>
                            <div
                                className="text-sm uppercase tracking-wider mt-1"
                                style={{ color: '#6b7280' }} // gray-500
                            >
                                Instructor
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

Certificate.displayName = 'Certificate';
