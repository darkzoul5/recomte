const DEFAULT_VALIDATORS = {
  requiredNonEmpty: (v) => typeof v === 'string' && v.trim().length > 0,
  minLength: (min) => (v) => typeof v === 'string' && v.trim().length >= min
};

DEFAULT_VALIDATORS.oneOf = (allowed) => (v) => typeof v === 'string' && allowed.includes(v);

export function validateEnv(required = []) {
  const errors = [];

  for (const spec of required) {
    const name = spec.name;
    const value = process.env[name];

    if (spec.required && (value === undefined || value === null || String(value).trim() === '')) {
      errors.push(`Missing required env var: ${name}`);
      continue;
    }

    if (spec.validate) {
      const ok = spec.validate(value);
      if (!ok) {
        errors.push(spec.message || `Invalid env var: ${name}`);
      }
    }
  }

  if (errors.length > 0) {
    console.error('Environment validation failed:');
    for (const e of errors) console.error('  -', e);
    console.error('Aborting startup. Set the required environment variables and restart.');
    process.exit(1);
  }

  // Log success for debug visibility
  for (const spec of required) {
    if (spec.log !== false) {
      const val = process.env[spec.name];
      const display = spec.sensitive ? '***' : (val === undefined ? '(unset)' : String(val));
      console.info(`ENV OK: ${spec.name}=${display}`);
    }
  }
}

export const validators = DEFAULT_VALIDATORS;
