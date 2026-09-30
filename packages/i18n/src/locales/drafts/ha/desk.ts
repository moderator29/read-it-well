import type { Translation } from "../../fallback";

/* MACHINE DRAFT, 30 September 2026. Needs a native Hausa speaker's review
   (review-status.ts). */
export const deskHa = {
  sidebar: {
    main: "Babba",
    hostDesk: "Wurin aikin mai masauki",
    agentDesk: "Wurin aikin wakili",
  },
  today: {
    title: "Yau",
    needsYou: "Abin da ke buƙatarka yau",
    nothing: "Babu abin da ke buƙatarka yau.",
    needsAttention: "Yana buƙatar kulawa",
    seeNumbers: "Duba alƙaluma",
    viewAll: "Duba duka {count}",
    openList: "Buɗe jerin",
    sumLine: "Kowace ƙidaya tana kai ka ga jerin da ta fito.",
  },
  range: {
    label: "Lokaci",
    d7: "Kwanaki 7 da suka wuce",
    d30: "Kwanaki 30 da suka wuce",
    d90: "Kwanaki 90 da suka wuce",
  },
  host: {
    kpi: {
      arriving: "Masu isowa yau",
      staying: "Masu kwana yau",
      requests: "Buƙatun da ke jira",
      unread: "Saƙonnin da ba a karanta ba",
    },
    unit: {
      arriving: { one: "baƙo", other: "baƙi" },
      requests: { one: "buƙata", other: "buƙatu" },
      unread: { one: "saƙo", other: "saƙonni" },
    },
    pipeline: "Ajiyoyi bisa matsayi",
    pipelineTotal: "ajiyoyi",
    stage: {
      requested: "An nema",
      confirmed: "An tabbatar",
      checkedIn: "Suna nan yanzu",
      completed: "An kammala",
    },
    newListing: "Ƙara kasuwanci",
    attention: {
      request: "Buƙatar ajiya daga {guest}",
      table: "Buƙatar tebur daga {guest}",
      draft: "Ba a aika da takardar nema ba tukuna",
      draftSub: "Abubuwa {count} da suka rage a ƙara",
      stopped: "Buɗe shi don karanta bayanin mai dubawa",
    },
  },
  agent: {
    kpi: {
      live: "Jeri masu aiki",
      inspections: "Buƙatun dubawa",
      review: "Ana dubawa",
      unread: "Saƙonnin da ba a karanta ba",
    },
    pipeline: "Jeri bisa matsayi",
    pipelineTotal: "jeri",
    stage: {
      draft: "Daftari",
      review: "Ana dubawa",
      live: "Yana aiki",
      other: "An dakatar ko an rufe",
    },
  },
  admin: {
    kpi: {
      queue: "Layin aiki a buɗe",
      reviews: "Dubawar da ta kai",
      alerts: "Faɗakarwa",
      tickets: "Tikitin taimako",
    },
    pipeline: "Aiki bisa tebur",
    pipelineTotal: "suna jira",
  },
  confirm: {
    close: "Rufe",
    cancel: "Soke",
    next: "Abin da zai biyo baya",
    everyone: "Abin da kowa zai samu",
    total: "Jimilla",
  },
} satisfies NonNullable<Translation["desk"]>;
