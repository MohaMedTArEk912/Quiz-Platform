import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop component ensures that navigating to any route (including from the footer)
 * smoothly scrolls the viewport to the top of the page or to an anchored section.
 */
const ScrollToTop: React.FC = () => {
    const { pathname, hash } = useLocation();

    useEffect(() => {
        if (hash) {
            const elementId = hash.replace('#', '');
            const target = document.getElementById(elementId);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                return;
            }
        }

        window.scrollTo({
            top: 0,
            left: 0,
            behavior: 'smooth'
        });
    }, [pathname, hash]);

    return null;
};

export default ScrollToTop;
