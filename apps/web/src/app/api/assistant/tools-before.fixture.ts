/**
 * The three tool definitions exactly as `route.ts` sent them to the Claude API
 * before the registry (AI-01), captured from the route on 13 October 2026.
 * `route.test.ts` checks the registry still sends each one unchanged.
 */
export const ORIGINAL_TOOL_DEFINITIONS = [
  {
    "name": "search_listings",
    "description": "Search Vallo's catalogue of property listed by people on Vallo: rentals, property for sale, land, shops and offices, and shortlets, hotels and homes let by their owners, across Nigeria. Nothing comes from an outside feed; a result marked as an example cannot be rented, bought or booked, and you say so. Returns up to five listings with formatted naira prices, ratings and in-app links. Always call this before recommending any property.",
    "input_schema": {
      "type": "object",
      "properties": {
        "query": {
          "type": "string",
          "description": "Free text matched against title, area, city and state."
        },
        "city": {
          "type": "string",
          "description": "Restrict to one city, e.g. Lagos, Abuja, Port Harcourt, Ibadan, Enugu or Calabar."
        },
        "kind": {
          "type": "string",
          "enum": [
            "rental",
            "apartment",
            "home",
            "shortlet",
            "villa",
            "hotel",
            "restaurant",
            "experience",
            "shop",
            "office",
            "land"
          ],
          "description": "Restrict to one category. Use rental for annual and monthly tenancies, land for plots, shop and office for commercial space, and shortlet for a place let by the night."
        },
        "maxPricePerNightNaira": {
          "type": "number",
          "description": "Upper price bound in naira, in whatever period the listing is priced by: per year for a tenancy, per night for a shortlet. This bounds the rent or asking price alone and does not account for caution deposit, agency, legal or agreement fees."
        },
        "bedrooms": {
          "type": "number",
          "description": "Minimum number of bedrooms."
        }
      },
      "additionalProperties": false
    }
  },
  {
    "name": "compare_listings",
    "description": "Put two to four Vallo listings side by side on the facts that decide between them: price and what period it covers, bedrooms, bathrooms, where it is, light and water, whether the lister is verified, and the rating with the number of reviews behind it. Pass the listing ids exactly as search_listings returned them. Use this whenever somebody is weighing places against each other rather than asking what is available. An id that cannot be found comes back marked not found; say so rather than leaving it out.",
    "input_schema": {
      "type": "object",
      "properties": {
        "ids": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "minItems": 2,
          "maxItems": 4,
          "description": "The listing ids to compare, exactly as search_listings returned them."
        }
      },
      "required": [
        "ids"
      ],
      "additionalProperties": false
    }
  },
  {
    "name": "area_intel",
    "description": "Read what people who live in a Nigerian area have actually posted about it on Vallo: what the roads, light, water and daily life are really like. Returns real posts by real residents, newest first, plus whether that place is open on Vallo at all. Use this whenever somebody asks what an area is LIKE to live in, or is choosing between areas. These are residents' own words and opinions, not facts Vallo has checked, so attribute them as such and never state them as our own.",
    "input_schema": {
      "type": "object",
      "properties": {
        "place": {
          "type": "string",
          "description": "The area, neighbourhood or city to read about, e.g. Lekki Phase 1, Yaba, Wuse, Aba South."
        }
      },
      "required": [
        "place"
      ],
      "additionalProperties": false
    }
  }
] as const;
