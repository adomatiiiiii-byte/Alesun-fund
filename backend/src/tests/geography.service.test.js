const {
  buildLoanGeoSnapshot,
  buildUserGeoFromAgent,
  getGeoCatalog,
  validateAgentGeography
} = require("../services/geography.service");

describe("geography service", () => {
  it("validates a real Uganda geography chain", () => {
    expect(
      validateAgentGeography({
        region: "Central",
        subregion: "Buganda North",
        district: "Luwero",
        administrativeUnit: "Bamunanika County",
        subUnit: "Bamunanika Subcounty"
      })
    ).toEqual(expect.objectContaining({ valid: true }));
  });

  it("loads only Buganda North districts under Buganda North", () => {
    const central = getGeoCatalog().find((entry) => entry.region === "Central");
    const bugandaNorth = central.subregions.find((entry) => entry.subregion === "Buganda North");

    expect(bugandaNorth.districts.some((entry) => entry.district === "Luwero")).toBe(true);
    expect(bugandaNorth.districts.some((entry) => entry.district === "Wakiso")).toBe(false);
  });

  it("loads Wakiso administrative units from the embedded Central dataset", () => {
    const central = getGeoCatalog().find((entry) => entry.region === "Central");
    const bugandaSouth = central.subregions.find((entry) => entry.subregion === "Buganda South");
    const wakiso = bugandaSouth.districts.find((entry) => entry.district === "Wakiso");

    expect(wakiso.administrativeUnits.map((entry) => entry.name)).toEqual(
      expect.arrayContaining([
        "Busiro County",
        "Entebbe Municipality",
        "Kira Municipality",
        "Kyadondo County",
        "Makindye-Ssabagabo Municipality",
        "Nansana Municipality"
      ])
    );
  });

  it("loads only Acholi districts and cities under Acholi in Northern", () => {
    const northern = getGeoCatalog().find((entry) => entry.region === "Northern");
    const acholi = northern.subregions.find((entry) => entry.subregion === "Acholi");

    expect(acholi.districts.some((entry) => entry.district === "Gulu")).toBe(true);
    expect(acholi.districts.some((entry) => entry.district === "Gulu City")).toBe(true);
    expect(acholi.districts.some((entry) => entry.district === "Lira")).toBe(false);
  });

  it("loads structured Northern administrative units and sub units for Gulu and Yumbe", () => {
    const northern = getGeoCatalog().find((entry) => entry.region === "Northern");
    const acholi = northern.subregions.find((entry) => entry.subregion === "Acholi");
    const westNile = northern.subregions.find((entry) => entry.subregion === "West Nile");
    const gulu = acholi.districts.find((entry) => entry.district === "Gulu");
    const guluCity = acholi.districts.find((entry) => entry.district === "Gulu City");
    const yumbe = westNile.districts.find((entry) => entry.district === "Yumbe");

    expect(gulu.administrativeUnits.map((entry) => entry.name)).toEqual(expect.arrayContaining(["Aswa County"]));
    expect(guluCity.administrativeUnits.map((entry) => entry.name)).toEqual(
      expect.arrayContaining(["Bardege-Layibi Division", "Laro-Pece Division"])
    );
    expect(yumbe.administrativeUnits.map((entry) => entry.name)).toEqual(
      expect.arrayContaining([
        "Aringa County",
        "Aringa East County",
        "Aringa North County",
        "Aringa South County"
      ])
    );
  });

  it("preserves refugee settlements as a distinct sub unit type and deduplicates repeated entries", () => {
    const northern = getGeoCatalog().find((entry) => entry.region === "Northern");
    const westNile = northern.subregions.find((entry) => entry.subregion === "West Nile");
    const yumbe = westNile.districts.find((entry) => entry.district === "Yumbe");
    const aringaCounty = yumbe.administrativeUnits.find((entry) => entry.name === "Aringa County");
    const zombo = westNile.districts.find((entry) => entry.district === "Zombo");
    const okoroCounty = zombo.administrativeUnits.find((entry) => entry.name === "Okoro County");

    expect(aringaCounty.subUnits.find((entry) => entry.name === "Bidi Bidi Refugee Camp")).toEqual(
      expect.objectContaining({ type: "REFUGEE_SETTLEMENT" })
    );
    expect(okoroCounty.subUnits.filter((entry) => entry.name === "Paidha Subcounty")).toHaveLength(1);
  });

  it("loads only Busoga districts under Busoga in Eastern", () => {
    const eastern = getGeoCatalog().find((entry) => entry.region === "Eastern");
    const busoga = eastern.subregions.find((entry) => entry.subregion === "Busoga");

    expect(busoga.districts.some((entry) => entry.district === "Jinja")).toBe(true);
    expect(busoga.districts.some((entry) => entry.district === "Jinja City")).toBe(true);
    expect(busoga.districts.some((entry) => entry.district === "Tororo")).toBe(false);
  });

  it("loads Eastern subregions with their district sets", () => {
    const eastern = getGeoCatalog().find((entry) => entry.region === "Eastern");
    const bukedi = eastern.subregions.find((entry) => entry.subregion === "Bukedi");
    const elgon = eastern.subregions.find((entry) => entry.subregion === "Elgon");
    const teso = eastern.subregions.find((entry) => entry.subregion === "Teso");

    expect(bukedi.districts.some((entry) => entry.district === "Tororo")).toBe(true);
    expect(elgon.districts.some((entry) => entry.district === "Mbale City")).toBe(true);
    expect(teso.districts.some((entry) => entry.district === "Soroti City")).toBe(true);
  });

  it("loads structured Eastern administrative units for Tororo and Jinja City", () => {
    const eastern = getGeoCatalog().find((entry) => entry.region === "Eastern");
    const bukedi = eastern.subregions.find((entry) => entry.subregion === "Bukedi");
    const busoga = eastern.subregions.find((entry) => entry.subregion === "Busoga");
    const tororo = bukedi.districts.find((entry) => entry.district === "Tororo");
    const jinjaCity = busoga.districts.find((entry) => entry.district === "Jinja City");

    expect(tororo.administrativeUnits.map((entry) => entry.name)).toEqual(
      expect.arrayContaining([
        "Tororo Municipality",
        "West Budama County",
        "West Budama Central County",
        "West Budama North East County"
      ])
    );
    expect(jinjaCity.administrativeUnits.map((entry) => entry.name)).toEqual(
      expect.arrayContaining(["Jinja North Division", "Jinja South Division"])
    );
  });

  it("preserves Eastern special areas and deduplicates repeated Kabei Subcounty", () => {
    const eastern = getGeoCatalog().find((entry) => entry.region === "Eastern");
    const busoga = eastern.subregions.find((entry) => entry.subregion === "Busoga");
    const elgon = eastern.subregions.find((entry) => entry.subregion === "Elgon");
    const bugiri = busoga.districts.find((entry) => entry.district === "Bugiri");
    const bukooliIslandCounty = bugiri.administrativeUnits.find((entry) => entry.name === "Bukooli Island County");
    const bukwo = elgon.districts.find((entry) => entry.district === "Bukwo");
    const tooCounty = bukwo.administrativeUnits.find((entry) => entry.name === "T’oo County");

    expect(bukooliIslandCounty.subUnits.find((entry) => entry.name === "Sigulu Islands")).toEqual(
      expect.objectContaining({ type: "SPECIAL_AREA" })
    );
    expect(tooCounty.subUnits.filter((entry) => entry.name === "Kabei Subcounty")).toHaveLength(1);
  });

  it("loads Western subregions with the correct district and city sets", () => {
    const western = getGeoCatalog().find((entry) => entry.region === "Western");
    const bunyoro = western.subregions.find((entry) => entry.subregion === "Bunyoro");
    const toro = western.subregions.find((entry) => entry.subregion === "Toro");
    const ankole = western.subregions.find((entry) => entry.subregion === "Ankole");
    const kigezi = western.subregions.find((entry) => entry.subregion === "Kigezi");

    expect(bunyoro.districts.some((entry) => entry.district === "Hoima")).toBe(true);
    expect(bunyoro.districts.some((entry) => entry.district === "Hoima City")).toBe(true);
    expect(bunyoro.districts.some((entry) => entry.district === "Mbarara")).toBe(false);

    expect(toro.districts.some((entry) => entry.district === "Fort Portal City")).toBe(true);
    expect(toro.districts.some((entry) => entry.district === "Kitagwenda")).toBe(true);
    expect(toro.districts.some((entry) => entry.district === "Kisoro")).toBe(false);

    expect(ankole.districts.some((entry) => entry.district === "Mbarara")).toBe(true);
    expect(ankole.districts.some((entry) => entry.district === "Mbarara City")).toBe(true);
    expect(ankole.districts.some((entry) => entry.district === "Kabale")).toBe(false);

    expect(kigezi.districts.map((entry) => entry.district)).toEqual(
      expect.arrayContaining(["Kabale", "Kanungu", "Kisoro", "Rubanda", "Rukiga", "Rukungiri"])
    );
  });

  it("loads structured Western administrative units for Hoima City, Mbarara City, and Isingiro", () => {
    const western = getGeoCatalog().find((entry) => entry.region === "Western");
    const bunyoro = western.subregions.find((entry) => entry.subregion === "Bunyoro");
    const ankole = western.subregions.find((entry) => entry.subregion === "Ankole");
    const hoimaCity = bunyoro.districts.find((entry) => entry.district === "Hoima City");
    const mbararaCity = ankole.districts.find((entry) => entry.district === "Mbarara City");
    const isingiro = ankole.districts.find((entry) => entry.district === "Isingiro");

    expect(hoimaCity.administrativeUnits.map((entry) => entry.name)).toEqual(
      expect.arrayContaining(["Hoima East Division", "Hoima West Division"])
    );
    expect(mbararaCity.administrativeUnits.map((entry) => entry.name)).toEqual(
      expect.arrayContaining(["Mbarara North Division", "Mbarara South Division"])
    );
    expect(isingiro.administrativeUnits.map((entry) => entry.name)).toEqual(
      expect.arrayContaining([
        "Bukanga County",
        "Bukanga North County",
        "Isingiro County",
        "Isingiro West County"
      ])
    );
  });

  it("preserves Western refugee settlements as a distinct sub unit type", () => {
    const western = getGeoCatalog().find((entry) => entry.region === "Western");
    const bunyoro = western.subregions.find((entry) => entry.subregion === "Bunyoro");
    const toro = western.subregions.find((entry) => entry.subregion === "Toro");
    const ankole = western.subregions.find((entry) => entry.subregion === "Ankole");
    const kikuube = bunyoro.districts.find((entry) => entry.district === "Kikuube");
    const kamwenge = toro.districts.find((entry) => entry.district === "Kamwenge");
    const kyegegwa = toro.districts.find((entry) => entry.district === "Kyegegwa");
    const isingiro = ankole.districts.find((entry) => entry.district === "Isingiro");

    expect(
      kikuube.administrativeUnits
        .find((entry) => entry.name === "Buhaguzi County")
        .subUnits.find((entry) => entry.name === "Kyangwali Refugee Settlement Camp")
    ).toEqual(expect.objectContaining({ type: "REFUGEE_SETTLEMENT" }));

    expect(
      kamwenge.administrativeUnits
        .find((entry) => entry.name === "Kibale East County")
        .subUnits.find((entry) => entry.name === "Rwamwanja Refugee Camp")
    ).toEqual(expect.objectContaining({ type: "REFUGEE_SETTLEMENT" }));

    expect(
      kyegegwa.administrativeUnits
        .find((entry) => entry.name === "Kyaka Central County")
        .subUnits.find((entry) => entry.name === "Kyaka II Refugee Camp")
    ).toEqual(expect.objectContaining({ type: "REFUGEE_SETTLEMENT" }));

    expect(
      isingiro.administrativeUnits
        .find((entry) => entry.name === "Bukanga North County")
        .subUnits.find((entry) => entry.name === "Nakivale Basecamp Refugee Camp")
    ).toEqual(expect.objectContaining({ type: "REFUGEE_SETTLEMENT" }));
  });

  it("rejects invalid geography combinations", () => {
    expect(
      validateAgentGeography({
        region: "Central",
        district: "Gulu",
        county: "Aswa",
        subcounty: "Bungatira"
      })
    ).toEqual(
      expect.objectContaining({
        valid: false
      })
    );
  });

  it("inherits user geography from the assigned agent with optional subcounty override", () => {
    expect(
      buildUserGeoFromAgent(
        {
          region: "Western",
          district: "Mbarara",
          county: "Kashari",
          subcounty: "Bugamba"
        },
        { subcounty: "Biharwe" }
      )
    ).toEqual({
      country: "UGANDA",
      region: "Western",
      subregion: "Ankole",
      district: "Mbarara",
      administrativeUnit: "Kashari",
      subUnit: "Biharwe",
      county: "Ankole",
      subcounty: "Biharwe",
      village: ""
    });
  });

  it("builds an immutable loan geo snapshot", () => {
    const timestamp = new Date("2026-05-03T09:15:00.000Z");
    const snapshot = buildLoanGeoSnapshot({
      userLocation: {
        region: "Central",
        district: "Kampala",
        county: "Kawempe",
        subcounty: "Kalerwe"
      },
      agentLocation: {
        region: "Central",
        district: "Kampala",
        county: "Kawempe",
        subcounty: "Bwaise"
      },
      loanLocation: {
        region: "Central",
        district: "Kampala",
        county: "Kawempe",
        subcounty: "Kalerwe"
      },
      timestamp
    });

    expect(snapshot).toEqual({
      userLocation: {
        country: "UGANDA",
        region: "Central",
        subregion: "Kampala",
        district: "Kampala",
        administrativeUnit: "Kawempe",
        subUnit: "Kalerwe",
        county: "Kawempe",
        subcounty: "Kalerwe",
        village: ""
      },
      agentLocation: {
        country: "UGANDA",
        region: "Central",
        subregion: "Kampala",
        district: "Kampala",
        administrativeUnit: "Kawempe",
        subUnit: "Bwaise",
        county: "Kawempe",
        subcounty: "Bwaise",
        village: ""
      },
      loanLocation: {
        country: "UGANDA",
        region: "Central",
        subregion: "Kampala",
        district: "Kampala",
        administrativeUnit: "Kawempe",
        subUnit: "Kalerwe",
        county: "Kawempe",
        subcounty: "Kalerwe",
        village: ""
      },
      timestamp
    });
  });
});
