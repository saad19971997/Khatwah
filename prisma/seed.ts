import { PrismaClient } from "@prisma/client";
import { consultants } from "../config/consultants";

const prisma = new PrismaClient();

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

async function main() {
  const slugs = consultants.map((c) => c.slug);

  for (const [i, c] of consultants.entries()) {
    for (const a of c.availability) {
      if (!HHMM.test(a.start) || !HHMM.test(a.end) || a.start >= a.end || a.weekday < 0 || a.weekday > 6) {
        throw new Error(`Invalid availability for ${c.slug}: ${JSON.stringify(a)}`);
      }
    }
    const data = {
      name: c.name,
      initials: c.initials,
      role: c.role,
      bio: c.bio,
      avatarBg: c.avatarBg,
      avatarFg: c.avatarFg,
      durationMin: c.durationMin,
      priceHalalas: c.priceHalalas,
      email: c.email,
      active: true,
      sortOrder: i,
    };
    const row = await prisma.consultant.upsert({
      where: { slug: c.slug },
      create: { slug: c.slug, ...data },
      update: data,
    });

    // Availability is fully owned by the config file: replace it.
    await prisma.$transaction([
      prisma.availabilityRule.deleteMany({ where: { consultantId: row.id } }),
      prisma.availabilityRule.createMany({
        data: c.availability.map((a) => ({
          consultantId: row.id,
          weekday: a.weekday,
          startTime: a.start,
          endTime: a.end,
        })),
      }),
      prisma.availabilityException.deleteMany({ where: { consultantId: row.id } }),
      prisma.availabilityException.createMany({
        data: (c.blockedDates ?? []).map((date) => ({ consultantId: row.id, date })),
      }),
    ]);
    console.log(`✓ ${c.slug}`);
  }

  const { count } = await prisma.consultant.updateMany({
    where: { slug: { notIn: slugs }, active: true },
    data: { active: false },
  });
  if (count) console.log(`Deactivated ${count} consultant(s) no longer in config.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
