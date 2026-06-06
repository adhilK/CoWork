/**
 * Seed file: LaunchHub Coworking
 * Creates realistic demo data for development and staging.
 *
 * Run with: npx prisma db seed
 */

import { PrismaClient, BookingStatus, InvoiceStatus, MemberStatus } from "@prisma/client";
import { addDays, addHours, addMonths, subDays, subMonths, startOfDay, setHours, setMinutes } from "date-fns";

const prisma = new PrismaClient();

// ── Helpers ───────────────────────────────────────────────────────────────────

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function bookingAt(date: Date, hour: number, durationHours: number) {
  const start = setMinutes(setHours(startOfDay(date), hour), 0);
  const end = addHours(start, durationHours);
  return { startTime: start, endTime: end };
}

// ── Seed data constants ───────────────────────────────────────────────────────

const MEMBER_NAMES = [
  { name: "Sarah Mitchell", company: "Bloom Design Co.", jobTitle: "UX Designer" },
  { name: "James Okafor", company: "Okafor Consulting", jobTitle: "Business Consultant" },
  { name: "Priya Sharma", company: "TechVenture", jobTitle: "Software Engineer" },
  { name: "Tom Hargreaves", company: "Hargreaves Law", jobTitle: "Solicitor" },
  { name: "Aisha Patel", company: "Freelance", jobTitle: "Content Strategist" },
  { name: "Marcus Webb", company: "Webb Media", jobTitle: "Video Producer" },
  { name: "Charlotte Davies", company: "Northstar Analytics", jobTitle: "Data Analyst" },
  { name: "Riku Yamamoto", company: "Freelance", jobTitle: "iOS Developer" },
  { name: "Elena Torres", company: "Torres PR", jobTitle: "PR Specialist" },
  { name: "Ben Archer", company: "Archer Photography", jobTitle: "Photographer" },
  { name: "Nina Kowalski", company: "Pixel Forge", jobTitle: "Motion Designer" },
  { name: "David Chen", company: "Chen Capital", jobTitle: "Investment Analyst" },
  { name: "Fatima Al-Hassan", company: "FemTech Hub", jobTitle: "Product Manager" },
  { name: "Oliver Stone", company: "Stone Architecture", jobTitle: "Architect" },
  { name: "Imogen Hart", company: "Freelance", jobTitle: "Copywriter" },
  { name: "Leo Batista", company: "Batista Apps", jobTitle: "Full Stack Developer" },
  { name: "Amara Johnson", company: "Johnson Health Co.", jobTitle: "Health Coach" },
  { name: "Felix Müller", company: "MüllerTech", jobTitle: "CTO" },
  { name: "Zara Nkomo", company: "Nkomo Fashion", jobTitle: "Fashion Designer" },
  { name: "Ryan O'Brien", company: "OBrien Marketing", jobTitle: "Marketing Director" },
  { name: "Hana Suzuki", company: "Freelance", jobTitle: "Graphic Designer" },
  { name: "Nathan Blake", company: "Blake Finance", jobTitle: "Financial Advisor" },
  { name: "Sofia Ricci", company: "Ricci Culinary", jobTitle: "Food Consultant" },
  { name: "Kwame Asante", company: "Asante Tech", jobTitle: "Security Engineer" },
  { name: "Lily Pemberton", company: "Pemberton Events", jobTitle: "Event Planner" },
];

const BOOKING_TITLES = [
  "Team standup",
  "Client presentation",
  "Design review",
  "Product demo",
  "Strategy session",
  "1:1 meeting",
  "Investor call",
  "Workshop",
  "Brainstorm session",
  "Weekly sync",
  "Podcast recording",
  "Content creation",
  "Sales call",
  "Focus work",
  "Interview",
];

