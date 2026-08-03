-- ══════════════════════════════════════════════════════════════════════
-- States / Provinces lookup table
--
-- Stores selectable state/province values per country.
-- The customer.state column stores the state code (e.g. "CA").
-- Admins can add their own entries for other countries.
-- Pre-seeded with US states + Indian states/UTs.
-- ══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS states (
    id           BIGSERIAL    PRIMARY KEY,
    country_code CHAR(2)      NOT NULL DEFAULT 'US',
    code         VARCHAR(10)  NOT NULL,
    name         VARCHAR(100) NOT NULL,
    sort_order   INTEGER      NOT NULL DEFAULT 999,
    active       BOOLEAN      NOT NULL DEFAULT TRUE,
    UNIQUE(country_code, code)
);

CREATE INDEX IF NOT EXISTS idx_states_country ON states(country_code, active, sort_order);

-- ── US States ──────────────────────────────────────────────────────────
INSERT INTO states (country_code, code, name, sort_order) VALUES
('US','AL','Alabama',1),('US','AK','Alaska',2),('US','AZ','Arizona',3),
('US','AR','Arkansas',4),('US','CA','California',5),('US','CO','Colorado',6),
('US','CT','Connecticut',7),('US','DE','Delaware',8),('US','FL','Florida',9),
('US','GA','Georgia',10),('US','HI','Hawaii',11),('US','ID','Idaho',12),
('US','IL','Illinois',13),('US','IN','Indiana',14),('US','IA','Iowa',15),
('US','KS','Kansas',16),('US','KY','Kentucky',17),('US','LA','Louisiana',18),
('US','ME','Maine',19),('US','MD','Maryland',20),('US','MA','Massachusetts',21),
('US','MI','Michigan',22),('US','MN','Minnesota',23),('US','MS','Mississippi',24),
('US','MO','Missouri',25),('US','MT','Montana',26),('US','NE','Nebraska',27),
('US','NV','Nevada',28),('US','NH','New Hampshire',29),('US','NJ','New Jersey',30),
('US','NM','New Mexico',31),('US','NY','New York',32),('US','NC','North Carolina',33),
('US','ND','North Dakota',34),('US','OH','Ohio',35),('US','OK','Oklahoma',36),
('US','OR','Oregon',37),('US','PA','Pennsylvania',38),('US','RI','Rhode Island',39),
('US','SC','South Carolina',40),('US','SD','South Dakota',41),('US','TN','Tennessee',42),
('US','TX','Texas',43),('US','UT','Utah',44),('US','VT','Vermont',45),
('US','VA','Virginia',46),('US','WA','Washington',47),('US','WV','West Virginia',48),
('US','WI','Wisconsin',49),('US','WY','Wyoming',50),
('US','DC','District of Columbia',51),('US','PR','Puerto Rico',52)
ON CONFLICT (country_code, code) DO NOTHING;

-- ── Indian States & Union Territories ─────────────────────────────────
INSERT INTO states (country_code, code, name, sort_order) VALUES
('IN','AN','Andaman and Nicobar Islands',1),
('IN','AP','Andhra Pradesh',2),
('IN','AR','Arunachal Pradesh',3),
('IN','AS','Assam',4),
('IN','BR','Bihar',5),
('IN','CH','Chandigarh',6),
('IN','CG','Chhattisgarh',7),
('IN','DN','Dadra and Nagar Haveli and Daman and Diu',8),
('IN','DL','Delhi',9),
('IN','GA','Goa',10),
('IN','GJ','Gujarat',11),
('IN','HR','Haryana',12),
('IN','HP','Himachal Pradesh',13),
('IN','JK','Jammu and Kashmir',14),
('IN','JH','Jharkhand',15),
('IN','KA','Karnataka',16),
('IN','KL','Kerala',17),
('IN','LA','Ladakh',18),
('IN','LD','Lakshadweep',19),
('IN','MP','Madhya Pradesh',20),
('IN','MH','Maharashtra',21),
('IN','MN','Manipur',22),
('IN','ML','Meghalaya',23),
('IN','MZ','Mizoram',24),
('IN','NL','Nagaland',25),
('IN','OD','Odisha',26),
('IN','PY','Puducherry',27),
('IN','PB','Punjab',28),
('IN','RJ','Rajasthan',29),
('IN','SK','Sikkim',30),
('IN','TN','Tamil Nadu',31),
('IN','TS','Telangana',32),
('IN','TR','Tripura',33),
('IN','UP','Uttar Pradesh',34),
('IN','UK','Uttarakhand',35),
('IN','WB','West Bengal',36)
ON CONFLICT (country_code, code) DO NOTHING;
