import dotenv from 'dotenv';

let envLoaded = false;

export const loadEnv = () => {
  if (envLoaded) {
    return;
  }

  dotenv.config({ override: false });
  envLoaded = true;
};

loadEnv();
