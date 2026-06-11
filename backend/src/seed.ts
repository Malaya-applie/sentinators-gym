import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ─── Admin ─────────────────────────────────────────────
  const adminEmail = process.env.ADMIN_EMAIL || "admin@gym.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin@123";

  const existingAdmin = await prisma.admin.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const hashed = await bcrypt.hash(adminPassword, 12);
    await prisma.admin.create({
      data: { email: adminEmail, password: hashed, name: "Super Admin" },
    });
    console.log(`✅ Admin created: ${adminEmail} / ${adminPassword}`);
  } else {
    console.log("ℹ️  Admin already exists, skipping.");
  }

  // ─── Membership Plans ───────────────────────────────────
  const membershipCount = await prisma.membershipPlan.count();
  if (membershipCount === 0) {
    await prisma.membershipPlan.createMany({
      data: [
        {
          name: "Annual Membership",
          duration: "12 Months",
          price: 639,
          currency: "CHF",
          features: [
            "Full gym access",
            "Modern equipment",
            "Locker room",
            "1 Free PT session",
          ],
          category: "MEMBERSHIP",
        },
        {
          name: "Semi-Annual Membership",
          duration: "6 Months",
          price: 389,
          currency: "CHF",
          features: ["Full gym access", "Modern equipment", "Locker room"],
          category: "MEMBERSHIP",
        },
        {
          name: "Premium Membership",
          duration: "12 Months",
          price: 899,
          currency: "CHF",
          features: [
            "Full gym access",
            "Modern equipment",
            "Locker room",
            "Unlimited PT sessions",
            "Nutrition plan",
          ],
          category: "MEMBERSHIP",
        },
        {
          name: "Student Membership",
          duration: "12 Months",
          price: 479,
          currency: "CHF",
          features: ["Full gym access", "Modern equipment", "Student discount"],
          category: "MEMBERSHIP",
        },
        {
          name: "Monthly Pass",
          duration: "1 Month",
          price: 89,
          currency: "CHF",
          features: ["Full gym access", "Modern equipment"],
          category: "SHORT_TERM",
        },
        {
          name: "Quarterly Pass",
          duration: "3 Months",
          price: 229,
          currency: "CHF",
          features: [
            "Full gym access",
            "Modern equipment",
            "1 Free PT session",
          ],
          category: "SHORT_TERM",
        },
        {
          name: "6-Month Pass",
          duration: "6 Months",
          price: 389,
          currency: "CHF",
          features: ["Full gym access", "Modern equipment", "Locker room"],
          category: "SHORT_TERM",
        },
        {
          name: "Personal Training Pack",
          duration: "12 Months",
          price: 1199,
          currency: "CHF",
          features: [
            "Full gym access",
            "10 PT sessions/month",
            "Nutrition plan",
            "Progress tracking",
          ],
          category: "ADDITIONAL",
        },
        {
          name: "Family Pack",
          duration: "12 Months",
          price: 1099,
          currency: "CHF",
          features: [
            "Full gym access for 2",
            "Modern equipment",
            "Locker rooms",
          ],
          category: "ADDITIONAL",
        },
      ],
    });
    console.log("✅ Membership plans seeded");
  } else {
    console.log("ℹ️  Membership plans already exist, skipping.");
  }

  // ─── Products ───────────────────────────────────────────
  const productCount = await prisma.product.count();
  if (productCount === 0) {
    await prisma.product.createMany({
      data: [
        {
          name: "Stoffwechsel Diät Paket",
          price: 110,
          currency: "CHF",
          image: "/product-1.png",
          category: "Nutrition",
          features: [
            "500g Hy-Pro Protein",
            "120 Kapseln Lipodex",
            "1000ml L-Carnitin Pro",
          ],
          stock: 50,
        },
        {
          name: "Whey Protein Premium",
          price: 75,
          currency: "CHF",
          image: "/product-2.png",
          category: "Supplements",
          features: ["2kg bag", "30 servings", "Multiple flavors"],
          stock: 100,
        },
        {
          name: "Pre-Workout Booster",
          price: 45,
          currency: "CHF",
          image: "/product-3.png",
          category: "Supplements",
          features: ["300g", "30 servings", "Energy boost"],
          stock: 80,
        },
        {
          name: "BCAA Recovery",
          price: 35,
          currency: "CHF",
          image: "/product-4.png",
          category: "Supplements",
          features: ["250g", "25 servings", "Muscle recovery"],
          stock: 120,
        },
        {
          name: "Gym Gloves Pro",
          price: 25,
          currency: "CHF",
          image: "/product-5.png",
          category: "Equipment",
          features: ["Anti-slip", "Breathable", "One size fits all"],
          stock: 200,
        },
        {
          name: "Resistance Bands Set",
          price: 40,
          currency: "CHF",
          image: "/product-6.png",
          category: "Equipment",
          features: ["5 resistance levels", "Portable", "Durable latex"],
          stock: 150,
        },
      ],
    });
    console.log("✅ Products seeded");
  } else {
    console.log("ℹ️  Products already exist, skipping.");
  }

  // ─── Product Categories (Shop Tabs) ─────────────────────
  const categoryCount = await prisma.productCategory.count();
  if (categoryCount === 0) {
    await prisma.productCategory.createMany({
      data: [
        { name: "All", order: 0 },
        { name: "Nutrition", order: 1 },
        { name: "Supplements", order: 2 },
        { name: "Equipment", order: 3 },
      ],
    });
    console.log("✅ Product categories seeded");
  } else {
    console.log("ℹ️  Product categories already exist, skipping.");
  }

  // ─── CMS: Site Content (text / headings) ───────────────
  const textCount = await prisma.siteContent.count();
  if (textCount === 0) {
    await prisma.siteContent.createMany({
      data: [
        // Hero
        { key: "hero_title", value: "FITNESS\nGOALS", section: "hero" },
        {
          key: "hero_subtitle1",
          value:
            "Lorem Ipsum Dolor Sit Amet, Consectetur Adipiscing Elit.Lorem Ipsum Dolor Sit Amet, Consectetur Adipiscing Elit.Lorem Ipsum Dolor Sit Amet, Consectetur Adipiscing Elit.Lorem Ipsum Dolor Sit Amet, Consectetur Adipiscing Elit",
          section: "hero",
        },
        {
          key: "hero_subtitle2",
          value:
            "Lorem Ipsum Dolor Sit Amet, Consectetur Adipiscing Elit.Lorem Ipsum Dolor Sit Amet, Consectetur Adipiscing Elit.",
          section: "hero",
        },
        { key: "hero_button_text", value: "Fill Form", section: "hero" },
        {
          key: "hero_image",
          value:
            "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/anastase-maragos-ehQimz6-1qM-unsplash%201-GdqLOCVXElCrEmbSonGZfnAdIqozNH.png",
          section: "hero",
        },
        // Stats
        {
          key: "stats_bg",
          value:
            "bg-gradient-to-r from-red-900/80 via-red-800/60 to-red-900/80",
          section: "stats",
        },
        // Trainers (home)
        {
          key: "trainers_section_title",
          value: "TRAINERS PREVIEW",
          section: "trainers",
        },
        {
          key: "trainers_section_subtitle",
          value:
            "At This Part You Can Easily Access All Of Our Services. Take A Look At Them And Chose Wish Ever You Want.",
          section: "trainers",
        },
        // Testimonials
        {
          key: "testimonials_section_title",
          value: "TESTIMONIALS",
          section: "testimonials",
        },
        {
          key: "testimonials_section_subtitle",
          value: "Real stories from people who transformed their lives",
          section: "testimonials",
        },
        // Events (home highlights)
        {
          key: "events_section_title",
          value: "EVENT HIGHLIGHTS",
          section: "events",
        },
        {
          key: "events_section_subtitle",
          value: "Moments that defined the experience",
          section: "events",
        },
        // Why Choose Us
        { key: "why_choose_title", value: "WHY CHOOSE US?", section: "why" },
        {
          key: "why_choose_video_image",
          value: "/why-choose-us.png",
          section: "why",
        },
        // Gallery
        { key: "gallery_section_title", value: "Gallery", section: "gallery" },
        {
          key: "gallery_section_subtitle",
          value:
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
          section: "gallery",
        },
        // Blog
        { key: "blog_section_title", value: "BLOG", section: "blog" },
        {
          key: "blog_section_subtitle",
          value:
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
          section: "blog",
        },
        // Newsletter
        {
          key: "newsletter_title",
          value: "JOIN OUR NEWSLETTER",
          section: "newsletter",
        },
        {
          key: "newsletter_subtitle",
          value: "Keep up to date with everything Reflect",
          section: "newsletter",
        },
        // CTA
        { key: "cta_title", value: "START YOUR JOURNEY TODAY", section: "cta" },
        // About Hero
        { key: "about_hero_title", value: "WHO WE ARE", section: "about" },
        {
          key: "about_hero_image",
          value: "/about-hero-image.png",
          section: "about",
        },
        {
          key: "about_hero_text",
          value:
            "Lorem Ipsum Dolor Sit Amet, Consectetur Adipiscing Elit.Lorem Ipsum Dolor Sit Amet, Consectetur Adipiscing Elit.Lorem Ipsum Dolor Sit Amet, Consectetur Adipiscing Elit.Lorem Ipsum Dolor Sit Amet, Consectetur Adipiscing Elit.Lorem Ipsum Dolor Sit Amet, Consectetur Adipiscing Elit. Lorem Ipsum Dolor Sit Amet, Consectetur Adipiscing Elit.Lorem Ipsum Dolor Sit Amet, Consectetur Adipiscing Elit.Lorem Ipsum Dolor Sit Amet, Consectetur Adipiscing Elit. Lorem Ipsum Dolor Sit Amet, Consectetur Adipiscing Elit.Lorem Ipsum Dolor Sit Amet, Consectetur Adipiscing Elit.",
          section: "about",
        },
        // About Story
        {
          key: "about_story_title",
          value: "Gym Story\n& Mission",
          section: "about",
        },
        {
          key: "about_story_text",
          value:
            "Lorem Ipsum Dolor Sit Amet, Consectetur Adipiscing Elit.Lorem Ipsum Dolor Sit Amet, Consectetur Adipiscing Elit.Lorem Ipsum Dolor Sit Amet, Consectetur Adipiscing Elit.Lorem Ipsum Dolor Sit Amet, Consectetur Adipiscing Elit.Lorem Ipsum Dolor Sit Amet, Consectetur Adipiscing Elit. Lorem Ipsum Dolor Sit Amet, Consectetur Adipiscing Elit.Lorem Ipsum Dolor Sit Amet, Consectetur Adipiscing Elit.Lorem Ipsum Dolor Sit Amet, Consectetur Adipiscing Elit. Lorem Ipsum Dolor Sit Amet, Consectetur Adipiscing Elit.Lorem Ipsum Dolor Sit Amet, Consectetur Adipiscing Elit.",
          section: "about",
        },
        // About Trainers
        {
          key: "about_trainers_title",
          value: "OUR TRAINERS",
          section: "about",
        },
        {
          key: "about_trainers_subtitle",
          value:
            "At This Part You Can Easily Access All Of Our Servises. Take A Look At Them And Chose Wich Ever You Want.",
          section: "about",
        },
        // Training Zones
        {
          key: "training_zones_title",
          value: "TRAINING ZONES",
          section: "about",
        },
        {
          key: "training_zones_subtitle",
          value: "Everything You Need For Serious Training Comfort And Result",
          section: "about",
        },
        // Achievements
        {
          key: "achievements_title",
          value: "ACHIEVEMENTS & CERTIFICATION",
          section: "about",
        },
        // Events page
        { key: "events_hero_title", value: "EVENT", section: "events_page" },
        {
          key: "events_hero_image",
          value: "/event-hero-image.jpg",
          section: "events_page",
        },
        // Footer
        {
          key: "footer_description",
          value:
            "Lorem ipsum dolor sit amet consectetur. Ut a mattis augue primum planum est absque. In lorem suspendisse et blandit est ante laboribus. Vel mauris amet mi sit et amet.",
          section: "footer",
        },
        { key: "footer_facebook_url", value: "#", section: "footer" },
        { key: "footer_instagram_url", value: "#", section: "footer" },
        { key: "footer_menu_1_label", value: "Home", section: "footer" },
        { key: "footer_menu_1_url", value: "/", section: "footer" },
        { key: "footer_menu_2_label", value: "About", section: "footer" },
        { key: "footer_menu_2_url", value: "/about", section: "footer" },
        { key: "footer_menu_3_label", value: "Membership", section: "footer" },
        { key: "footer_menu_3_url", value: "/membership", section: "footer" },
        { key: "footer_menu_4_label", value: "Shop", section: "footer" },
        { key: "footer_menu_4_url", value: "/shop", section: "footer" },
        {
          key: "footer_address",
          value: "Lorem Ipsum St, 25/99034,",
          section: "footer",
        },
        { key: "footer_phone", value: "+990 000 0000", section: "footer" },
        { key: "footer_email", value: "info@fitness.com", section: "footer" },
        {
          key: "footer_copyright",
          value: "© 2026 Fitness. All rights reserved.",
          section: "footer",
        },
      ],
    });
    console.log("✅ Site text content seeded");
  } else {
    console.log("ℹ️  Site content already exists, skipping.");
  }

  // ─── CMS: Stats ─────────────────────────────────────────
  const statsCount = await prisma.stat.count();
  if (statsCount === 0) {
    await prisma.stat.createMany({
      data: [
        { value: "+ 1500", label: "TRAINERS", order: 0 },
        { value: "+ 1000", label: "WORKOUT VIDEOS", order: 1 },
        { value: "+ 1300", label: "POSITIVE REVIEWS", order: 2 },
        { value: "+ 80", label: "COACHES", order: 3 },
      ],
    });
    console.log("✅ Stats seeded");
  } else {
    console.log("ℹ️  Stats already exist, skipping.");
  }

  // ─── CMS: Trainers ──────────────────────────────────────
  const trainerCount = await prisma.trainer.count();
  if (trainerCount === 0) {
    await prisma.trainer.createMany({
      data: [
        {
          name: "Sam Cole",
          role: "Personal Trainer",
          image: "/trainer-preview.png",
          order: 0,
        },
        {
          name: "Sam Cole",
          role: "Personal Trainer",
          image: "/trainer-preview.png",
          order: 1,
        },
        {
          name: "Sam Cole",
          role: "Personal Trainer",
          image: "/trainer-preview.png",
          order: 2,
        },
        {
          name: "Sam Cole",
          role: "Personal Trainer",
          image: "/trainer-preview.png",
          order: 3,
        },
        // About page trainers (with description)
        {
          name: "Lorem ipsum",
          description:
            "Lorem Ipsum Dolor Sit Amet, Consectetur Adipiscing Elit.Lorem Ipsum Dolor Sit Amet",
          image: "/trainer-image.png",
          role: "Head Trainer",
          order: 4,
        },
        {
          name: "Lorem ipsum",
          description:
            "Lorem Ipsum Dolor Sit Amet, Consectetur Adipiscing Elit.Lorem Ipsum Dolor Sit Amet",
          image: "/trainer-image.png",
          role: "Fitness Coach",
          order: 5,
        },
        {
          name: "Lorem ipsum",
          description:
            "Lorem Ipsum Dolor Sit Amet, Consectetur Adipiscing Elit.Lorem Ipsum Dolor Sit Amet",
          image: "/trainer-image.png",
          role: "Nutritionist",
          order: 6,
        },
        {
          name: "Lorem ipsum",
          description:
            "Lorem Ipsum Dolor Sit Amet, Consectetur Adipiscing Elit.Lorem Ipsum Dolor Sit Amet",
          image: "/trainer-image.png",
          role: "Yoga Instructor",
          order: 7,
        },
      ],
    });
    console.log("✅ Trainers seeded");
  } else {
    console.log("ℹ️  Trainers already exist, skipping.");
  }

  // ─── CMS: Testimonials ──────────────────────────────────
  const testimonialCount = await prisma.testimonial.count();
  if (testimonialCount === 0) {
    await prisma.testimonial.createMany({
      data: [
        {
          name: "Lorem ipsum",
          role: "Lorem",
          rating: 4.5,
          content:
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
          image: "/trainer-preview.png",
          order: 0,
        },
        {
          name: "Lorem ipsum",
          role: "Lorem",
          rating: 4.5,
          content:
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
          image: "/trainer-preview.png",
          order: 1,
        },
        {
          name: "Lorem ipsum",
          role: "Lorem",
          rating: 4.5,
          content:
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
          image: "/trainer-preview.png",
          order: 2,
        },
      ],
    });
    console.log("✅ Testimonials seeded");
  } else {
    console.log("ℹ️  Testimonials already exist, skipping.");
  }

  // ─── CMS: Blog Posts ────────────────────────────────────
  const blogCount = await prisma.blogPost.count();
  if (blogCount === 0) {
    const blogImages = [
      "/training-zone-1.png",
      "/training-zone-2.png",
      "/training-zone-3.png",
      "/training-zone-4.png",
      "/equipment-1.png",
      "/equipment-2.png",
    ];
    await prisma.blogPost.createMany({
      data: blogImages.map((img) => ({
        title: "Lorem ipsum",
        excerpt:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
        image: img,
      })),
    });
    console.log("✅ Blog posts seeded");
  } else {
    console.log("ℹ️  Blog posts already exist, skipping.");
  }

  // ─── CMS: Gallery Images ────────────────────────────────
  const galleryCount = await prisma.galleryImage.count();
  if (galleryCount === 0) {
    await prisma.galleryImage.createMany({
      data: [
        {
          src: "/gallery-1.jpg",
          alt: "Group training session",
          category: "Training Sessions",
          gridCol: "1/3",
          gridRow: "1/2",
          order: 0,
        },
        {
          src: "/gallery-2.jpg",
          alt: "Workout",
          category: "Workouts",
          gridCol: "3/4",
          gridRow: "1/4",
          order: 1,
        },
        {
          src: "/gallery-3.jpg",
          alt: "Boxing event",
          category: "Events",
          gridCol: "4/5",
          gridRow: "1/2",
          order: 2,
        },
        {
          src: "/gallery-4.jpg",
          alt: "Stretching session",
          category: "Training Sessions",
          gridCol: "5/6",
          gridRow: "1/2",
          order: 3,
        },
        {
          src: "/gallery-5.jpg",
          alt: "Personal training",
          category: "Training Sessions",
          gridCol: "1/2",
          gridRow: "2/3",
          order: 4,
        },
        {
          src: "/gallery-6.jpg",
          alt: "Nutrition workshop",
          category: "Events",
          gridCol: "2/3",
          gridRow: "2/3",
          order: 5,
        },
        {
          src: "/gallery-8.jpg",
          alt: "Weight training",
          category: "Workouts",
          gridCol: "4/5",
          gridRow: "2/3",
          order: 6,
        },
        {
          src: "/gallery-7.jpg",
          alt: "Transformation",
          category: "Transformations",
          gridCol: "5/6",
          gridRow: "2/3",
          order: 7,
        },
        {
          src: "/gallery-7.jpg",
          alt: "Battle ropes workout",
          category: "Workouts",
          gridCol: "1/3",
          gridRow: "3/4",
          order: 8,
        },
        {
          src: "/gallery-10.jpg",
          alt: "Pull-up transformation",
          category: "Transformations",
          gridCol: "4/5",
          gridRow: "3/4",
          order: 9,
        },
        {
          src: "/gallery-11.jpg",
          alt: "Gym workout",
          category: "Workouts",
          gridCol: "5/6",
          gridRow: "3/4",
          order: 10,
        },
      ],
    });
    console.log("✅ Gallery seeded");
  } else {
    console.log("ℹ️  Gallery already exists, skipping.");
  }

  // ─── CMS: Achievements ──────────────────────────────────
  const achievementCount = await prisma.achievement.count();
  if (achievementCount === 0) {
    await prisma.achievement.createMany({
      data: [
        {
          image: "/achievement-1.png",
          title: "Lorem Ipsum Dolor Sit Amet, Consectetur Adipiscing Elit.",
          order: 0,
        },
        {
          image: "/achievement-2.png",
          title: "Lorem Ipsum Dolor Sit Amet, Consectetur Adipiscing Elit.",
          order: 1,
        },
        {
          image: "/achievement-3.png",
          title: "Lorem Ipsum Dolor Sit Amet, Consectetur Adipiscing Elit.",
          order: 2,
        },
      ],
    });
    console.log("✅ Achievements seeded");
  } else {
    console.log("ℹ️  Achievements already exist, skipping.");
  }

  // ─── CMS: Why Choose Us Features ────────────────────────
  const whyCount = await prisma.whyChooseUsFeature.count();
  if (whyCount === 0) {
    await prisma.whyChooseUsFeature.createMany({
      data: [
        {
          icon: "Dumbbell",
          title: "Lorem ipsum",
          description:
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
          order: 0,
        },
        {
          icon: "Users",
          title: "Lorem ipsum",
          description:
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
          order: 1,
        },
        {
          icon: "Clock",
          title: "Lorem ipsum",
          description:
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
          order: 2,
        },
        {
          icon: "Award",
          title: "Lorem ipsum",
          description:
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
          order: 3,
        },
      ],
    });
    console.log("✅ Why Choose Us features seeded");
  } else {
    console.log("ℹ️  Why Choose Us features already exist, skipping.");
  }

  // ─── CMS: Event Highlights ──────────────────────────────
  const eventHighlightCount = await prisma.eventHighlight.count();
  if (eventHighlightCount === 0) {
    await prisma.eventHighlight.createMany({
      data: [
        {
          title: "Main Event",
          description:
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
          isMain: true,
          order: 0,
        },
        {
          title: "Event 2",
          description: "Lorem ipsum dolor sit amet",
          order: 1,
        },
        {
          title: "Event 3",
          description: "Lorem ipsum dolor sit amet",
          order: 2,
        },
        {
          title: "Event 4",
          description: "Lorem ipsum dolor sit amet",
          order: 3,
        },
        {
          title: "Event 5",
          description: "Lorem ipsum dolor sit amet",
          order: 4,
        },
      ],
    });
    console.log("✅ Event highlights seeded");
  } else {
    console.log("ℹ️  Event highlights already exist, skipping.");
  }

  // ─── CMS: Training Zones ────────────────────────────────
  const zoneCount = await prisma.trainingZone.count();
  if (zoneCount === 0) {
    await prisma.trainingZone.createMany({
      data: [
        { image: "/training-zone-1.png", alt: "Cable training", order: 0 },
        { image: "/training-zone-2.png", alt: "Step aerobics", order: 1 },
        { image: "/training-zone-3.png", alt: "Cycling", order: 2 },
        { image: "/training-zone-4.png", alt: "Running track", order: 3 },
      ],
    });
    console.log("✅ Training zones seeded");
  } else {
    console.log("ℹ️  Training zones already exist, skipping.");
  }

  // ─── FAQ Items ─────────────────────────────────────────
  const faqCount = await prisma.faqItem.count();
  if (faqCount === 0) {
    await prisma.faqItem.createMany({
      data: [
        {
          question: "What are the gym opening hours?",
          answer:
            "Our gym is open Monday to Friday from 6:00 AM to 10:00 PM, Saturday from 7:00 AM to 8:00 PM, and Sunday from 8:00 AM to 6:00 PM.",
          order: 0,
        },
        {
          question: "Can I freeze my membership?",
          answer:
            "Yes, you can freeze your membership for up to 3 months per year. Simply visit reception or contact us via email to arrange this.",
          order: 1,
        },
        {
          question: "Is there a joining fee?",
          answer:
            "There is a one-time joining fee of CHF 50 for new members. This covers your access card and an initial fitness assessment with one of our trainers.",
          order: 2,
        },
        {
          question: "Can I bring a guest?",
          answer:
            "Members can bring a guest up to 2 times per month at a day-pass rate of CHF 20. Guests must be accompanied by the member at all times.",
          order: 3,
        },
        {
          question: "What facilities are included in the membership?",
          answer:
            "All memberships include access to the main gym floor, cardio area, free weights, locker rooms, and showers. Premium plans also include group classes and personal training sessions.",
          order: 4,
        },
      ],
    });
    console.log("✅ FAQ items seeded");
  } else {
    console.log("ℹ️  FAQ items already exist, skipping.");
  }

  // ─── CMS: Pricing Section Text (always upsert) ─────────
  await Promise.all([
    prisma.siteContent.upsert({
      where: { key: "pricing_section_title" },
      update: {},
      create: {
        key: "pricing_section_title",
        value: "OUR PLANS & PRICING",
        section: "pricing",
      },
    }),
    prisma.siteContent.upsert({
      where: { key: "pricing_section_subtitle" },
      update: {},
      create: {
        key: "pricing_section_subtitle",
        value: "Choose a membership that fits your goals",
        section: "pricing",
      },
    }),
  ]);
  console.log("✅ Pricing section text upserted");

  console.log("🎉 Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
