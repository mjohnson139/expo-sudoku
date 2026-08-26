import { UNASSIGNED } from './algorithms';
import { METHODS } from './methods';

export const MAX_USER_METHODS = 30;
export const MAX_METHOD_NAME = 40;
export const MAX_STAGES = 12;
export const MAX_STAGE_NAME = 40;

const text = (value, max) => String(value == null ? '' : value).trim().replace(/\s+/g, ' ').slice(0, max);
export const normalizeMethodName = (value) => text(value, MAX_METHOD_NAME);
export const normalizeStageName = (value) => text(value, MAX_STAGE_NAME);

const unique = (wanted, taken, fallback) => {
  const base = wanted || fallback;
  if (!taken.has(base)) return base;
  for (let n = 2; n < 100; n += 1) {
    const suffix = ` ${n}`;
    const candidate = `${base.slice(0, MAX_METHOD_NAME - suffix.length).trim()}${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
  return base;
};

export const nextMethodId = (methods) => {
  const used = new Set([UNASSIGNED, ...METHODS.map((method) => method.id), ...(methods || []).map((method) => method.id)]);
  let n = 1;
  while (used.has(`user-method-${n}`)) n += 1;
  return `user-method-${n}`;
};

const cleanStages = (raw) => {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  return raw.reduce((result, value) => {
    const stage = normalizeStageName(value);
    const key = stage.toLowerCase();
    if (!stage || seen.has(key) || result.length >= MAX_STAGES) return result;
    seen.add(key);
    result.push(stage);
    return result;
  }, []);
};

export const sanitizeUserMethods = (raw, presets = METHODS) => {
  if (!Array.isArray(raw)) return [];
  const reserved = new Set([UNASSIGNED, ...presets.map((method) => method.id)]);
  const names = new Set(presets.map((method) => method.name));
  const clean = [];
  raw.forEach((entry) => {
    if (!entry || typeof entry !== 'object' || clean.length >= MAX_USER_METHODS) return;
    const id = typeof entry.id === 'string' ? entry.id : '';
    const name = normalizeMethodName(entry.name);
    const stages = cleanStages(entry.stages);
    if (!id.startsWith('user-method-') || reserved.has(id) || !name || names.has(name) || stages.length === 0) return;
    reserved.add(id);
    names.add(name);
    const savedAt = Number.isFinite(entry.savedAt) ? entry.savedAt : 0;
    clean.push({ id, name, stages, forNewSolves: entry.forNewSolves !== false,
      from: presets.some((method) => method.id === entry.from) || clean.some((method) => method.id === entry.from) ? entry.from : null,
      savedAt, editedAt: Number.isFinite(entry.editedAt) ? entry.editedAt : savedAt });
  });
  return clean;
};

export const methodCatalogue = (userMethods, presets = METHODS) => [...presets, ...sanitizeUserMethods(userMethods, presets)];
export const methodsForNewSolves = (catalogue, presets = METHODS) =>
  (catalogue || []).filter((method) => presets.some((preset) => preset.id === method.id) || method.forNewSolves !== false);

export const duplicateMethod = (methods, source, savedAt = Date.now(), presets = METHODS) => {
  const list = methods || [];
  if (!source || list.length >= MAX_USER_METHODS) return { methods: list, method: null };
  const taken = new Set([...presets, ...list].map((method) => method.name));
  const method = { id: nextMethodId(list), name: unique(`${source.name} copy`, taken, 'Method'),
    stages: [...source.stages], forNewSolves: true, from: source.from || source.id, savedAt, editedAt: savedAt };
  return { methods: [method, ...list], method };
};

export const editMethod = (methods, id, patch, editedAt = Date.now(), presets = METHODS) => {
  const list = methods || [];
  const current = list.find((method) => method.id === id);
  if (!current) return list;
  const fields = typeof patch === 'function' ? patch(current) : patch;
  if (!fields || typeof fields !== 'object') return list;
  const next = {};
  if ('name' in fields) {
    const wanted = normalizeMethodName(fields.name);
    if (wanted) next.name = unique(wanted, new Set([...presets, ...list].filter((m) => m.id !== id).map((m) => m.name)), current.name);
  }
  if ('stages' in fields) {
    const stages = cleanStages(fields.stages);
    if (stages.length) next.stages = stages;
  }
  if ('forNewSolves' in fields) next.forNewSolves = fields.forNewSolves === true;
  if (!Object.keys(next).some((key) => JSON.stringify(next[key]) !== JSON.stringify(current[key]))) return list;
  return list.map((method) => method.id === id ? { ...method, ...next, editedAt } : method);
};

export const removeMethod = (methods, id, solves) => {
  const list = methods || [];
  if ((solves || []).some((solve) => solve.method === id)) return { methods: list, reason: 'This method is used by a saved solve.' };
  const next = list.filter((method) => method.id !== id);
  return { methods: next, reason: next.length === list.length ? 'Method not found.' : null };
};

export const renameStageReferences = ({ methods, solves, algorithms }, methodId, from, to, editedAt = Date.now()) => {
  const stage = normalizeStageName(to);
  const method = (methods || []).find((entry) => entry.id === methodId);
  if (!method || !method.stages.includes(from) || !stage || method.stages.some((one) => one !== from && one.toLowerCase() === stage.toLowerCase())) {
    return { methods, solves, algorithms };
  }
  const nextMethods = editMethod(methods, methodId, { stages: method.stages.map((one) => one === from ? stage : one) }, editedAt);
  return {
    methods: nextMethods,
    solves: (solves || []).map((solve) => solve.method !== methodId ? solve : { ...solve, phases: (solve.phases || []).map((phase) => phase.label === from ? { ...phase, label: stage } : phase), editedAt }),
    algorithms: (algorithms || []).map((algorithm) => ({ ...algorithm, assignments: (algorithm.assignments || []).map((assignment) => assignment.method === methodId && assignment.stage === from ? { ...assignment, stage } : assignment) })),
  };
};
