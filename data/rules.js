// Trekkelon rules engine data. Edit this file to change items, limits or rules.
// NOTE: limits and restrictions are typical values. Always verify with your airline,
// IRCTC / bus operator and BCAS before relying on them.

const PERSONAS = {
  solo:          { name: 'Solo Traveler',        tag: 'Light, flexible, ready for anything', color: '#0E8FA0', modes: ['bus', 'train', 'flight', 'bike'] },
  female_solo:   { name: 'Female Solo Traveler', tag: 'Safety-first, confident, in control', color: '#C73B78', modes: ['bus', 'train', 'flight', 'bike'] },
  family:        { name: 'Family Traveler',      tag: 'Kids, comfort and no surprises',      color: '#D9822B', modes: ['bus', 'train', 'flight'] },
  business:      { name: 'Business Traveler',    tag: 'Laptop, documents, zero delays',      color: '#3F57C9', modes: ['bus', 'train', 'flight', 'bike'] },
  last_minute:   { name: 'Last-minute Traveler', tag: 'Leaving in an hour? Start here',      color: '#7C4FE0', modes: ['bus', 'train', 'flight', 'bike'] },
};

// zone 'with' = stays with you, 'stow' = stored away from you (check-in, hold, berth, panniers)
const MODES = {
  flight: { name: 'Flight', icon: '✈️', bags: [
    { id: 'cabin',    name: 'Cabin bag',     limit: 7,  zone: 'with' },
    { id: 'checkin',  name: 'Check-in bag',  limit: 15, zone: 'stow' },
    { id: 'personal', name: 'Personal item', limit: 3,  zone: 'with' } ] },
  train:  { name: 'Train',  icon: '🚆', bags: [
    { id: 'main',    name: 'Main bag (under the berth)', limit: 20, zone: 'stow' },
    { id: 'daypack', name: 'Daypack',                    limit: 6,  zone: 'with' } ] },
  bus:    { name: 'Bus',    icon: '🚌', bags: [
    { id: 'hold',    name: 'Luggage hold', limit: 20, zone: 'stow' },
    { id: 'daypack', name: 'Daypack',      limit: 5,  zone: 'with' } ] },
  bike:   { name: 'Bike',   icon: '🏍️', bags: [
    { id: 'panniers', name: 'Saddlebags / panniers', limit: 10, zone: 'stow' },
    { id: 'backpack', name: 'Riding backpack',       limit: 4,  zone: 'with' } ] },
};

const TAGS = ['liquid', 'sharp', 'powerbank', 'flammable', 'valuable', 'fragile', 'battery', 'spray', 'baby', 'alcohol', 'banned'];

const both = (level, msg) => ({ with: { level, msg }, stow: { level, msg } });
const withYou = (level, msg) => ({ with: { level, msg } });
const stowed = (level, msg) => ({ stow: { level, msg } });

// RULES[mode][tag][zone] = { level: 'no' | 'warn', msg }
const RULES = {
  flight: {
    powerbank: stowed('no', 'Power banks must travel in cabin baggage, never in check-in.'),
    battery:   stowed('warn', 'Lithium batteries and electronics are safer in cabin baggage.'),
    sharp:     withYou('no', 'Sharp objects are not allowed in cabin baggage. Move this to check-in.'),
    spray:     both('no', 'Pepper spray is restricted on flights. Leave it at home or check airline and BCAS rules.'),
    flammable: both('no', 'Lighters, matches and flammables are restricted on flights.'),
    liquid:    withYou('warn', 'Liquids over 100 ml are stopped at security. Carry it empty and refill after, or move it to check-in.'),
    valuable:  stowed('warn', 'Keep valuables with you, not in checked baggage.'),
    fragile:   stowed('warn', 'Fragile items can get damaged in check-in.'),
    baby:      withYou('warn', 'Baby food is usually allowed. Keep it handy for screening.'),
  },
  train: {
    flammable: both('no', 'Flammable items are prohibited on trains.'),
    valuable:  stowed('warn', 'Keep valuables in your daypack, not under the berth.'),
  },
  bus: {
    flammable: both('no', 'Flammable items are not allowed on buses.'),
    powerbank: stowed('warn', 'Keep power banks with you, not in the luggage hold.'),
    valuable:  stowed('warn', 'The luggage hold is unattended. Keep valuables with you.'),
    fragile:   stowed('warn', 'Items in the hold can get crushed.'),
  },
  bike: {
    flammable: both('warn', 'Keep flammables away from engine and exhaust heat.'),
    valuable:  stowed('warn', 'Panniers stay on a parked bike. Keep valuables on you.'),
  },
};

