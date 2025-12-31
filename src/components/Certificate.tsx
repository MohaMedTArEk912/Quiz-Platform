import { forwardRef } from 'react';

import { Award, CheckCircle, ShieldCheck } from 'lucide-react';

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
    date
}, ref) => {
    const percentage = Math.round((score / totalQuestions) * 100);

    return (
        <div>
            <div
                ref={ref}
                style={{
                    width: '1000px',
                    height: '700px',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: '#ffffff',
                    color: '#1a202c',
                    boxSizing: 'border-box'
                }}
            >
                {/* --- Background & Border Elements --- */}

                {/* Main Gold Border Frame */}
                <div
                    style={{
                        position: 'absolute',
                        inset: '16px',
                        zIndex: 20,
                        pointerEvents: 'none',
                        border: '4px solid #D4AF37',
                        boxSizing: 'border-box'
                    }}
                ></div>

                {/* Secondary Inner Border */}
                <div
                    style={{
                        position: 'absolute',
                        inset: '24px',
                        zIndex: 20,
                        pointerEvents: 'none',
                        border: '1px solid #0F172A',
                        boxSizing: 'border-box'
                    }}
                ></div>

                {/* Corner Accents (Top-Left) */}
                <div style={{
                    position: 'absolute',
                    top: '16px',
                    left: '16px',
                    zIndex: 30,
                    width: '128px',
                    height: '128px',
                    borderTop: '8px solid #0F172A',
                    borderLeft: '8px solid #0F172A',
                    boxSizing: 'border-box'
                }}></div>

                {/* Corner Accents (Bottom-Right) */}
                <div style={{
                    position: 'absolute',
                    bottom: '16px',
                    right: '16px',
                    zIndex: 30,
                    width: '128px',
                    height: '128px',
                    borderBottom: '8px solid #D4AF37',
                    borderRight: '8px solid #D4AF37',
                    boxSizing: 'border-box'
                }}></div>

                {/* Background Texture/Gradient */}
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        zIndex: 0,
                        background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                        opacity: 0.5
                    }}
                ></div>

                {/* Watermark */}
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0.03
                }}>
                    <ShieldCheck size={600} color="#000000" />
                </div>


                {/* --- Header Section --- */}
                <div style={{
                    position: 'relative',
                    zIndex: 10,
                    width: '100%',
                    textAlign: 'center',
                    paddingTop: '80px'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        marginBottom: '24px'
                    }}>
                        <Award size={40} color="#D4AF37" />
                        <span style={{
                            fontSize: '20px',
                            fontWeight: 'bold',
                            letterSpacing: '0.3em',
                            textTransform: 'uppercase',
                            color: '#0F172A'
                        }}>
                            Quiz Platform Academy
                        </span>
                        <Award size={40} color="#D4AF37" />
                    </div>

                    <h1 style={{
                        fontSize: '72px',
                        fontWeight: 'bold',
                        marginBottom: '16px',
                        color: '#0F172A',
                        fontFamily: 'serif'
                    }}>
                        Certificate of Excellence
                    </h1>

                    <p style={{
                        fontSize: '18px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        color: '#64748B'
                    }}>
                        This certificate is proudly presented to
                    </p>
                </div>

                {/* --- Candidate Name Section --- */}
                <div style={{
                    position: 'relative',
                    zIndex: 10,
                    width: '100%',
                    textAlign: 'center',
                    padding: '24px 0'
                }}>
                    <div style={{
                        fontSize: '60px',
                        fontWeight: 'bold',
                        padding: '16px 48px',
                        display: 'inline-block',
                        fontStyle: 'italic',
                        color: '#D4AF37',
                        borderBottom: '2px solid #E2E8F0',
                        minWidth: '600px',
                        fontFamily: 'serif'
                    }}
                    >
                        {userName}
                    </div>
                </div>

                {/* --- Body Text Section --- */}
                <div style={{
                    position: 'relative',
                    zIndex: 10,
                    width: '100%',
                    textAlign: 'center',
                    maxWidth: '768px',
                    margin: '0 auto',
                    padding: '0 48px'
                }}>
                    <p style={{
                        fontSize: '20px',
                        lineHeight: '1.625',
                        color: '#334155'
                    }}>
                        For successfully completing the comprehensive assessment for
                        <br />
                        <span style={{
                            fontSize: '30px',
                            fontWeight: 'bold',
                            display: 'block',
                            marginTop: '12px',
                            marginBottom: '12px',
                            color: '#0F172A'
                        }}>
                            {courseTitle}
                        </span>
                        Demonstrating exceptional proficiency with a score of
                        <strong style={{
                            fontSize: '24px',
                            marginLeft: '8px',
                            color: '#D4AF37'
                        }}>{percentage}%</strong>
                    </p>
                </div>

                {/* --- Footer / Verification Section --- */}
                <div style={{
                    position: 'relative',
                    zIndex: 50,
                    width: '100%',
                    padding: '0 96px 160px 96px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end',
                    marginTop: 'auto'
                }}>

                    {/* Date Signature */}
                    <div style={{ textAlign: 'center' }}>
                        <div style={{
                            fontSize: '18px',
                            fontWeight: 'bold',
                            marginBottom: '8px',
                            color: '#0F172A'
                        }}>
                            {date}
                        </div>
                        <div style={{ height: '1px', width: '160px', backgroundColor: '#9CA3AF', marginBottom: '8px' }}></div>
                        <div style={{
                            fontSize: '12px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            fontWeight: 'bold',
                            color: '#94A3B8'
                        }}>
                            Date Issued
                        </div>
                    </div>

                    {/* Instructor Signature */}
                    <div style={{ textAlign: 'center' }}>
                        <div style={{
                            fontSize: '24px',
                            marginBottom: '8px',
                            fontStyle: 'italic',
                            fontFamily: '"Dancing Script", cursive, serif',
                            color: '#0F172A'
                        }}
                        >
                            Quiz Master
                        </div>
                        <div style={{ height: '1px', width: '160px', backgroundColor: '#9CA3AF', marginBottom: '8px' }}></div>
                        <div style={{
                            fontSize: '12px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            fontWeight: 'bold',
                            color: '#94A3B8'
                        }}>
                            Certified Instructor
                        </div>
                    </div>
                </div>

                {/* Ribbon/Badge Decoration (Bottom Center-ish or corner) */}
                <div style={{
                    position: 'absolute',
                    bottom: '80px',
                    right: '208px',
                    zIndex: 20
                }}>
                    <CheckCircle size={64} color="#D4AF37" style={{ opacity: 0.2 }} />
                </div>

            </div>
        </div>
    );
});

Certificate.displayName = 'Certificate';
