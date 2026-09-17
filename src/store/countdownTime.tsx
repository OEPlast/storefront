/**
 * Time left until the end of today. Takes the clock as an argument so a component can pass the
 * render clock (`useNow()`): pages are cached, so a component that called `Date.now()` here would
 * render different digits on the server and at hydration. See hooks/useNow.tsx.
 */
export const countdownTime = (nowMs: number = Date.now()) => {
    const now = new Date(nowMs);

    // End of today at 23:59:59.999 local time
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    // If for any reason we're past endOfToday, fallback to tomorrow's end (rare edge)
    let diffMs = endOfToday.getTime() - now.getTime();
    if (diffMs < 0) {
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        tomorrow.setHours(23, 59, 59, 999);
        diffMs = tomorrow.getTime() - now.getTime();
    }

    const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
    const days = Math.floor(totalSeconds / 86400); // will be 0 for "today" countdown
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return { days, hours, minutes, seconds };
};