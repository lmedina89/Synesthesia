const KEY = 'garden-notes-v1';
const defaults = { instrument: 'piano', octave: 4, showLabels: true, sound: true, correct: 0, best: 0, clef: 'treble' };
const validScore = (value) => Number.isInteger(value) && typeof value === 'number' && value >= 0 && value < 1e9 ? value : 0;
export function normalizePreferences(value) {
    const data = (value && typeof value === 'object' && !Array.isArray(value)) ? value : {};
    return {
        instrument: data.instrument === 'kalimba' ? 'kalimba' : 'piano',
        octave: typeof data.octave === 'number' && Number.isFinite(data.octave) ? Math.max(2, Math.min(6, Math.floor(data.octave))) : 4,
        showLabels: typeof data.showLabels === 'boolean' ? data.showLabels : true,
        sound: typeof data.sound === 'boolean' ? data.sound : true,
        correct: validScore(data.correct),
        best: validScore(data.best),
        clef: data.clef === 'bass' ? 'bass' : 'treble'
    };
}
export function loadAppPreferences(storage) {
    let decoded = defaults;
    try {
        const raw = (storage ?? localStorage).getItem(KEY);
        if (raw)
            decoded = JSON.parse(raw);
    }
    catch { /* Private browsing or corrupt data; defaults remain. */ }
    return { ...normalizePreferences(decoded), mode: 'explore', current: null, answered: false, streak: 0, drillIndex: -1 };
}
export function persistAppPreferences(state, storage) {
    try {
        (storage ?? localStorage).setItem(KEY, JSON.stringify(normalizePreferences(state)));
        return true;
    }
    catch {
        return false;
    }
}
