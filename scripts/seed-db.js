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
        description: 'Премиум европейская Прицеп-дача с высочайшим уровнем комфорта и современными удобствами. Идеальна для путешествий круглый год.',
        year: 2023,
        price: 4500000,
        status: 'available',
        featured: 1,
        beds_count: 4,
        has_toilet: 1,
        toilet_type: 'cassette',
        manufacturer_country: 'Швеция',
        fresh_water_tank_l: 100,
        grey_water_tank_l: 80,
        has_hot_water: 1,
        water_heater_type: 'gas',
        boiler_volume_l: 20,
        fridge_type: ['electric', 'gas'],
        fridge_volume_l: 85,
        sink_present: 1,
        stove_burners_count: 3,
        has_microwave: 1,
        has_oven: 1,
        double_glazed_windows: 1,
        camper_season: 'winter',
        battery_type: 'lithium',
        battery_capacity_ah: 200,
        solar_wattage: 400,
        inverter_wattage: 3000,
        has_12v_system: 1,
        length_mm: 7500,
        width_mm: 2500,
        height_mm: 3000,
        interior_height_mm: 2100,
        curb_weight_kg: 2500,
        gross_weight_kg: 3500,
        // Phase 1: Layout
        shower_type: 'separate',
        windows_count: 6,
        door_position: 'right',
        // Phase 1: Climate & ventilation
        has_ac: 1,
        vent_fans_count: 2,
        skylights_count: 2,
        // Phase 1: Condition & history
        condition: 'excellent',
        last_service_date: '2024-11-15',
        // Phase 1: Chassis & towing
        axles_count: 1,
        brake_type: 'hydraulic',
        suspension_type: 'leaf_spring',
        wheel_size_inch: 15,
        hitch_weight_kg: 180,
        braked: 1,
        stabilizer_present: 1,
        tow_vehicle_max_kg: 0,
        heating_type: ['diesel', 'gas'],
        heating_distribution: 'liquid',
        heater_brand: 'Truma',
        features: {
          awning: 1,
          bike_rack: 1,
          mosquito_nets: 1,
          bed_types: '["bunk","double"]'
        }
      },
      {
        title: 'Классический Комфорт 2022',
        slug: 'klassicheskiy-komfort-2022',
        description: 'Надежная европейская Прицеп-дача в отличном состоянии. Отлично подходит как первая Прицеп-дача.',
        year: 2022,
        price: 3200000,
        status: 'available',
        featured: 1,
        beds_count: 2,
        has_toilet: 1,
        toilet_type: 'cassette',
        manufacturer_country: 'Германия',
        fresh_water_tank_l: 80,
        grey_water_tank_l: 60,
        has_hot_water: 1,
        water_heater_type: 'electric',
        boiler_volume_l: 15,
        fridge_type: ['electric'],
        fridge_volume_l: 65,
        sink_present: 1,
        stove_burners_count: 2,
        has_microwave: 1,
        double_glazed_windows: 1,
        camper_season: 'summer',
        battery_type: 'lead-acid',
        battery_capacity_ah: 100,
        solar_wattage: 0,
        inverter_wattage: 1500,
        has_12v_system: 1,
        length_mm: 6500,
        width_mm: 2400,
        height_mm: 2900,
        interior_height_mm: 2000,
        curb_weight_kg: 1800,
        gross_weight_kg: 2500,
        // Phase 1: Layout
        shower_type: 'combined',
        windows_count: 5,
        door_position: 'left',
        // Phase 1: Climate & ventilation
        has_ac: 0,
        vent_fans_count: 1,
        skylights_count: 1,
        // Phase 1: Condition & history
        condition: 'good',
        last_service_date: '2024-10-20',
        // Phase 1: Chassis & towing
        axles_count: 1,
        brake_type: 'electric',
        suspension_type: 'coil_spring',
        wheel_size_inch: 14,
        hitch_weight_kg: 120,
        braked: 1,
        stabilizer_present: 0,
        tow_vehicle_max_kg: 1000,
        heating_type: ['electric'],
        heating_distribution: 'air',
        heater_brand: 'Truma',
        features: {
          awning: 1,
          bed_types: '["dinette"]'
        }
      },
      {
        title: 'Приключение XL',
        slug: 'priklyuchenie-xl',
        description: 'Просторная семейная Прицеп-дача с несколькими спальными зонами. Продается как есть.',
        year: 2020,
        price: 2800000,
        status: 'sold',
        featured: 0,
        beds_count: 6,
        has_toilet: 1,
        toilet_type: 'fixed_tank',
        manufacturer_country: 'Франция',
        fresh_water_tank_l: 150,
        grey_water_tank_l: 120,
        has_hot_water: 1,
        water_heater_type: 'gas',
        boiler_volume_l: 25,
        fridge_type: ['electric', 'gas'],
        fridge_volume_l: 100,
        sink_present: 1,
        stove_burners_count: 4,
        has_microwave: 1,
        has_oven: 1,
        double_glazed_windows: 1,
        camper_season: 'winter',
        battery_type: 'lithium',
        battery_capacity_ah: 300,
        solar_wattage: 600,
        inverter_wattage: 5000,
        has_12v_system: 1,
        length_mm: 8500,
        width_mm: 2600,
        height_mm: 3100,
        interior_height_mm: 2150,
        curb_weight_kg: 3200,
        gross_weight_kg: 4500,
        // Phase 1: Layout
        shower_type: 'separate',
        windows_count: 8,
        door_position: 'right',
        // Phase 1: Climate & ventilation
        has_ac: 1,
        vent_fans_count: 3,
        skylights_count: 3,
        // Phase 1: Condition & history
        condition: 'excellent',
        last_service_date: '2024-12-05',
        // Phase 1: Chassis & towing
        axles_count: 2,
        brake_type: 'hydraulic',
        suspension_type: 'air_suspension',
        wheel_size_inch: 16,
        hitch_weight_kg: 220,
        braked: 1,
        stabilizer_present: 1,
        tow_vehicle_max_kg: 0,
        heating_type: ['gas', 'electric'],
        heating_distribution: 'liquid',
        heater_brand: 'Webasto',
        features: {
          awning: 1,
          bike_rack: 1,
          tv_mount: 1,
          mosquito_nets: 1,
          bed_types: '["bunk","twin","double"]'
        }
      }
    ];

    for (const caravan of sampleCaravans) {
      try {
        const existing = caravans.getBySlug(caravan.slug);
        if (existing) {
          caravans.delete(existing.id);
        }

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