// ── Main seed function ────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Starting seed...");

  // ── Clean existing data ──────────────────────────────────────────────────
  await prisma.invoice.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.member.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.membershipPlan.deleteMany();
  await prisma.location.deleteMany();
  await prisma.userOrganization.deleteMany();
  await prisma.user.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.event.deleteMany();
  await prisma.organization.deleteMany();

  // ── 1. Organization ──────────────────────────────────────────────────────
  console.log("  Creating organization...");
  const org = await prisma.organization.create({
    data: {
      name: "LaunchHub Coworking",
      slug: "launchhub",
      email: "hello@launchhub.co.uk",
      phone: "+44 20 7123 4567",
      address: "14 Shoreditch High St, London, E1 6JE",
      website: "https://launchhub.co.uk",
      timezone: "Europe/London",
      currency: "GBP",
      plan: "PRO",
      trialEndsAt: addDays(new Date(), 10), // 10 days remaining
    },
  });

  // ── 2. Owner user ────────────────────────────────────────────────────────
  console.log("  Creating owner + admin users...");
  const owner = await prisma.user.create({
    data: {
      id: "owner-launchhub-001",
      email: "owner@launchhub.co.uk",
      name: "Alex Morgan",
      isSuperAdmin: false,
    },
  });

  await prisma.userOrganization.create({
    data: { userId: owner.id, organizationId: org.id, role: "OWNER" },
  });

  const admin = await prisma.user.create({
    data: {
      id: "admin-launchhub-001",
      email: "admin@launchhub.co.uk",
      name: "Jordan Lee",
      isSuperAdmin: false,
    },
  });

  await prisma.userOrganization.create({
    data: { userId: admin.id, organizationId: org.id, role: "ADMIN" },
  });

  // ── 3. Location ──────────────────────────────────────────────────────────
  console.log("  Creating location...");
  const location = await prisma.location.create({
    data: {
      organizationId: org.id,
      name: "Main Floor",
      address: "14 Shoreditch High St, London, E1 6JE",
      isActive: true,
    },
  });

  // ── 4. Membership plans ──────────────────────────────────────────────────
  console.log("  Creating membership plans...");
  const plans = await Promise.all([
    prisma.membershipPlan.create({
      data: {
        organizationId: org.id,
        name: "Day Pass",
        type: "DAY_PASS",
        price: 25,
        billingCycle: "DAILY",
        includedCredits: 1,
        meetingRoomHours: 0,
        features: ["WiFi", "Coffee & tea", "Printing (10 pages)"],
        isActive: true,
      },
    }),
    prisma.membershipPlan.create({
      data: {
        organizationId: org.id,
        name: "Hot Desk Monthly",
        type: "HOT_DESK",
        price: 250,
        billingCycle: "MONTHLY",
        includedCredits: 20,
        meetingRoomHours: 2,
        features: ["24/5 access", "WiFi", "Coffee & tea", "2h meeting room/mo", "Mail handling"],
        isActive: true,
      },
    }),
    prisma.membershipPlan.create({
      data: {
        organizationId: org.id,
        name: "Dedicated Desk",
        type: "DEDICATED_DESK",
        price: 400,
        billingCycle: "MONTHLY",
        includedCredits: 40,
        meetingRoomHours: 5,
        features: ["24/7 access", "Your own desk", "Storage locker", "5h meeting room/mo", "Mail handling", "5 guests/mo"],
        isActive: true,
      },
    }),
    prisma.membershipPlan.create({
      data: {
        organizationId: org.id,
        name: "Private Office",
        type: "PRIVATE_OFFICE",
        price: 800,
        billingCycle: "MONTHLY",
        includedCredits: 80,
        meetingRoomHours: 10,
        features: ["24/7 access", "Private lockable office", "10h meeting room/mo", "Unlimited guests", "Dedicated mail", "Receptionist service"],
        isActive: true,
      },
    }),
  ]);

  const dayPassPlan = plans[0]!;
  const hotDeskPlan = plans[1]!;
  const dedicatedDeskPlan = plans[2]!;
  const privateOfficePlan = plans[3]!;

  // ── 5. Resources ─────────────────────────────────────────────────────────
  console.log("  Creating resources...");
  const resources = await Promise.all([
    prisma.resource.create({
      data: {
        organizationId: org.id,
        locationId: location.id,
        name: "Hot Desk Area",
        type: "HOT_DESK",
        description: "Open-plan hot desk area with fast WiFi and standing desk options available.",
        capacity: 20,
        hourlyRate: 8,
        halfDayRate: 25,
        fullDayRate: 45,
        amenities: ["WiFi", "Standing desks", "Coffee", "Printing"],
        isActive: true,
        requiresApproval: false,
        advanceBookingDays: 30,
        minBookingMinutes: 60,
        maxBookingHours: 8,
      },
    }),
    prisma.resource.create({
      data: {
        organizationId: org.id,
        locationId: location.id,
        name: "Meeting Room A",
        type: "MEETING_ROOM",
        description: "Sleek 6-person meeting room with 4K display, video conferencing, and whiteboard.",
        capacity: 6,
        hourlyRate: 15,
        halfDayRate: 50,
        fullDayRate: 90,
        amenities: ["4K Display", "Video Conferencing", "Whiteboard", "WiFi", "Coffee"],
        isActive: true,
        requiresApproval: false,
        advanceBookingDays: 30,
        minBookingMinutes: 30,
        maxBookingHours: 8,
      },
    }),
    prisma.resource.create({
      data: {
        organizationId: org.id,
        locationId: location.id,
        name: "Meeting Room B",
        type: "MEETING_ROOM",
        description: "Larger 10-person boardroom with dual displays, perfect for workshops and team sessions.",
        capacity: 10,
        hourlyRate: 20,
        halfDayRate: 65,
        fullDayRate: 110,
        amenities: ["Dual Displays", "Video Conferencing", "Whiteboard", "Flipchart", "WiFi", "Water"],
        isActive: true,
        requiresApproval: false,
        advanceBookingDays: 30,
        minBookingMinutes: 30,
        maxBookingHours: 8,
      },
    }),
    prisma.resource.create({
      data: {
        organizationId: org.id,
        locationId: location.id,
        name: "Podcast Studio",
        type: "PODCAST_ROOM",
        description: "Professionally treated podcast room with Rode microphones, audio interface, and acoustic panels.",
        capacity: 4,
        hourlyRate: 25,
        halfDayRate: 80,
        fullDayRate: 140,
        amenities: ["Rode Mics", "Audio Interface", "Acoustic Treatment", "Monitoring Headphones", "Pop Filters"],
        isActive: true,
        requiresApproval: true,
        advanceBookingDays: 14,
        minBookingMinutes: 60,
        maxBookingHours: 6,
      },
    }),
    prisma.resource.create({
      data: {
        organizationId: org.id,
        locationId: location.id,
        name: "Private Office 1",
        type: "PRIVATE_OFFICE",
        description: "Fully furnished private office for up to 4 people, with lockable door and dedicated storage.",
        capacity: 4,
        hourlyRate: 35,
        halfDayRate: 120,
        fullDayRate: 200,
        amenities: ["Private lockable", "Dedicated storage", "Monitor", "WiFi", "Whiteboard", "AC"],
        isActive: true,
        requiresApproval: false,
        advanceBookingDays: 60,
        minBookingMinutes: 120,
        maxBookingHours: 8,
      },
    }),
  ]);

  const hotDesk = resources[0]!;
  const meetingRoomA = resources[1]!;
  const meetingRoomB = resources[2]!;
  const podcastStudio = resources[3]!;
  const privateOffice = resources[4]!;

  // ── 6. Member users (25 members) ─────────────────────────────────────────
  console.log("  Creating 25 members...");
  const memberPlanAssignment = [
    hotDeskPlan, hotDeskPlan, hotDeskPlan, hotDeskPlan, hotDeskPlan,
    hotDeskPlan, hotDeskPlan, hotDeskPlan,
    dedicatedDeskPlan, dedicatedDeskPlan, dedicatedDeskPlan, dedicatedDeskPlan, dedicatedDeskPlan,
    dedicatedDeskPlan, dedicatedDeskPlan,
    privateOfficePlan, privateOfficePlan, privateOfficePlan,
    dayPassPlan, dayPassPlan, dayPassPlan,
    hotDeskPlan, hotDeskPlan, dedicatedDeskPlan, privateOfficePlan,
  ] as (typeof plans[number])[];

  const memberStatusList: MemberStatus[] = [
    "ACTIVE", "ACTIVE", "ACTIVE", "ACTIVE", "ACTIVE",
    "ACTIVE", "ACTIVE", "ACTIVE", "ACTIVE", "ACTIVE",
    "ACTIVE", "ACTIVE", "ACTIVE", "ACTIVE", "ACTIVE",
    "ACTIVE", "ACTIVE", "ACTIVE", "ACTIVE", "ACTIVE",
    "ACTIVE", "ACTIVE", "INACTIVE", "SUSPENDED", "PENDING",
  ];

  const createdMembers = [];

  for (let i = 0; i < 25; i++) {
    const memberData = MEMBER_NAMES[i]!;
    const plan = memberPlanAssignment[i]!;
    const status = memberStatusList[i] ?? "ACTIVE";

    const user = await prisma.user.create({
      data: {
        id: `member-${i + 1}-launchhub`,
        email: `${memberData.name.toLowerCase().replace(/\s/g, ".")}@example.com`,
        name: memberData.name,
      },
    });

    await prisma.userOrganization.create({
      data: { userId: user.id, organizationId: org.id, role: "MEMBER" },
    });

    const member = await prisma.member.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        membershipPlanId: plan.id,
        status,
        startDate: subMonths(new Date(), randomBetween(1, 18)),
        credits: randomBetween(0, 30),
        company: memberData.company,
        jobTitle: memberData.jobTitle,
        phone: `+44 7${randomBetween(100, 999)} ${randomBetween(100000, 999999)}`,
      },
    });

    createdMembers.push({ user, member });
  }

  // ── 7. Bookings (120+ across 90 days) ───────────────────────────────────
  console.log("  Creating 120+ bookings...");
  const today = startOfDay(new Date());
  const allResources = [hotDesk, meetingRoomA, meetingRoomB, podcastStudio, privateOffice];
  const activeMembers = createdMembers.slice(0, 22); // only active members book

  let bookingCount = 0;

  // Past bookings — 60 days back
  const bookingData: Parameters<typeof prisma.booking.createMany>[0]["data"] = [];

  for (let daysBack = 60; daysBack >= 1; daysBack--) {
    const date = subDays(today, daysBack);
    const numBookings = randomBetween(2, 5);

    for (let b = 0; b < numBookings; b++) {
      const resource = randomFrom(allResources);
      const memberData = randomFrom(activeMembers);
      const startHour = randomBetween(8, 16);
      const duration = randomBetween(1, 3);
      const times = bookingAt(date, startHour, duration);

      let status: BookingStatus = "COMPLETED";
      if (Math.random() < 0.08) status = "CANCELLED";
      if (Math.random() < 0.05) status = "NO_SHOW";

      bookingData.push({
        organizationId: org.id,
        resourceId: resource!.id,
        memberId: memberData!.member.id,
        userId: memberData!.user.id,
        title: randomFrom(BOOKING_TITLES) ?? "Meeting",
        ...times,
        status,
        creditsUsed: Math.random() > 0.5 ? randomBetween(1, 3) : 0,
        amountCharged: Math.random() > 0.5 ? resource!.hourlyRate?.toNumber()! * duration : 0,
        attendees: randomBetween(1, resource!.capacity),
        checkedInAt: status === "COMPLETED" || status === "NO_SHOW" ? addHours(times.startTime, 0) : null,
        checkedOutAt: status === "COMPLETED" ? times.endTime : null,
      });
      bookingCount++;
    }
  }

  // Current week bookings
  for (let dayOffset = 0; dayOffset <= 6; dayOffset++) {
    const date = addDays(today, dayOffset);
    const numBookings = randomBetween(3, 6);

    for (let b = 0; b < numBookings; b++) {
      const resource = randomFrom(allResources);
      const memberData = randomFrom(activeMembers);
      const startHour = randomBetween(8, 16);
      const duration = randomBetween(1, 3);
      const times = bookingAt(date, startHour, duration);

      const isToday = dayOffset === 0;
      let status: BookingStatus = "CONFIRMED";
      if (isToday && times.startTime < new Date() && times.endTime > new Date()) {
        status = "CHECKED_IN";
      } else if (isToday && times.endTime < new Date()) {
        status = "COMPLETED";
      } else if (Math.random() < 0.1) {
        status = "PENDING";
      }

      bookingData.push({
        organizationId: org.id,
        resourceId: resource!.id,
        memberId: memberData!.member.id,
        userId: memberData!.user.id,
        title: randomFrom(BOOKING_TITLES) ?? "Meeting",
        ...times,
        status,
        creditsUsed: randomBetween(0, 2),
        amountCharged: 0,
        attendees: randomBetween(1, Math.min(resource!.capacity, 6)),
        checkedInAt: status === "CHECKED_IN" || status === "COMPLETED" ? times.startTime : null,
        checkedOutAt: status === "COMPLETED" ? times.endTime : null,
      });
      bookingCount++;
    }
  }

  // Future bookings — 30 days ahead
  for (let daysAhead = 7; daysAhead <= 30; daysAhead++) {
    const date = addDays(today, daysAhead);
    const numBookings = randomBetween(1, 4);

    for (let b = 0; b < numBookings; b++) {
      const resource = randomFrom(allResources);
      const memberData = randomFrom(activeMembers);
      const startHour = randomBetween(8, 16);
      const duration = randomBetween(1, 3);
      const times = bookingAt(date, startHour, duration);

      bookingData.push({
        organizationId: org.id,
        resourceId: resource!.id,
        memberId: memberData!.member.id,
        userId: memberData!.user.id,
        title: randomFrom(BOOKING_TITLES) ?? "Meeting",
        ...times,
        status: Math.random() < 0.15 ? "PENDING" : "CONFIRMED",
        creditsUsed: randomBetween(0, 2),
        amountCharged: 0,
        attendees: randomBetween(1, Math.min(resource!.capacity, 6)),
      });
      bookingCount++;
    }
  }

  // Single batch insert all bookings
  await prisma.booking.createMany({ data: bookingData, skipDuplicates: true });

  console.log(`  ✓ Created ${bookingCount} bookings`);

  // ── 8. Invoices ──────────────────────────────────────────────────────────
  console.log("  Creating invoices...");
  const invoiceStatuses: { status: InvoiceStatus; count: number }[] = [
    { status: "PAID", count: 30 },
    { status: "PENDING", count: 6 },
    { status: "OVERDUE", count: 4 },
  ];

  const invoiceData: Parameters<typeof prisma.invoice.createMany>[0]["data"] = [];
  let invoiceNum = 1;

  for (const { status, count } of invoiceStatuses) {
    for (let i = 0; i < count; i++) {
      const memberData = randomFrom(activeMembers.slice(0, 20));
      const plan = memberData!.member.membershipPlanId
        ? plans.find((p) => p!.id === memberData!.member.membershipPlanId)
        : hotDeskPlan;

      const monthsAgo = randomBetween(0, 5);
      const periodStart = subMonths(today, monthsAgo + 1);
      const periodEnd = subMonths(today, monthsAgo);
      const dueDate = addDays(periodEnd, 7);
      const amount = plan?.price.toNumber() ?? 250;

      invoiceData.push({
        organizationId: org.id,
        memberId: memberData!.member.id,
        invoiceNumber: `INV-${new Date().getFullYear()}-${String(invoiceNum++).padStart(3, "0")}`,
        amount,
        currency: "GBP",
        status,
        dueDate,
        paidAt: status === "PAID" ? addDays(periodEnd, randomBetween(1, 6)) : null,
        periodStart,
        periodEnd,
        lineItems: [
          {
            description: `${plan?.name ?? "Hot Desk Monthly"} — ${format(periodStart, "MMM yyyy")}`,
            quantity: 1,
            unitPrice: amount,
            total: amount,
          },
        ],
      });
    }
  }

  await prisma.invoice.createMany({ data: invoiceData, skipDuplicates: true });

  // ── 9. Announcements ─────────────────────────────────────────────────────
  console.log("  Creating announcements + events...");
  await Promise.all([
    prisma.announcement.create({
      data: {
        organizationId: org.id,
        title: "Welcome to LaunchHub! 🚀",
        body: "We're so excited to have you here. Make yourself at home, grab a coffee, and don't hesitate to ask if you need anything. Our community Slack is #launchhub-general.",
        isPinned: true,
      },
    }),
    prisma.announcement.create({
      data: {
        organizationId: org.id,
        title: "New: Super-fast WiFi Upgrade ⚡",
        body: "We've just upgraded our internet to 1Gbps symmetrical. The new WiFi SSID is 'LaunchHub-Pro' and the password is on the noticeboard. Enjoy the speed!",
        isPinned: false,
      },
    }),
    prisma.announcement.create({
      data: {
        organizationId: org.id,
        title: "Community Drinks — Friday 6pm 🍻",
        body: "Join us this Friday for our monthly community drinks! Beer, wine, and soft drinks on us. A great chance to meet your fellow LaunchHubbers. Ground floor, from 6pm.",
        isPinned: false,
      },
    }),
  ]);

  await Promise.all([
    prisma.event.create({
      data: {
        organizationId: org.id,
        title: "Startup Pitch Night",
        description: "Join us for an evening of startup pitches from LaunchHub members. 5 founders, 5 minutes each, followed by Q&A and networking.",
        startTime: addDays(setHours(today, 18), 7),
        endTime: addDays(setHours(today, 21), 7),
        location: "Main Floor — Event Space",
        capacity: 50,
        isPublic: true,
      },
    }),
    prisma.event.create({
      data: {
        organizationId: org.id,
        title: "Productivity Workshop: Deep Work Techniques",
        description: "A 2-hour workshop on deep work, flow states, and building better focus habits. Led by our member James Okafor.",
        startTime: addDays(setHours(today, 10), 14),
        endTime: addDays(setHours(today, 12), 14),
        location: "Meeting Room B",
        capacity: 20,
        isPublic: false,
      },
    }),
  ]);

  console.log(`\n✅ Seed complete!`);
  console.log(`   Organization: LaunchHub Coworking (slug: launchhub)`);
  console.log(`   Owner: owner@launchhub.co.uk`);
  console.log(`   Admin: admin@launchhub.co.uk`);
  console.log(`   Members: 25`);
  console.log(`   Resources: 5`);
  console.log(`   Bookings: ${bookingCount}`);
  console.log(`   Invoices: 40 (30 paid, 6 pending, 4 overdue)`);
}

// Required for date-fns format in seed
function format(date: Date, formatStr: string): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  if (formatStr === "MMM yyyy") {
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  }
  return date.toLocaleDateString();
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
