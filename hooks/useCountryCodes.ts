import { useEffect, useState } from "react";

type CountryCode = {
  name: string;
  code: string;
};

export const useCountryCodes = () => {
  const [codes, setCodes] = useState<CountryCode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCodes = async () => {
      try {
        const res = await fetch("https://restcountries.com/v3.1/all?fields=name,idd");
        const data = await res.json();

        const countryCodes = data
          .filter((c: any) => c.idd?.root)
          .map((c: any) => ({
            name: c.name.common,
            code: c.idd.root + (c.idd.suffixes?.[0] || ""),
          }))
          .sort((a: CountryCode, b: CountryCode) => a.name.localeCompare(b.name));

        setCodes(countryCodes);
      } catch (err) {
        console.error("Error fetching country codes", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCodes();
  }, []);

  return { codes, loading };
};
