export const name = "Normalize caravans.camper_season: winter -> all_season";

export const up = (db) => {
  db.prepare(
    `
      UPDATE caravans
      SET camper_season = 'all_season'
      WHERE camper_season IS NOT NULL
        AND LOWER(TRIM(camper_season)) = 'winter'
    `
  ).run();
};

