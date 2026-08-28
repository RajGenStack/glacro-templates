/* ═══════════════════════════════════════════════════════════════════════════
 * EDIT THIS FILE — it is the entire menu.
 *
 * Change the restaurant details and the sections below, redeploy, and print a
 * QR code pointing at the deployed URL. No app, no ordering platform, no
 * per-order commission.
 *
 * diet: "veg" | "egg" | "nonveg"  — drives the green/amber/red mark that Indian
 *                                   menus are required to carry.
 * tags: free text badges ("Chef's pick", "Jain available", "Serves 2").
 * spice: 0-3, printed as chillies.
 * allergens: shown on the dish so staff are not asked the same question all day.
 * ═══════════════════════════════════════════════════════════════════════════ */

window.MENU = {
  restaurant: {
    name: "Coriander House",
    kicker: "Since 2011 · Indiranagar",
    tagline: "Coastal Karnataka cooking, done slowly.",
    meta: "12:00–15:30 · 19:00–23:00 · Closed Mondays",
    footer: "Coriander House, 12th Main, Indiranagar, Bengaluru 560038 · +91 80 4000 0000",
    disclaimer: "All prices in ₹ and inclusive of taxes. Please tell your server about any allergy before ordering.",
  },

  sections: [
    {
      name: "Small plates",
      note: "Meant for sharing while the rest of the table decides.",
      items: [
        { name: "Neer dosa with coconut chutney", price: 180, diet: "veg", spice: 0,
          description: "Three paper-thin rice crêpes, fresh coconut chutney.", tags: ["Gluten-free"] },
        { name: "Kori sukka croquettes", price: 320, diet: "nonveg", spice: 2,
          description: "Dry-roasted chicken and coconut, crumbed and fried.", allergens: ["Gluten", "Egg"] },
        { name: "Bajji platter", price: 210, diet: "veg", spice: 1,
          description: "Chilli, onion and raw banana fritters, chutney pudi.", tags: ["Serves 2"] },
        { name: "Anjal tawa fry", price: 420, diet: "nonveg", spice: 2,
          description: "Kingfish in a red masala crust, seared on the tawa.", tags: ["Chef's pick"], allergens: ["Fish"] },
      ],
    },
    {
      name: "From the pot",
      items: [
        { name: "Bisi bele bath", price: 260, diet: "veg", spice: 1,
          description: "Rice, lentils and tamarind, with khara boondi.", tags: ["Jain available"] },
        { name: "Ghee roast — paneer", price: 340, diet: "veg", spice: 3,
          description: "Byadgi chilli and ghee, cooked down until it catches.", allergens: ["Dairy"] },
        { name: "Ghee roast — prawn", price: 480, diet: "nonveg", spice: 3,
          description: "The same roast, with tiger prawns.", tags: ["Chef's pick"], allergens: ["Shellfish", "Dairy"] },
        { name: "Egg curry, Mangalore style", price: 290, diet: "egg", spice: 2,
          description: "Coconut gravy, curry leaf tempering, two eggs.", allergens: ["Egg"] },
        { name: "Mutton pepper fry", price: 520, diet: "nonveg", spice: 2,
          description: "Slow-cooked shoulder, crushed black pepper, curry leaf." },
      ],
    },
    {
      name: "Rice and breads",
      items: [
        { name: "Kori rotti", price: 380, diet: "nonveg", spice: 2,
          description: "Crisp rice wafers softened in chicken curry.", allergens: ["Gluten"] },
        { name: "Donne biryani — chicken", price: 360, diet: "nonveg", spice: 2,
          description: "Seeraga samba rice, served in a leaf cup.", tags: ["Serves 1"] },
        { name: "Akki rotti", price: 150, diet: "veg", spice: 1,
          description: "Rice flour flatbread with dill and green chilli.", tags: ["Gluten-free"] },
        { name: "Malabar parotta (2)", price: 120, diet: "veg", spice: 0,
          description: "Layered, flaky, made to order.", allergens: ["Gluten"] },
      ],
    },
    {
      name: "Sweet things",
      items: [
        { name: "Mangalore buns with honey", price: 190, diet: "veg", spice: 0,
          description: "Banana-sweetened, fried soft.", allergens: ["Gluten", "Dairy"] },
        { name: "Tender coconut payasam", price: 220, diet: "veg", spice: 0,
          description: "Chilled, not too sweet.", tags: ["Chef's pick"], allergens: ["Dairy", "Nuts"] },
        { name: "Filter coffee", price: 90, diet: "veg", spice: 0,
          description: "Chicory blend, decoction pulled to order.", allergens: ["Dairy"] },
      ],
    },
  ],
};
