// Comprehensive Verification Test Suite for Project Orbital Engineer

// Setup mock localStorage for Node testing environment
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => store.get(key) || null,
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
}

import { COMPONENTS, COMPONENT_CATEGORIES, SATELLITE_BUS } from './src/data/components.js';
import { ROCKETS } from './src/data/rockets.js';
import { MISSIONS } from './src/data/missions.js';
import { SPACECRAFT_PRESETS } from './src/data/presets.js';
import { ASTRODYNAMIC_CONSTANTS, LUNAR_SOUTH_POLE_CRATERS, DSN_GROUND_STATIONS } from './src/data/nasaData.js';
import { EDUCATIONAL_TOPICS } from './src/data/educationalContent.js';
import { calculateSpacecraftMetrics, calculateLinkMargin, G0 } from './src/utils/calculations.js';
import { 
  getSavedBuilds, 
  saveSpacecraftBuild, 
  getMissionHistory, 
  recordMissionHistory, 
  getUserMissionStats,
  hasGuestProgress,
  transferGuestProgressToUser 
} from './src/utils/storage.js';
import { mapAuthError } from './src/services/firebase.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

console.log('=== RUNNING ORBITAL ENGINEER VERIFICATION SUITE ===\n');

// 1. Data Integrity Tests
console.log('1. Checking Spacecraft Component Categories:');
const requiredCategories = [
  COMPONENT_CATEGORIES.SOLAR_PANELS,
  COMPONENT_CATEGORIES.BATTERIES,
  COMPONENT_CATEGORIES.ANTENNAS,
  COMPONENT_CATEGORIES.CAMERAS,
  COMPONENT_CATEGORIES.SPECTROMETERS,
  COMPONENT_CATEGORIES.PROPULSION,
  COMPONENT_CATEGORIES.FUEL_TANKS,
];
requiredCategories.forEach(cat => {
  const count = COMPONENTS.filter(c => c.category === cat).length;
  assert(count > 0, `Category ${cat} has ${count} components`);
});

// 2. Component specifications
console.log('\n2. Checking Component Engineering Parameters:');
COMPONENTS.forEach(c => {
  assert(typeof c.mass === 'number' && c.mass > 0, `${c.name} has valid mass (${c.mass} kg)`);
  assert(typeof c.cost === 'number' && c.cost > 0, `${c.name} has valid cost ($${c.cost})`);
  assert(typeof c.specs === 'object', `${c.name} has engineering specifications`);
});

// 3. Fictional Launch Vehicles
console.log('\n3. Checking Fictional Launch Vehicles:');
assert(ROCKETS.length === 3, `3 fictional rockets created (found: ${ROCKETS.length})`);
ROCKETS.forEach(r => {
  assert(r.isSimulatedGameParameter === true, `${r.name} clearly marked as simulated game parameter`);
  assert(r.cost > 0 && r.maxPayloadTLI > 0, `${r.name} has valid cost ($${r.cost / 1e6}M) & TLI payload (${r.maxPayloadTLI} kg)`);
});

// 4. Mission Profile
console.log('\n4. Checking Lunar Science Orbiter Mission:');
const mission = MISSIONS[0];
assert(mission.id === 'lunar_science_orbiter', `Playable mission exists: ${mission.name}`);
assert(mission.budget === 150000000, `Budget is $150,000,000`);
assert(mission.requiredDeltaV === 850, `Required LOI Delta-V is 850 m/s`);
assert(mission.primaryObjectives.length === 3, `Has 3 primary objectives`);

// 5. NASA Datasets
console.log('\n5. Checking NASA & JPL Data Integration:');
assert(LUNAR_SOUTH_POLE_CRATERS.length >= 5, `Real LRO craters cataloged (${LUNAR_SOUTH_POLE_CRATERS.length} craters)`);
assert(DSN_GROUND_STATIONS.length === 3, `NASA Deep Space Network 70m stations integrated (${DSN_GROUND_STATIONS.length} stations)`);
assert(ASTRODYNAMIC_CONSTANTS.G.value === 6.67430e-11, `JPL Gravitational constant verified`);
assert(ASTRODYNAMIC_CONSTANTS.g0.value === 9.80665, `Standard g0 verified`);

// 6. Educational Content
console.log('\n6. Checking Educational Formulas & Handbook:');
assert(EDUCATIONAL_TOPICS.length >= 4, `Educational topics present (${EDUCATIONAL_TOPICS.length} topics)`);
EDUCATIONAL_TOPICS.forEach(topic => {
  assert(topic.plainFormula && topic.variables.length > 0, `${topic.title} has formula & variables defined`);
  assert(topic.realVsSimplified.simplified && topic.realVsSimplified.realWorld, `${topic.title} distinguishes simplified vs real physics`);
});

// 7. Live Engineering Calculations Test
console.log('\n7. Testing Live Engineering Calculator (Tsiolkovsky & Power):');

// Case A: LRO Heritage Preset (Balanced standard)
const lroPreset = SPACECRAFT_PRESETS[0];
const lroComponents = COMPONENTS.filter(c => lroPreset.componentIds.includes(c.id));
const rocketTitan = ROCKETS.find(r => r.id === lroPreset.rocketId);
const metricsA = calculateSpacecraftMetrics(lroComponents, lroPreset.fuelMass, rocketTitan, mission);

