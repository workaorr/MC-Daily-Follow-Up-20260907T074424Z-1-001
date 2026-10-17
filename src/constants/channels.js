export const DEFAULT_SOURCE_CHANNELS = [
    'facebook',
    'line',
    'ค้นหาหน้า google',
    'tiktok',
    'doopenteam',
    'เพื่อนแนะนำ'
];

export const getChannelIcon = (chName) => {
    const lower = (chName || '').toLowerCase();
    if (lower.includes('facebook') || lower.includes('fb')) return '🌐';
    if (lower.includes('line')) return '💬';
    if (lower.includes('google')) return '🔍';
    if (lower.includes('tiktok')) return '🎵';
    if (lower.includes('doopen') || lower.includes('team')) return '👥';
    if (lower.includes('เพื่อน') || lower.includes('friend')) return '🤝';
    if (lower.includes('เซียน')) return '👑';
    if (lower.includes('ig') || lower.includes('instagram')) return '📸';
    if (lower.includes('youtube')) return '▶️';
    if (lower.includes('twitter') || lower.includes('x')) return '🐦';
    return '📢';
};
