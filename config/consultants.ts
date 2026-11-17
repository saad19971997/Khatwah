/**
 * Consultants, prices and weekly availability.
 *
 * This file is how consultants are managed in v1 (there is no admin UI).
 * Edit it, then run `npm run db:seed` to apply the changes. The seed
 * upserts by `slug`; a consultant removed from this list is deactivated
 * (hidden from the site) rather than deleted, so past bookings remain intact.
 *
 * Times are local Asia/Riyadh "HH:mm". Weekday: 0 = Sunday … 6 = Saturday.
 * Prices are in halalas (SAR × 100).
 */

export type ConsultantConfig = {
  slug: string;
  name: string;
  initials: string;
  role: string;
  bio: string;
  avatarBg: string;
  avatarFg: string;
  durationMin: number;
  priceHalalas: number;
  email: string;
  availability: { weekday: number; start: string; end: string }[];
  /** Local dates ("YYYY-MM-DD") on which the consultant is unavailable. */
  blockedDates?: string[];
};

export const consultants: ConsultantConfig[] = [
  {
    slug: "noura",
    name: "نورة العتيبي",
    initials: "ن",
    role: "مستشارة تسويق",
    bio: "تساعدك على تحديد جمهورك الأول واختيار قنوات تسويق تناسب ميزانية مشروع ناشئ.",
    avatarBg: "#E3F1EF",
    avatarFg: "#0F5F5C",
    durationMin: 30,
    priceHalalas: 15000,
    email: "noura@example.com",
    availability: [
      { weekday: 0, start: "16:00", end: "19:00" },
      { weekday: 2, start: "16:00", end: "19:00" },
      { weekday: 3, start: "19:00", end: "21:00" },
    ],
  },
  {
    slug: "fahad",
    name: "فهد الشمري",
    initials: "ف",
    role: "مستشار نموذج العمل",
    bio: "يراجع معك مصادر الإيراد والتكاليف ليتأكد أن فكرتك قابلة للاستمرار والنمو.",
    avatarBg: "#E8EEF8",
    avatarFg: "#2F4C7A",
    durationMin: 45,
    priceHalalas: 20000,
    email: "fahad@example.com",
    availability: [
      { weekday: 1, start: "19:30", end: "21:45" },
      { weekday: 3, start: "19:30", end: "21:45" },
    ],
  },
  {
    slug: "reem",
    name: "ريم الدوسري",
    initials: "ر",
    role: "مستشارة تمويل",
    bio: "توضح لك خيارات التمويل المناسبة لمرحلتك وما تحتاج تجهيزه قبل التقدم لها.",
    avatarBg: "#FBEFE3",
    avatarFg: "#8A4B12",
    durationMin: 45,
    priceHalalas: 25000,
    email: "reem@example.com",
    availability: [
      { weekday: 4, start: "10:00", end: "13:00" },
      { weekday: 6, start: "10:00", end: "11:30" },
    ],
  },
];
