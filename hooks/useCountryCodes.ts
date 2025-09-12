import { useEffect, useState } from "react";

type CountryCode = {
  name: string;
  code: string;
};

// Cache the country codes to avoid repeated API calls
let cachedCodes: CountryCode[] | null = null;
let cachePromise: Promise<CountryCode[]> | null = null;

const fetchCountryCodes = async (): Promise<CountryCode[]> => {
  if (cachedCodes) {
    return cachedCodes;
  }

  if (cachePromise) {
    return cachePromise;
  }

  cachePromise = (async () => {
    try {
      const res = await fetch("https://restcountries.com/v3.1/all?fields=name,idd");
      const data = await res.json();

      const countryCodes = data
        .filter((c: any) => c.idd?.root)
        .map((c: any) => ({
          name: c.name.common,
          code: c.idd.root + (c.idd.suffixes?.[0] || ""),
        }))
        .filter((country: CountryCode, index: number, self: CountryCode[]) => 
          index === self.findIndex((c) => c.code === country.code)
        )
        .sort((a: CountryCode, b: CountryCode) => a.name.localeCompare(b.name));

      cachedCodes = countryCodes;
      return countryCodes;
    } catch (err) {
      console.error("Error fetching country codes", err);
      cachePromise = null; // Reset promise on error to allow retry
      throw err;
    }
  })();

  return cachePromise;
};

export const useCountryCodes = () => {
  const [codes, setCodes] = useState<CountryCode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCountryCodes()
      .then((countryCodes) => {
        setCodes(countryCodes);
      })
      .catch((err) => {
        console.error("Error loading country codes", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return { codes, loading };
};
