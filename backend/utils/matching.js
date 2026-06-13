/**
 * matching.js
 *
 * Compares form fields against IDfy webhook parsed_details:
 *
 *   Form:    firstName + middleName + lastName  →  parsed_details.name
 *   Form:    state                              →  parsed_details.state
 */

// ── Name matching ─────────────────────────────────────────────────

/**
 * Normalize a name string:
 * - Uppercase
 * - Remove anything that isn't a letter or space
 * - Collapse multiple spaces to one
 * - Trim
 *
 * "Mohammed Jaseem Ahamed" → "MOHAMMED JASEEM AHAMED"
 * "mohammed jaseem ahamed" → "MOHAMMED JASEEM AHAMED"
 * "Mohammed  Jaseem  Ahamed" → "MOHAMMED JASEEM AHAMED"
 */
const normalizeName = (name) => {
  if (!name) return '';
  return name
    .toUpperCase()
    .replace(/[^A-Z\s]/g, '')   // keep only letters + spaces
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Build full name from form fields:
 *   firstName + middleName (optional) + lastName
 *
 * "Mohammed" + "Jaseem" + "Ahamed" → "Mohammed Jaseem Ahamed"
 * "Mohammed" + ""       + "Ahamed" → "Mohammed Ahamed"
 */
const buildFullName = (firstName, middleName, lastName) => {
  return [firstName, middleName, lastName]
    .map(s => (s || '').trim())
    .filter(Boolean)
    .join(' ');
};

/**
 * Compare form full name against Aadhaar name.
 *
 * Strategy:
 *  1. Exact match after normalization.
 *  2. All significant parts of the form name appear in the Aadhaar name
 *     (handles cases where Aadhaar has extra initials or shortened name).
 *
 * Examples that pass:
 *   "Mohammed Jaseem Ahamed" vs "Mohammed Jaseem Ahamed"  → true
 *   "mohammed jaseem ahamed" vs "MOHAMMED JASEEM AHAMED"  → true
 *   "Jaseem Ahamed"          vs "Mohammed Jaseem Ahamed"  → true  (subset)
 *   "Jaseem M Ahamed"        vs "Jaseem M Ahamed"         → true
 */
const namesMatch = (formName, aadhaarName) => {
  const norm1 = normalizeName(formName);
  const norm2 = normalizeName(aadhaarName);

  if (!norm1 || !norm2) return false;

  // 1. Exact
  if (norm1 === norm2) return true;

  // 2. All parts of form name found in Aadhaar name
  const parts1 = norm1.split(' ').filter(p => p.length > 1); // ignore single initials
  const parts2 = norm2.split(' ');
  if (parts1.length > 0 && parts1.every(p => parts2.includes(p))) return true;

  return false;
};

// ── State matching ────────────────────────────────────────────────

/**
 * Canonical alias map.
 * Key   = any variant (UPPERCASE, trimmed)
 * Value = canonical form
 */
const STATE_ALIASES = {
  // Delhi
  'DELHI':                                      'DELHI',
  'NEW DELHI':                                  'DELHI',
  'NCT OF DELHI':                               'DELHI',
  'NATIONAL CAPITAL TERRITORY OF DELHI':        'DELHI',

  // Jammu & Kashmir
  'JAMMU AND KASHMIR':                          'JAMMU AND KASHMIR',
  'JAMMU & KASHMIR':                            'JAMMU AND KASHMIR',
  'J&K':                                        'JAMMU AND KASHMIR',

  // Uttarakhand
  'UTTARAKHAND':                                'UTTARAKHAND',
  'UTTARANCHAL':                                'UTTARAKHAND',

  // Odisha
  'ODISHA':                                     'ODISHA',
  'ORISSA':                                     'ODISHA',

  // Puducherry
  'PUDUCHERRY':                                 'PUDUCHERRY',
  'PONDICHERRY':                                'PUDUCHERRY',

  // Andhra Pradesh
  'ANDHRA PRADESH':                             'ANDHRA PRADESH',
  'ANDHRA PRADESH (NEW)':                       'ANDHRA PRADESH',
  'ANDHRA PRADESH (COMBINED)':                  'ANDHRA PRADESH',

  // Telangana
  'TELANGANA':                                  'TELANGANA',
};

/**
 * Normalize a state string:
 * - Uppercase
 * - Trim
 * - Collapse spaces
 * - Map via alias table
 *
 * "nct of delhi" → "DELHI"
 * "Karnataka"    → "KARNATAKA"
 */
const normalizeState = (state) => {
  if (!state) return '';
  const upper = state.toUpperCase().replace(/\s+/g, ' ').trim();
  return STATE_ALIASES[upper] || upper;
};

/**
 * Compare form state against Aadhaar state.
 */
const statesMatch = (formState, aadhaarState) => {
  const s1 = normalizeState(formState);
  const s2 = normalizeState(aadhaarState);
  if (!s1 || !s2) return false;
  return s1 === s2;
};

module.exports = {
  normalizeName,
  buildFullName,
  namesMatch,
  normalizeState,
  statesMatch,
};
