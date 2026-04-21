import { initDb, closeDb, caravans } from '../db/db.js';

const seed = () => {
  try {
    console.log('🌱 Seeding database with sample data...');
    initDb();

    // Sample caravans
    const sampleCaravans = [
      {
        title: 'Полярный Путешественник Pro',
        slug: 'polyarnyy-puteshestvennik-pro',
        description: 'Премиум европейский кемпер с высочайшим уровнем комфорта и современными удобствами. Идеален для путешествий круглый год.',
        year: 2023,
        price: 4500000,
        status: 'available',
        featured: 1,
        beds_count: 4,
        has_shower: 1,
        has_toilet: 1,
        toilet_type: 'cassette',
        fresh_water_tank_l: 100,
        grey_water_tank_l: 80,
        has_hot_water: 1,
        water_heater_type: 'gas',
        boiler_volume_l: 20,
        fridge_type: 'compressor',
        fridge_volume_l: 85,
        sink_present: 1,
        has_cooktop: 1,
        cooktop_type: 'gas',
        stove_burners_count: 3,
        has_oven: 1,
        kitchen_outlets_count: 4,
        has_heating: 1,
        heating_type: 'water',
        heater_brand: 'Truma',
        heating_source: 'fuel',
        heating_distribution: 'water_tubes',
        has_insulation: 1,
        double_glazed_windows: 1,
        winter_rated: 1,
        battery_type: 'lithium',
        battery_capacity_ah: 200,
        has_solar_panels: 1,
        solar_wattage: 400,
        inverter_wattage: 3000,
        has_shore_power: 1,
        has_12v_system: 1,
        length_mm: 7500,
        width_mm: 2500,
        height_mm: 3000,
        interior_height_mm: 2100,
        weight_empty_kg: 2500,
        max_weight_kg: 3500,
        axle_type: 'single',
        features: JSON.stringify(['awning', 'bike_rack', 'air_conditioning', 'mosquito_nets'])
      },
      {
        title: 'Классический Комфорт 2022',
        slug: 'klassicheskiy-komfort-2022',
        description: 'Надежный европейский кемпер в отличном состоянии. Отлично подходит для первого кемпера.',
        year: 2022,
        price: 3200000,
        status: 'available',
        featured: 1,
        beds_count: 2,
        has_shower: 1,
        has_toilet: 1,
        toilet_type: 'cassette',
        fresh_water_tank_l: 80,
        grey_water_tank_l: 60,
        has_hot_water: 1,
        water_heater_type: 'electric',
        boiler_volume_l: 15,
        fridge_type: 'absorption',
        fridge_volume_l: 65,
        sink_present: 1,
        has_cooktop: 1,
        cooktop_type: 'gas',
        stove_burners_count: 2,
        has_oven: 0,
        kitchen_outlets_count: 2,
        has_heating: 1,
        heating_type: 'air',
        heater_brand: 'Truma',
        heating_source: 'gas',
        heating_distribution: 'air',
        has_insulation: 1,
        double_glazed_windows: 1,
        winter_rated: 0,
        battery_type: 'lead-acid',
        battery_capacity_ah: 100,
        has_solar_panels: 0,
        solar_wattage: 0,
        inverter_wattage: 1500,
        has_shore_power: 1,
        has_12v_system: 1,
        length_mm: 6500,
        width_mm: 2400,
        height_mm: 2900,
        interior_height_mm: 2000,
        weight_empty_kg: 1800,
        max_weight_kg: 2500,
        axle_type: 'single',
        features: JSON.stringify(['awning', 'storage_compartments'])
      },
      {
        title: 'Приключение XL',
        slug: 'priklyuchenie-xl',
        description: 'Просторный семейный кемпер с несколькими спальными зонами. Продается как есть.',
        year: 2020,
        price: 2800000,
        status: 'sold',
        featured: 0,
        beds_count: 6,
        has_shower: 1,
        has_toilet: 1,
        toilet_type: 'fixed_tank',
        fresh_water_tank_l: 150,
        grey_water_tank_l: 120,
        has_hot_water: 1,
        water_heater_type: 'combined',
        boiler_volume_l: 25,
        fridge_type: 'gas',
        fridge_volume_l: 100,
        sink_present: 1,
        has_cooktop: 1,
        cooktop_type: 'electric',
        stove_burners_count: 4,
        has_oven: 1,
        kitchen_outlets_count: 5,
        has_heating: 1,
        heating_type: 'water',
        heater_brand: 'Webasto',
        heating_source: 'diesel',
        heating_distribution: 'water_tubes',
        has_insulation: 1,
        double_glazed_windows: 1,
        winter_rated: 1,
        battery_type: 'lithium',
        battery_capacity_ah: 300,
        has_solar_panels: 1,
        solar_wattage: 600,
        inverter_wattage: 5000,
        has_shore_power: 1,
        has_12v_system: 1,
        length_mm: 8500,
        width_mm: 2600,
        height_mm: 3100,
        interior_height_mm: 2150,
        weight_empty_kg: 3200,
        max_weight_kg: 4500,
        axle_type: 'double',
        features: JSON.stringify(['awning', 'bike_rack', 'tv_mount', 'air_conditioning', 'mosquito_nets', 'storage_compartments'])
      }
    ];

    for (const caravan of sampleCaravans) {
      try {
        const created = caravans.create(caravan);
        console.log(`  ✓ Created: ${created.title}`);
      } catch (error) {
        console.warn(`  ⚠ ${caravan.title}: ${error.message}`);
      }
    }

    console.log('✓ Database seeded successfully');
    closeDb();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seed();
