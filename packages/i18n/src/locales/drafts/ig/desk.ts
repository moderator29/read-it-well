import type { Translation } from "../../fallback";

/* MACHINE DRAFT, 30 September 2026. Needs a native Igbo speaker's review
   (review-status.ts). */
export const deskIg = {
  sidebar: {
    main: "Isi",
    hostDesk: "Ebe ọrụ onye nnabata",
    agentDesk: "Ebe ọrụ onye nnọchiteanya",
  },
  today: {
    title: "Taa",
    needsYou: "Ihe chọrọ gị taa",
    nothing: "Ọ dịghị ihe chọrọ gị taa.",
    needsAttention: "Chọrọ nlebara anya",
    seeNumbers: "Lee ọnụọgụ",
    viewAll: "Lee ha niile {count}",
    openList: "Mepee ndepụta ahụ",
    sumLine: "Ọnụọgụ ọ bụla na-eduga na ndepụta o si na ya pụta.",
  },
  range: {
    label: "Oge",
    d7: "Ụbọchị 7 gara aga",
    d30: "Ụbọchị 30 gara aga",
    d90: "Ụbọchị 90 gara aga",
  },
  host: {
    kpi: {
      arriving: "Ndị na-abịa taa",
      staying: "Ndị na-anọ n'abalị a",
      requests: "Arịrịọ na-eche",
      unread: "Ozi a gụbeghị",
    },
    unit: {
      arriving: { other: "ọbịa" },
      requests: { other: "arịrịọ" },
      unread: { other: "ozi" },
    },
    pipeline: "Ndebe dịka ọnọdụ ha si dị",
    pipelineTotal: "ndebe",
    stage: {
      requested: "Arịọrọ",
      confirmed: "Akwadoro",
      checkedIn: "Nọ ugbu a",
      completed: "Emechara",
    },
    newListing: "Tinye azụmahịa",
    attention: {
      request: "Arịrịọ ndebe sitere n'aka {guest}",
      table: "Arịrịọ tebụl sitere n'aka {guest}",
      draft: "Ezipụbeghị arịrịọ ahụ",
      draftSub: "Ihe {count} fọdụrụ ịtinye",
      stopped: "Mepee ya ka ị gụọ ndetu onye nyocha",
    },
  },
  agent: {
    kpi: {
      live: "Ndepụta dị ndụ",
      inspections: "Arịrịọ nyocha",
      review: "N'okpuru nyocha",
      unread: "Ozi a gụbeghị",
    },
    pipeline: "Ndepụta dịka ọnọdụ ha si dị",
    pipelineTotal: "ndepụta",
    stage: {
      draft: "Nde mbụ",
      review: "N'okpuru nyocha",
      live: "Dị ndụ",
      other: "Akwụsịrị ma ọ bụ mechiri",
    },
  },
  admin: {
    kpi: {
      queue: "Ahịrị ọrụ mepere emepe",
      reviews: "Nyocha ruru eru",
      alerts: "Ọkwa",
      tickets: "Tiketi enyemaka",
    },
    pipeline: "Ọrụ dịka tebụl si dị",
    pipelineTotal: "na-eche",
  },
  confirm: {
    close: "Mechie",
    cancel: "Kagbuo",
    next: "Ihe na-esote",
    everyone: "Ihe onye ọ bụla na-enweta",
    total: "Mkpokọta",
  },
} satisfies NonNullable<Translation["desk"]>;
