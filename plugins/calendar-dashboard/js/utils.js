export const formatDate = (date) => new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

export const formatTime = (date) => date ? new Date(date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';

export function getMeetingLink(event) {
    if (event.hangoutLink) return event.hangoutLink;
    const text = `${event.location || ''} ${event.description || ''}`;
    const meetRegex = /(https?:\/\/(?:teams\.microsoft\.com\/l\/meetup-join|meet\.google\.com|[^/]+\.zoom\.us\/j)\/[^\s<]+)/;
    const match = text.match(meetRegex);
    if (match) return match[0];
    const videoEntry = event.conferenceData?.entryPoints?.find(ep => ep.entryPointType === 'video');
    return videoEntry?.uri || null;
}