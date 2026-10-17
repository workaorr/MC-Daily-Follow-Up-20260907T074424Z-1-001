// Passcode Hashing & Verification (SHA-256 via Web Crypto API with Fallback)

export const SALT_KEY = 'MC_SECURE_SALT_2026_V1#';

export const hashPasscode = async (passcode) => {
    if (!passcode) return '';
    try {
        if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
            const encoder = new TextEncoder();
            const data = encoder.encode(SALT_KEY + String(passcode).trim());
            const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        }
    } catch (e) {
        console.warn('Web Crypto API subtle digest error, fallback used', e);
    }
    let hash = 0;
    const str = SALT_KEY + String(passcode).trim();
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return 'mc_hash_' + Math.abs(hash).toString(16);
};

export const verifyPasscode = async (inputPasscode, storedPasscode) => {
    if (!storedPasscode) return false;
    const cleanInput = String(inputPasscode).trim();
    const cleanStored = String(storedPasscode).trim();
    if (cleanInput === cleanStored) return true; // Direct match (legacy plain text like '1234')
    const hashed = await hashPasscode(cleanInput);
    return hashed === cleanStored;
};
