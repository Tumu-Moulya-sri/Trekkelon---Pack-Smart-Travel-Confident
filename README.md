# Trekkelon 2.0: Pack Smart. Travel Confident.

New feature: **Bag Guard**. Pack virtual bags (cabin, check-in, daypack, panniers...) and Trekkelon checks them
against the weight limits and rules of your transport mode, then plays an X-ray scan and gives a Gate-Ready Score.

## Run it
1. Install Node.js 18+ from nodejs.org
2. In a terminal: `cd trekkelon`
3. `npm install`
4. `npm start`
5. Open http://localhost:3000

## Folder map
- `server.js`        Express server, rules engine (`scan()`), saved-trips API
- `data/rules.js`    ALL items, bag limits and rules. Edit this to change behaviour, no frontend change needed
- `data/trips.json`  Saved trips (created automatically)
- `public/`          Frontend: `index.html`, `style.css`, `app.js`, `logo.png`

## API
- `GET  /api/config`                      traveler types, transport modes, bags
- `GET  /api/items?persona=&mode=`        checklist for that traveler + transport
- `POST /api/scan`                        body: persona, mode, bags, custom -> score, flags, missing essentials
- `GET/POST /api/trips`, `DELETE /api/trips/:id`   saved trips per browser

## Demo script (about 2 minutes)
1. Choose Female Solo Traveler, then Flight.
2. Tap Pepper spray, Razor, Water bottle and Power bank into the Cabin bag. Put the Phone in Check-in.
3. Notice the live red/amber flags on the items, then press **Scan my bags**.
4. Read out the report, fix the bags, scan again, then Save trip.

## Important
Weight limits and restrictions are typical values and can differ by airline, railway zone and operator.
Verify them against official sources (airline, BCAS, IRCTC) before presenting them as facts.