const A = 'all';
const it = (id, name, cat, kg, tags, who, modes, ess) => ({ id, name, cat, kg, tags, who, modes, ess: ess || null });
// ess: 'a' = essential for everyone, 'x' = everyone except last-minute, array = those personas
const ITEMS = [
  it('ticket', 'Ticket / boarding pass', 'Documents', 0.02, [], A, ['bus', 'train', 'flight'], 'a'),
  it('id', 'ID proof (Aadhaar / passport)', 'Documents', 0.02, ['valuable'], A, A, 'a'),
  it('wallet', 'Wallet, cash and cards', 'Documents', 0.2, ['valuable'], A, A, 'a'),
  it('hotel', 'Hotel booking copy', 'Documents', 0.02, [], A, A, 'x'),
  it('bikedocs', 'Licence, RC and insurance', 'Documents', 0.05, ['valuable'], A, ['bike'], 'a'),
  it('contracts', 'Contracts and work papers', 'Documents', 0.6, ['valuable'], ['business'], A, ['business']),
  it('cards', 'Business cards', 'Documents', 0.05, [], ['business'], A),

  it('phone', 'Phone + charger', 'Tech', 0.4, ['valuable', 'battery'], A, A, 'a'),
  it('powerbank', 'Power bank', 'Tech', 0.35, ['powerbank'], A, A, 'a'),
  it('earbuds', 'Earphones', 'Tech', 0.1, ['valuable'], A, ['bus', 'train', 'flight']),
  it('laptop', 'Laptop + charger', 'Tech', 2.2, ['valuable', 'fragile', 'battery'], ['business', 'solo'], A, ['business']),
  it('clicker', 'Clicker + HDMI adapter', 'Tech', 0.2, ['battery'], ['business'], A),
  it('camera', 'Camera', 'Tech', 0.9, ['valuable', 'fragile', 'battery'], ['solo', 'family'], A),
  it('torch', 'Torch', 'Tech', 0.15, ['battery'], ['solo', 'female_solo'], A),

  it('clothes', 'Clothes (2-3 sets)', 'Clothing', 1.6, [], A, A, 'a'),
  it('jacket', 'Light jacket', 'Clothing', 0.6, [], A, A),
  it('shoes', 'Extra footwear', 'Clothing', 0.8, [], A, A),
  it('formal', 'Formal outfit', 'Clothing', 0.9, [], ['business'], A),
  it('raincoat', 'Raincoat', 'Clothing', 0.4, [], A, A),
  it('helmet', 'Helmet', 'Riding gear', 1.3, [], A, ['bike'], 'a'),
  it('gloves', 'Riding gloves + knee guards', 'Riding gear', 0.8, [], A, ['bike']),
  it('bikekit', 'Puncture kit + pump', 'Riding gear', 1.5, ['sharp'], A, ['bike'], 'a'),

  it('brush', 'Toothbrush + paste', 'Toiletries', 0.15, ['liquid'], A, A, 'a'),
  it('sanitizer', 'Sanitizer + wipes', 'Toiletries', 0.2, ['liquid'], A, A),
  it('shampoo', 'Shampoo / body wash (500 ml)', 'Toiletries', 0.55, ['liquid'], A, A),
  it('razor', 'Razor / nail cutter', 'Toiletries', 0.1, ['sharp'], A, A),
  it('meds', 'Medicines + first aid', 'Toiletries', 0.4, [], A, A, 'a'),
  it('pads', 'Period kit', 'Toiletries', 0.25, [], ['female_solo'], A, ['female_solo']),

  it('alarm', 'Personal safety alarm', 'Safety', 0.08, [], ['female_solo'], A, ['female_solo']),
  it('pepper', 'Pepper spray', 'Safety', 0.1, ['spray'], ['female_solo'], A),
  it('lock', 'Bag lock', 'Safety', 0.1, [], ['female_solo', 'solo'], A),
  it('knife', 'Pocket knife', 'Safety', 0.15, ['sharp'], ['solo'], A),
  it('lighter', 'Lighter', 'Safety', 0.05, ['flammable'], ['solo', 'last_minute'], A),

  it('water', 'Water bottle (filled)', 'Food', 0.9, ['liquid'], A, A, 'a'),
  it('snacks', 'Snacks / ready-to-eat', 'Food', 0.6, [], A, A),

  it('kidclothes', 'Kids\u2019 clothes (extra sets)', 'Kids', 1.8, [], ['family'], A, ['family']),
  it('diapers', 'Diapers + wipes', 'Kids', 1.0, [], ['family'], A),
  it('babyfood', 'Baby food / formula', 'Kids', 1.0, ['baby'], ['family'], A),
  it('kidmeds', 'Kids\u2019 medicines', 'Kids', 0.3, [], ['family'], A, ['family']),
  it('toys', 'Toys + books', 'Kids', 0.8, [], ['family'], A),
  it('blanket', 'Blanket', 'Kids', 0.8, [], ['family'], A),

  it('pillow', 'Neck pillow + eye mask', 'Comfort', 0.3, [], ['solo', 'female_solo', 'business'], ['bus', 'train', 'flight']),
  it('book', 'Book / Kindle', 'Comfort', 0.4, [], ['solo', 'female_solo', 'business', 'family'], A),
  it('journal', 'Notebook + pen', 'Comfort', 0.3, [], ['solo', 'female_solo', 'business'], A),
  it('umbrella', 'Umbrella', 'Comfort', 0.4, [], ['solo', 'last_minute'], A),
];