assert(metricsA.dryMass > SATELLITE_BUS.dryMass, `Dry mass computed correctly (${metricsA.dryMass.toFixed(1)} kg)`);
assert(metricsA.wetMass === metricsA.dryMass + lroPreset.fuelMass, `Wet mass = Dry mass + Fuel mass (${metricsA.wetMass.toFixed(1)} kg)`);
assert(metricsA.totalCost <= mission.budget, `LRO Heritage stays within budget ($${(metricsA.totalCost / 1e6).toFixed(1)}M <= $150M)`);
assert(metricsA.deltaV >= mission.requiredDeltaV, `LRO Heritage achieves sufficient Delta-V (${metricsA.deltaV.toFixed(0)} m/s >= ${mission.requiredDeltaV} m/s)`);
assert(metricsA.netPowerDay > 0, `Positive daylight power margin (+${metricsA.netPowerDay} W)`);
assert(metricsA.survivesEclipse === true, `Survives 46.5-minute eclipse (DoD: ${metricsA.batteryDepthOfDischarge.toFixed(0)}%)`);
assert(metricsA.isFlightReady === true, `LRO Heritage passes all flight readiness validation checks!`);

// Case B: Deliberate Error Detection (Overweight probe)
const heavyComponents = [...COMPONENTS];
const rocketLight = ROCKETS[0];
const metricsB = calculateSpacecraftMetrics(heavyComponents, 300, rocketLight, mission);
assert(metricsB.massLimitExceeded === true, `Correctly detects rocket payload limit exceeded`);
assert(metricsB.errors.length > 0, `Correctly triggers engineering validation errors (found ${metricsB.errors.length} errors)`);

// Case C: Deliberate Deficit (Zero fuel)
const metricsC = calculateSpacecraftMetrics(lroComponents, 0, rocketTitan, mission);
assert(metricsC.deltaV === 0, `Zero fuel yields zero delta-V`);
assert(metricsC.hasSufficientDeltaV === false, `Flags insufficient delta-V`);

// 8. Communications Link Budget Test
console.log('\n8. Testing Friis Telecommunications Link Budget:');
const antenna = COMPONENTS.find(c => c.id === 'ant_highgain_dish');
const link = calculateLinkMargin(antenna, 384400, 8.4);
assert(link.fsplDb > 220, `Free Space Path Loss at Moon is ~${link.fsplDb.toFixed(1)} dB (>220 dB)`);
assert(link.linkMarginDb > 0, `High-Gain dish achieves positive link margin (+${link.linkMarginDb.toFixed(1)} dB)`);

// 9. Authentication & User Partitioned Save System Test
console.log('\n9. Testing User Partitioned Storage & Guest Mode:');

// Clear storage
localStorage.clear();

// Guest saves build
const guestBuild = saveSpacecraftBuild('Guest Scout Probe', {
  rocketId: 'rocket_titan5',
  componentIds: ['sp_compact', 'bat_standard_liion'],
  fuelMass: 75,
}, null);
assert(guestBuild && guestBuild.id, 'Guest can save spacecraft build');

const guestBuilds = getSavedBuilds(null);
assert(guestBuilds.length === 1 && guestBuilds[0].name === 'Guest Scout Probe', 'Guest builds retrieved correctly');

// Record guest mission history
recordMissionHistory({
  missionName: 'Lunar Science Orbiter',
  craftName: 'Guest Scout-1',
  status: 'SUCCESS',
  score: 88,
  spentBudget: 110000000,
  remainingBudget: 40000000,
  dataDownlinkedMB: 180,
}, null);

const guestHistory = getMissionHistory(null);
assert(guestHistory.length === 1 && guestHistory[0].score === 88, 'Guest mission history saved');
assert(hasGuestProgress() === true, 'hasGuestProgress correctly reports true');

// Authenticated user tests (UID: 'user_nasa_42')
const userUid = 'user_nasa_42';
const userInitialBuilds = getSavedBuilds(userUid);
assert(userInitialBuilds.length === 0, 'New authenticated user starts with empty account builds');

// Transfer guest data to authenticated account
const transferOk = transferGuestProgressToUser(userUid);
assert(transferOk === true, 'Guest data transfer executes successfully');

const userTransferredBuilds = getSavedBuilds(userUid);
assert(userTransferredBuilds.length === 1 && userTransferredBuilds[0].name === 'Guest Scout Probe', 'User account now holds transferred spacecraft build');

const userStats = getUserMissionStats(userUid);
assert(userStats.completedCount === 1 && userStats.averageScore === 88, 'User profile stats computed correctly from account history');

assert(hasGuestProgress() === false, 'Guest data cleaned up after transfer');

// 10. Firebase Error Mapping Tests
console.log('\n10. Testing Firebase Authentication Error Handling:');
const errPass = mapAuthError({ code: 'auth/wrong-password' });
assert(errPass.message.includes('Invalid email or password'), 'Maps auth/wrong-password cleanly');

const errEmail = mapAuthError({ code: 'auth/email-already-in-use' });
assert(errEmail.message.includes('already exists'), 'Maps auth/email-already-in-use cleanly');

const errDomain = mapAuthError({ code: 'auth/unauthorized-domain' });
assert(errDomain.message.includes('Authorized Domains'), 'Maps auth/unauthorized-domain with setup instructions');

const errPopup = mapAuthError({ code: 'auth/popup-closed-by-user' });
assert(errPopup.message.includes('closed before signing in'), 'Maps auth/popup-closed-by-user cleanly');

console.log(`\n========================================`);
console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}
