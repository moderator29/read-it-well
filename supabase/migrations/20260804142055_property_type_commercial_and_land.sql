-- Shops, offices and land are property types, not a filter we can fake.
--
-- The filters screen offers five categories: Apartments, Houses, Shops,
-- Offices and Land. Three of those had nothing behind them: property_type held
-- apartment, hotel, home, villa, shortlet and rental only, so a Shops tile
-- would have been a control that can never match anything, which is the exact
-- thing this platform refuses to ship.
--
-- Adding the value is all this migration does. A new enum value cannot be USED
-- in the transaction that adds it, so nothing here references them; the
-- application types and the listing wizard take them up separately.
--
-- All three are the yearly market, like rental: they are let or sold on a
-- tenancy, inspected before money moves, and never reserved by the night.
-- pricePeriodFor in the application layer is what enforces that.

alter type property_type add value if not exists 'shop';
alter type property_type add value if not exists 'office';
alter type property_type add value if not exists 'land';