// Rules added for custom items. 'banned' is blocked in every mode and every bag.
const BANNED = both('no', 'Banned or illegal to carry. Remove it from your bags.');
const ALCOHOL_FLIGHT = both('warn', 'Alcohol has strict limits on flights. Check your airline\u2019s rules.');
const ALCOHOL_GROUND = both('warn', 'Carrying alcohol can be restricted by railway rules and state law.');
for (const m of Object.keys(MODES)) RULES[m].banned = BANNED;
RULES.flight.alcohol = ALCOHOL_FLIGHT;
RULES.train.alcohol = ALCOHOL_GROUND;
RULES.bus.alcohol = ALCOHOL_GROUND;

// Layer 1 of item checking: instant keyword rules. These always apply, with or without AI.
// [pattern, tags, short reason]. An empty tag list means "recognised and allowed".
const KEYWORDS = [
  [/\b(drugs?|weed|marijuana|cannabis|ganja|charas|hashish|cocaine|heroin|mdma|lsd|meth|opium|narcotics?|brown sugar)\b/i, ['banned'], 'Illegal drugs are banned on every journey and carrying them is a serious offence.'],
  [/\b(guns?|pistols?|revolvers?|firearms?|bullets?|ammo|ammunition|explosives?|bombs?|grenades?|dynamite|firecrackers?|fireworks?)\b/i, ['banned'], 'Weapons, ammunition and explosives are banned.'],
  [/\b(vapes?|vaping|e-?cigs?|e-?cigarettes?)\b/i, ['banned'], 'E-cigarettes are banned in India.'],
  [/\b(cigarettes?|cigars?|tobacco|beedi|bidi)\b/i, [], 'Cigarettes are generally allowed in checked bags. Smoking on board is not, and lighters are restricted.'],
  [/\b(pepper spray|mace|taser|stun gun)\b/i, ['spray'], 'Sprays and stun devices are restricted on flights.'],
  [/\b(knife|knives|blade|razor|scissors?|cutter|dagger|sword|axe)\b/i, ['sharp'], 'Sharp items must go in check-in on flights.'],
  [/\b(lighters?|matchbox|matches|petrol|diesel|kerosene|gas|cylinder|thinner|fuel|camphor)\b/i, ['flammable'], 'Flammable items are restricted.'],
  [/\b(power ?banks?)\b/i, ['powerbank'], 'Power banks must stay in cabin baggage on flights.'],
  [/\b(batter(y|ies)|lithium|drones?)\b/i, ['battery'], 'Lithium batteries are safer in cabin baggage.'],
  [/\b(whisky|whiskey|vodka|rum|beer|wine|liquor|alcohol|brandy|gin|tequila)\b/i, ['alcohol'], 'Alcohol has strict limits.'],
  [/\b(laptops?|cameras?|tablets?|ipads?|jewell?ery|gold|silver|cash|passport|watch|phone|macbook|kindle)\b/i, ['valuable'], 'Keep valuables with you.'],
  [/\b(glass|mirror|ceramic|vase|crystal)\b/i, ['fragile'], 'Fragile items can break in stowed bags.'],
  [/\b(water|juice|shampoo|lotion|cream|oil|perfume|sanitizer|liquid|drinks?|milk|soup|sauce|syrup|gel|paste|conditioner|deodorant)\b/i, ['liquid'], 'Liquids over 100 ml are stopped at flight security.'],
];

function classifyLocal(name) {
  const tags = new Set(); const reasons = []; let known = false;
  for (const [re, t, why] of KEYWORDS) if (re.test(name)) { known = true; t.forEach((x) => tags.add(x)); reasons.push(why); }
  return known ? { tags: [...tags], reason: reasons[0] } : null;
}

module.exports = { PERSONAS, MODES, TAGS, RULES, ITEMS, classifyLocal };
