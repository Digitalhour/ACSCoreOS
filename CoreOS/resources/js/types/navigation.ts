export const isExternalUrl = (url: string): boolean => {
    return url.startsWith('http://') || url.startsWith('https://');
};

export const isInternalUrl = (url: string): boolean => {
    return url.startsWith('/') || url === '#';
};
