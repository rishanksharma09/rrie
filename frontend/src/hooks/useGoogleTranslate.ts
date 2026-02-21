/**
 * Hook to control Google Translate programmatically.
 * Reads the active language from the googtrans cookie (set by triggerGoogleTranslate).
 */
export const useGoogleTranslate = () => {
    // Read current language from cookie (most reliable after reload)
    const getActiveLang = (): 'en' | 'hi' => {
        const match = document.cookie.match(/googtrans=([^;]+)/);
        if (match) {
            const parts = match[1].split('/').filter(Boolean);
            const lang = parts[parts.length - 1];
            if (lang === 'hi') return 'hi';
        }
        return 'en';
    };

    const activeLang = getActiveLang();

    const switchLanguage = (lang: 'en' | 'hi') => {
        (window as any).triggerGoogleTranslate?.(lang);
    };

    return { activeLang, switchLanguage };
};
