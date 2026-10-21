export function selectTrackNotes(notes, track) {
    return track === 'all' ? Array.from(notes) : notes.filter(note => String(note.track) === track);
}
export function maximumNoteDuration(notes) {
    return notes.reduce((max, n) => Math.max(max, Math.max(0, n.end - n.start)), 0);
}
export function clampPlaybackPosition(at, duration) {
    const end = Number.isFinite(duration) ? Math.max(0, duration) : 0;
    return Number.isFinite(at) ? Math.max(0, Math.min(end, at)) : 0;
}
export function formatSongTime(at) {
    const sec = Number.isFinite(at) ? Math.max(0, Math.floor(at)) : 0;
    return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
}
