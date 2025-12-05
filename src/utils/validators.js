export function isEmail(email) { return /\S+@\S+\.\S+/.test(email); }
export function isTime24h(str) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(str); }
