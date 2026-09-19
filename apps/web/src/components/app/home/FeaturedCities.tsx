import Image from "next/image";
import Link from "next/link";
import { formatNumber, type Dictionary, type Locale } from "@vallo/i18n";
import { UiIcon } from "@/design-system/icons/UiIcon";
import type { HomeCity } from "./markets";

/**
 * The featured cities row, to the founder's target render: the overline on
 * the left, "View all cities" on the right, and a rail of photo capsules,
 * each with its plate, its name, its count and an arrow.
 *
 * THE CITIES ARE THE CATALOGUE'S OWN. `market-queries.ts` tallies published
 * listings by city and takes the busiest the product has a plate for, so this
 * row can never advertise a city with nothing in it, and the figure under
 * each name is that tally rather than a decoration. An empty tally renders no
 * row at all.
 */
export function FeaturedCities({
  t,
  locale,
  cities,
}: {
  t: Dictionary;
  locale: Locale;
  cities: HomeCity[];
}) {
  if (cities.length === 0) return null;

  return (
    <section aria-labelledby="home-cities-title" className="nf-home__cities-section">
      <div className="nf-home__head">
        <h2 id="home-cities-title" className="nf-home__overline">
          {t.home.featuredCities}
        </h2>
        <Link href="/search" className="nf-home__more nf-tap">
          {t.home.viewAllCities}
          <UiIcon name="arrow-right" size={16} />
        </Link>
      </div>

      <ul className="nf-home__cities">
        {cities.map((city) => (
          /* shrink-0, not min-w-0: on a scrolling rail the items must keep
             their own width. Allowed to shrink, four capsules divided 390px
             between them and every city name was cut to three letters. */
          <li key={city.name} className="shrink-0">
            <Link href={city.href} className="nf-glass nf-glass--tile nf-home__city nf-tap">
              <span className="nf-home__city-plate">
                <Image
                  src={city.src}
                  alt=""
                  fill
                  sizes="72px"
                  style={{ objectPosition: city.position }}
                />
              </span>
              <span className="nf-home__city-body">
                <span className="nf-home__city-name">{city.name}</span>
                {city.count === undefined ? null : (
                  <span className="nf-home__city-count nf-numeric">
                    {formatNumber(city.count, locale)}
                  </span>
                )}
              </span>
              <UiIcon name="arrow-right" size={16} className="nf-home__city-go" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
