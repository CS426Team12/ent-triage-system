export const getChangedFields = (initial, current) => {
  const changed = {};

  Object.keys(current).forEach((key) => {
    if (initial[key] !== current[key]) {
      changed[key] = current[key];
    }
  });

  return changed;
};

export const stringToBool = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return value;
  
  const lower = value.toLowerCase();
  if (lower === 'true') return true;
  if (lower === 'false') return false;
  
  return value;
};