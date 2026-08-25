import { defaultAlgorithmName, MAX_ALGORITHMS } from './algorithms';
import { invertAlg, isValidAlg, normalizeAlg } from './moves';

/** Pure decisions at the workbench/persistence seam. Components only collect
 * input; the answer to create-versus-edit and refusal stays testable in node. */
export const workbenchDraft = (algorithms, entry) => ({
  id: entry ? entry.id : null,
  moves: entry ? entry.moves : '',
  setup: entry ? entry.setup || invertAlg(entry.moves) : '',
  name: entry ? entry.name : defaultAlgorithmName(algorithms),
  assignments: entry ? entry.assignments : [],
});

export const workbenchSave = ({ id, moves, setup, name, assignments }, librarySize) => {
  const normalized = normalizeAlg(moves);
  if (!normalized || !isValidAlg(normalized)) return { ok: false, reason: 'empty' };
  if (!id && librarySize >= MAX_ALGORITHMS) return { ok: false, reason: 'full' };
  const normalizedSetup = normalizeAlg(setup);
  if (normalizedSetup && !isValidAlg(normalizedSetup)) return { ok: false, reason: 'setup' };
  return { ok: true, mode: id ? 'edit' : 'create', id, fields: { moves: normalized, setup: normalizedSetup, name, assignments } };
};

/** The authored start is the cube actually visible at confirmation time, not
 * moves later in the setup track that the operator scrubbed behind. */
export const setupAt = (tokens, index) => (tokens || []).slice(0, Math.max(0, index)).join(' ');
