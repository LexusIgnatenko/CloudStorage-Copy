export function getCsrfToken() {
    if (typeof document !== 'undefined') {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; csrftoken=`);

        if (parts.length === 2) {
            return parts.pop().split(';').shift();
        }
    }
    return null;
}
