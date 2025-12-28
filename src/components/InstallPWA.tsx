import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

const InstallPWA = () => {
    const [supportsPWA, setSupportsPWA] = useState(false);
    const [promptInstall, setPromptInstall] = useState<any>(null);

    useEffect(() => {
        const handler = (e: any) => {
            e.preventDefault();
            setSupportsPWA(true);
            setPromptInstall(e);
        };
        window.addEventListener('beforeinstallprompt', handler);

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const onClick = (evt: React.MouseEvent) => {
        evt.preventDefault();
        if (!promptInstall) {
            return;
        }
        promptInstall.prompt();
    };

    if (!supportsPWA) {
        return null;
    }

    return (
        <button
            className="fixed bottom-4 right-4 bg-purple-600 dark:bg-purple-500 text-white p-3 rounded-full shadow-lg hover:bg-purple-700 dark:hover:bg-purple-600 transition-all z-50 flex items-center gap-2 animate-bounce"
            id="setup_button"
            aria-label="Install app"
            title="Install App"
            onClick={onClick}
        >
            <Download className="w-6 h-6" />
            <span className="sr-only">Install App</span>
        </button>
    );
};

export default InstallPWA;
