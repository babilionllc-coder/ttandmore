#!/usr/bin/env node
/**
 * inject_faq.js — Inject visible FAQ section + FAQPage JSON-LD into tour/service pages.
 *
 * Adds AEO-ready FAQ content to pages missing FAQPage schema. Writes:
 *  - <script type="application/ld+json"> { @type: FAQPage ... } in <head>
 *  - <section class="faq-section">...</section> before </main>
 *
 * Idempotent: if FAQPage schema already exists on a page, it is skipped.
 * Pair EN/ES identically so hreflang clusters are consistent.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// -------------------------------------------------------------------------
// FAQ content — 5 Q&A per page, tour-specific, answer-first prose
// -------------------------------------------------------------------------
const FAQS = {
  'chichen-itza-tour': {
    en: [
      ['How long is the Chichén Itzá tour from Cancun?',
       'The Chichén Itzá Express tour from Cancun takes about 10–12 hours round-trip. Pickup is typically between 7:00 and 8:00 AM from your Cancun or Riviera Maya hotel, with return drop-off by 7:00 PM. You spend roughly 2 hours exploring the archaeological site with a certified guide, plus a traditional Yucatecan buffet lunch.'],
      ['What is included in the Chichén Itzá tour?',
       'Included: private round-trip transportation in an air-conditioned vehicle, certified bilingual guide, entrance fees to Chichén Itzá, a traditional Yucatecan buffet lunch, and bottled water. Not included: tips for the guide and driver (optional, around 10%) and personal expenses such as souvenirs.'],
      ['Is the Chichén Itzá tour private or shared?',
       'This is a 100% private tour — only your group rides in the vehicle and follows the itinerary with your own guide. There are no other tourists on your tour, which means you set the pace, take longer at the ruins if you want, and avoid large group waiting times at each stop.'],
      ['What should I bring on the Chichén Itzá tour?',
       'Wear light clothing, comfortable walking shoes, a hat, and sunglasses. Bring biodegradable sunscreen, insect repellent, a reusable water bottle, cash for tips and souvenirs, and your camera. If visiting during the rainy season (June–October) a light rain jacket is useful.'],
      ['Can I book the Chichén Itzá tour from Tulum or Playa del Carmen?',
       'Yes. Pickup is available from hotels throughout the Riviera Maya including Cancun Hotel Zone, Puerto Morelos, Playa del Carmen, Akumal, and Tulum. Pickup times adjust based on your hotel location — typically 30–60 minutes earlier from Playa del Carmen and up to 90 minutes earlier from Tulum.'],
    ],
    es: [
      ['¿Cuánto dura el tour a Chichén Itzá desde Cancún?',
       'El Tour Express a Chichén Itzá desde Cancún dura aproximadamente 10 a 12 horas en total. El pickup es entre 7:00 y 8:00 AM desde tu hotel en Cancún o Riviera Maya, con regreso antes de las 7:00 PM. Pasas cerca de 2 horas recorriendo la zona arqueológica con guía certificado, más el buffet yucateco.'],
      ['¿Qué incluye el tour a Chichén Itzá?',
       'Incluye: transporte privado redondo en vehículo con aire acondicionado, guía certificado bilingüe, entradas a Chichén Itzá, buffet tradicional yucateco y agua embotellada. No incluye: propinas para guía y chofer (opcionales, alrededor del 10%) y gastos personales como souvenirs.'],
      ['¿El tour a Chichén Itzá es privado o compartido?',
       'Es un tour 100% privado — solo tu grupo viaja en el vehículo y sigue el itinerario con su propio guía. No hay otros turistas en tu tour, lo que significa que marcas el ritmo, puedes tomarte más tiempo en las ruinas y evitas esperas típicas de grupos grandes.'],
      ['¿Qué debo llevar al tour de Chichén Itzá?',
       'Ropa ligera, zapatos cómodos para caminar, sombrero y lentes de sol. Lleva protector solar biodegradable, repelente de insectos, una botella reutilizable, efectivo para propinas y souvenirs, y cámara. Si viajas en temporada de lluvias (junio a octubre) una chamarra ligera impermeable es útil.'],
      ['¿Puedo tomar el tour a Chichén Itzá desde Tulum o Playa del Carmen?',
       'Sí. Recogemos en hoteles de toda la Riviera Maya: Zona Hotelera de Cancún, Puerto Morelos, Playa del Carmen, Akumal y Tulum. Los horarios se ajustan a la ubicación del hotel — aproximadamente 30 a 60 minutos antes desde Playa del Carmen y hasta 90 minutos antes desde Tulum.'],
    ],
  },

  'chichen-itza-cenote-ik-kil': {
    en: [
      ['What is Cenote Ik-Kil and why visit it after Chichén Itzá?',
       'Cenote Ik-Kil is a stunning open cenote about 5 minutes from Chichén Itzá, famous for its 26-meter vertical drop with hanging tree roots and crystal-clear water. After the heat of the ruins, a 30–45 minute swim is the perfect refresher. It appears on National Geographic and is one of the most photographed cenotes in Yucatán.'],
      ['How long is the Chichén Itzá and Cenote Ik-Kil tour?',
       'The full tour runs 11–13 hours door-to-door. Pickup is early morning (around 7:00 AM), you spend ~2 hours at Chichén Itzá, drive 5 minutes to Cenote Ik-Kil for a 45-minute swim, and then have a traditional buffet lunch. You return to your hotel by around 8:00 PM.'],
      ['Do I need to know how to swim to enter Cenote Ik-Kil?',
       'No — life vests are provided and mandatory. The cenote is deep (~40 meters) but the life vest keeps non-swimmers safe. Bring or rent a snorkel mask if you want to see the fish below. Biodegradable sunscreen and shower before entering are required by cenote rules.'],
      ['What is included in the Chichén Itzá + Ik-Kil tour?',
       'Private round-trip transport from your hotel, certified bilingual guide, Chichén Itzá entrance fees, Cenote Ik-Kil entrance fees, life vest rental at the cenote, traditional Yucatecan buffet, and bottled water. Tips and personal souvenirs are extra.'],
      ['What should I pack for the cenote swim?',
       'Swimsuit (wear it under your clothes for easy changing), biodegradable sunscreen (required — chemical sunscreen is banned), a towel, change of clothes, and waterproof sandals. Lockers are available at Ik-Kil for a small fee. Waterproof camera or phone pouch recommended.'],
    ],
    es: [
      ['¿Qué es el Cenote Ik-Kil y por qué visitarlo después de Chichén Itzá?',
       'El Cenote Ik-Kil es un impresionante cenote abierto a 5 minutos de Chichén Itzá, famoso por su caída vertical de 26 metros con raíces colgantes y agua cristalina. Después del calor en las ruinas, un baño de 30 a 45 minutos es el refresco perfecto. Aparece en National Geographic y es de los cenotes más fotografiados de Yucatán.'],
      ['¿Cuánto dura el tour Chichén Itzá y Cenote Ik-Kil?',
       'El tour completo dura de 11 a 13 horas puerta a puerta. El pickup es temprano por la mañana (alrededor de 7:00 AM), pasas unas 2 horas en Chichén Itzá, 5 minutos en auto al Cenote Ik-Kil para un baño de 45 minutos, y luego buffet tradicional. Regresas al hotel alrededor de las 8:00 PM.'],
      ['¿Necesito saber nadar para entrar al Cenote Ik-Kil?',
       'No — se proporcionan chalecos salvavidas y son obligatorios. El cenote es profundo (~40 metros) pero el chaleco mantiene seguros a quienes no nadan. Lleva o renta visor de snorkel si quieres ver los peces. Se requiere protector solar biodegradable y ducharse antes de entrar.'],
      ['¿Qué incluye el tour Chichén Itzá + Ik-Kil?',
       'Transporte privado redondo desde tu hotel, guía certificado bilingüe, entradas a Chichén Itzá, entradas al Cenote Ik-Kil, renta de chaleco salvavidas, buffet yucateco tradicional y agua embotellada. Propinas y souvenirs personales no están incluidos.'],
      ['¿Qué debo llevar para el baño en el cenote?',
       'Traje de baño (úsalo debajo de la ropa para cambiar fácil), protector solar biodegradable (obligatorio — los químicos están prohibidos), toalla, cambio de ropa y sandalias resistentes al agua. Hay lockers en Ik-Kil por una pequeña cuota. Recomendamos funda acuática para cámara o celular.'],
    ],
  },

  'chichen-itza-cenote-selva-maya': {
    en: [
      ['What makes Cenote Selva Maya different from other cenotes?',
       'Cenote Selva Maya is a semi-open cave cenote, less crowded than Ik-Kil, with dramatic rock formations and exceptional water clarity. It sits inside a private ecological park about 10 minutes from Chichén Itzá, making it a quieter, more exclusive swim experience with fewer tour buses.'],
      ['How long is the Chichén Itzá + Cenote Selva Maya tour?',
       'Total duration is 11–12 hours. Pickup starts at 7:00 AM, 2 hours exploring Chichén Itzá with your guide, a 45-minute cenote swim at Selva Maya, and a traditional Yucatecan buffet. Expect to be back at your hotel by 7:00 PM.'],
      ['Is the Chichén Itzá + Selva Maya tour family-friendly?',
       'Yes. The cenote has easy stair access (not a jump-only cenote), life vests are provided, and the buffet has kid-friendly options. Children under 6 usually enter free and the private vehicle means no wait times between stops.'],
      ['What is included and what costs extra?',
       'Included: private transport from your hotel, bilingual certified guide, entrance fees to Chichén Itzá and Cenote Selva Maya, life vest, Yucatecan buffet, and bottled water. Extra: guide/driver tips (optional, ~10%), souvenirs, and any additional drinks at lunch.'],
      ['Can I combine this tour with a hotel in Playa del Carmen or Tulum?',
       'Yes — we pick up from hotels across Cancun Hotel Zone, Puerto Morelos, Playa del Carmen, Akumal, and Tulum. Pickup shifts 30–90 minutes earlier depending on your starting location. Total tour time from Tulum is closer to 13 hours due to the extra drive.'],
    ],
    es: [
      ['¿Qué hace diferente al Cenote Selva Maya de otros cenotes?',
       'El Cenote Selva Maya es un cenote semi-abierto tipo caverna, menos concurrido que Ik-Kil, con formaciones rocosas dramáticas y excelente claridad del agua. Está dentro de un parque ecológico privado a 10 minutos de Chichén Itzá, lo que lo hace una experiencia más tranquila y exclusiva con menos autobuses turísticos.'],
      ['¿Cuánto dura el tour Chichén Itzá + Cenote Selva Maya?',
       'La duración total es de 11 a 12 horas. El pickup comienza a las 7:00 AM, 2 horas explorando Chichén Itzá con tu guía, 45 minutos de baño en el Cenote Selva Maya y buffet yucateco tradicional. Regresas a tu hotel alrededor de las 7:00 PM.'],
      ['¿El tour Chichén Itzá + Selva Maya es familiar?',
       'Sí. El cenote tiene acceso por escaleras (no es un cenote solo de salto), se proporcionan chalecos salvavidas y el buffet tiene opciones para niños. Menores de 6 años normalmente entran gratis y el vehículo privado significa cero tiempo de espera entre paradas.'],
      ['¿Qué incluye y qué cuesta extra?',
       'Incluye: transporte privado desde tu hotel, guía certificado bilingüe, entradas a Chichén Itzá y Cenote Selva Maya, chaleco salvavidas, buffet yucateco y agua embotellada. Extra: propinas (opcionales, ~10%), souvenirs y bebidas adicionales en la comida.'],
      ['¿Puedo combinar este tour con hotel en Playa del Carmen o Tulum?',
       'Sí — recogemos en hoteles de Zona Hotelera de Cancún, Puerto Morelos, Playa del Carmen, Akumal y Tulum. El pickup se adelanta entre 30 y 90 minutos según tu ubicación. Desde Tulum el tour total se acerca a 13 horas por la distancia adicional.'],
    ],
  },

  'chichen-itza-ek-balam': {
    en: [
      ['What is Ek Balam and why visit it with Chichén Itzá?',
       'Ek Balam is a Mayan archaeological site 2 hours east of Chichén Itzá, smaller and far less crowded — you can still climb the main pyramid (the Acropolis) and get 360° views. Combining the two gives you both the iconic Wonder of the World and an authentic, off-the-beaten-path Mayan experience in one day.'],
      ['How long is the Chichén Itzá + Ek Balam tour?',
       'This is a longer tour, typically 12–14 hours, because the two sites are 2 hours apart. Early pickup (around 6:30 AM), ~1.5 hours at Chichén Itzá, drive to Ek Balam, ~1.5 hours exploring and climbing, buffet lunch, and return. Plan for a late evening arrival at your hotel.'],
      ['Can I still climb a pyramid in Yucatán?',
       'Yes — the main pyramid at Ek Balam (El Torre/Acropolis, 32 meters high) is still open for climbing. Chichén Itzá’s El Castillo has been closed to climbing since 2006, so Ek Balam is the closest way to experience a true climbable Mayan pyramid on a combined tour.'],
      ['Is the Chichén Itzá + Ek Balam tour suitable for seniors?',
       'Chichén Itzá is fully accessible on flat ground with minimal walking. Ek Balam requires a moderate climb of about 105 steep steps if you want to reach the top — that part is optional. Seniors who prefer to skip the climb can still enjoy the base of the pyramid and the surrounding structures.'],
      ['What should I bring for this long tour?',
       'Comfortable closed-toe walking shoes (especially for the Ek Balam climb), sun hat, biodegradable sunscreen, refillable water bottle, light jacket for the early morning, and cash for tips/souvenirs. Breakfast is not included — consider a light breakfast at your hotel before pickup.'],
    ],
    es: [
      ['¿Qué es Ek Balam y por qué visitarlo con Chichén Itzá?',
       'Ek Balam es un sitio arqueológico maya a 2 horas al este de Chichén Itzá, más pequeño y mucho menos concurrido — aún puedes subir a la pirámide principal (la Acrópolis) y obtener vistas de 360°. Combinar ambos te da la Maravilla del Mundo icónica y una experiencia maya auténtica fuera de la ruta turística en un solo día.'],
      ['¿Cuánto dura el tour Chichén Itzá + Ek Balam?',
       'Este es un tour más largo, típicamente de 12 a 14 horas, porque los dos sitios están a 2 horas de distancia. Pickup temprano (alrededor de 6:30 AM), ~1.5 horas en Chichén Itzá, traslado a Ek Balam, ~1.5 horas explorando y subiendo, buffet y regreso. Planea llegada nocturna al hotel.'],
      ['¿Todavía se puede subir a una pirámide en Yucatán?',
       'Sí — la pirámide principal de Ek Balam (El Torre/Acrópolis, 32 metros) sigue abierta para subir. El Castillo de Chichén Itzá está cerrado al público para subir desde 2006, así que Ek Balam es la forma más cercana de vivir una auténtica pirámide maya escalable en un tour combinado.'],
      ['¿El tour Chichén Itzá + Ek Balam es apto para adultos mayores?',
       'Chichén Itzá es totalmente accesible en terreno plano con caminata mínima. Ek Balam requiere una subida moderada de unos 105 escalones pronunciados si quieres llegar arriba — esa parte es opcional. Los adultos mayores que prefieran no subir igual disfrutan de la base de la pirámide y las estructuras alrededor.'],
      ['¿Qué debo llevar para este tour largo?',
       'Zapatos cerrados cómodos para caminar (importante para la subida en Ek Balam), sombrero, protector solar biodegradable, botella reutilizable, chamarra ligera para la madrugada y efectivo para propinas y souvenirs. El desayuno no está incluido — considera un desayuno ligero en tu hotel antes del pickup.'],
    ],
  },

  'coba': {
    en: [
      ['Where is Cobá and how far is it from Cancun?',
       'Cobá is a Mayan archaeological site in the jungle of Quintana Roo, about 170 km (105 mi) southwest of Cancun — roughly a 2-hour drive. It sits 45 minutes inland from Tulum and is surrounded by ancient sacbé (white road) networks that once connected Mayan cities across the peninsula.'],
      ['How long is the Cobá Express tour?',
       'The Cobá Express tour from Cancun runs 8–10 hours. Pickup is around 7:00 AM, 2 hours of driving, ~2 hours exploring the site (bicycle rentals or local "triciclos" are available on-site for the longer paths), and return. It’s shorter and less tiring than Chichén Itzá tours.'],
      ['Can you still climb Nohoch Mul pyramid at Cobá?',
       'Nohoch Mul, once the main draw at Cobá, has been closed to climbing since 2020. You can still see it up close and appreciate its 42-meter height. For a climbable pyramid in Yucatán, consider the Ek Balam tour instead — the Acropolis there is still open to the public.'],
      ['What is included in the Cobá tour?',
       'Included: private round-trip transport from your hotel, certified bilingual guide, Cobá archaeological site entrance, and bottled water. Bicycle/triciclo rental inside the site and meals are not included — we recommend grabbing lunch in Tulum on the way back.'],
      ['Is Cobá worth visiting if I already did Chichén Itzá?',
       'Yes — Cobá is a completely different experience. It’s jungle-set, less restored, and you can walk/cycle on the ancient sacbé paths the Mayans used. It’s also less crowded, so photos and atmosphere are better. Many travelers who do both prefer Cobá as the quieter, more atmospheric of the two.'],
    ],
    es: [
      ['¿Dónde está Cobá y a qué distancia queda de Cancún?',
       'Cobá es un sitio arqueológico maya en la selva de Quintana Roo, aproximadamente 170 km al suroeste de Cancún — unas 2 horas en auto. Está a 45 minutos tierra adentro desde Tulum y está rodeado de antiguos sacbés (caminos blancos) que conectaban ciudades mayas en toda la península.'],
      ['¿Cuánto dura el tour Cobá Express?',
       'El tour Cobá Express desde Cancún dura de 8 a 10 horas. Pickup alrededor de 7:00 AM, 2 horas de manejo, ~2 horas explorando el sitio (hay renta de bicis y triciclos para los caminos largos) y regreso. Es más corto y menos agotador que los tours a Chichén Itzá.'],
      ['¿Todavía se puede subir a la pirámide Nohoch Mul en Cobá?',
       'Nohoch Mul, que era el principal atractivo de Cobá, está cerrada al público para subir desde 2020. Aún se puede ver de cerca y apreciar sus 42 metros de altura. Para una pirámide escalable en Yucatán, considera el tour a Ek Balam — la Acrópolis sigue abierta al público.'],
      ['¿Qué incluye el tour a Cobá?',
       'Incluye: transporte privado redondo desde tu hotel, guía certificado bilingüe, entrada al sitio arqueológico de Cobá y agua embotellada. La renta de bicicleta/triciclo dentro del sitio y las comidas no están incluidas — recomendamos almorzar en Tulum de regreso.'],
      ['¿Vale la pena Cobá si ya fui a Chichén Itzá?',
       'Sí — Cobá es una experiencia completamente diferente. Está en la selva, menos restaurado, y puedes caminar o pedalear por los antiguos sacbés que usaban los mayas. También es menos concurrido, así que las fotos y el ambiente son mejores. Muchos viajeros prefieren Cobá como el más tranquilo y atmosférico de los dos.'],
    ],
  },

  'ek-balam-cenote-xcanche': {
    en: [
      ['What is Cenote Xcanché and why visit it with Ek Balam?',
       'Cenote Xcanché is an open-sky cenote 2 km from the Ek Balam ruins, reachable by a short bike ride through the jungle. It’s about 15 meters deep with a zipline and rope swing for adventure seekers. Pairing it with Ek Balam turns a 2-hour archaeological visit into a full jungle-and-swim day.'],
      ['How long is the Ek Balam and Cenote Xcanché tour?',
       'The tour is 9–11 hours. Pickup is around 7:30 AM, 2 hours driving, ~1.5 hours at Ek Balam (with optional pyramid climb), 1 hour at Cenote Xcanché, lunch at a local restaurant, and return. You’re back at your hotel around 6:00 PM.'],
      ['Can you climb the pyramid at Ek Balam?',
       'Yes. The Acropolis (also called El Torre) at Ek Balam is 32 meters high and still open to climbing — one of the few Mayan pyramids in Yucatán you can still ascend. The stairs are steep, so bring closed-toe shoes and take it slow on the way down.'],
      ['What is included in the Ek Balam + Xcanché tour?',
       'Private round-trip transport, certified bilingual guide, entrance fees to Ek Balam and Cenote Xcanché, life vest for the cenote, and bottled water. Bicycle rental from Ek Balam to the cenote (optional, small fee) and lunch are not included.'],
      ['Is the Ek Balam + Xcanché tour good for adventure travelers?',
       'Yes — this tour is the active option. You can climb a real Mayan pyramid, ride a bicycle through jungle, zipline or rope-swing into a cenote, and finish with local food. It’s a great alternative to the more classic Chichén Itzá day for people who want to move.'],
    ],
    es: [
      ['¿Qué es el Cenote Xcanché y por qué visitarlo con Ek Balam?',
       'El Cenote Xcanché es un cenote a cielo abierto a 2 km de las ruinas de Ek Balam, al que se llega con un breve paseo en bicicleta por la selva. Tiene unos 15 metros de profundidad con tirolesa y columpio de cuerda para los aventureros. Combinarlo con Ek Balam convierte una visita arqueológica de 2 horas en un día completo de selva y baño.'],
      ['¿Cuánto dura el tour Ek Balam y Cenote Xcanché?',
       'El tour dura de 9 a 11 horas. Pickup alrededor de 7:30 AM, 2 horas de manejo, ~1.5 horas en Ek Balam (con subida opcional a la pirámide), 1 hora en el Cenote Xcanché, comida en un restaurante local y regreso. Regresas a tu hotel alrededor de las 6:00 PM.'],
      ['¿Se puede subir a la pirámide de Ek Balam?',
       'Sí. La Acrópolis (también llamada El Torre) de Ek Balam mide 32 metros y sigue abierta al público para subir — una de las pocas pirámides mayas en Yucatán que aún se pueden escalar. Los escalones son pronunciados, así que lleva zapatos cerrados y baja con cuidado.'],
      ['¿Qué incluye el tour Ek Balam + Xcanché?',
       'Transporte privado redondo, guía certificado bilingüe, entradas a Ek Balam y al Cenote Xcanché, chaleco salvavidas para el cenote y agua embotellada. La renta de bicicleta desde Ek Balam al cenote (opcional, cuota baja) y la comida no están incluidas.'],
      ['¿El tour Ek Balam + Xcanché es bueno para viajeros aventureros?',
       'Sí — este es el tour activo. Subes a una verdadera pirámide maya, pedaleas por la selva, te lanzas en tirolesa o columpio al cenote y terminas con comida local. Es una gran alternativa al clásico Chichén Itzá para quienes quieren moverse.'],
    ],
  },

  'tulum': {
    en: [
      ['How far is Tulum from Cancun and how long is the tour?',
       'Tulum is 130 km south of Cancun Airport — about a 90-minute drive via Federal Highway 307. The Tulum Express tour runs 8–9 hours total, including pickup, 1.5 hours exploring the ruins, time at the beach below the site, and return.'],
      ['Why are the Tulum ruins famous?',
       'Tulum is the only major Mayan archaeological site built on a cliff overlooking the Caribbean. It served as a port city and trading hub for the Maya from the 13th–15th centuries. The iconic postcard view — pyramid + turquoise sea — is why Tulum ruins are one of the most photographed sites in Mexico.'],
      ['Can I swim at the Tulum ruins?',
       'Yes — there is a small public beach directly below the ruins (Playa Ruinas), accessible by a wooden staircase. It’s a great spot for a quick dip after visiting the site. Bring swimwear under your clothes, reef-safe sunscreen, and a towel.'],
      ['What is included in the Tulum Express tour?',
       'Private round-trip transportation from your hotel, certified bilingual guide, entrance fees to the Tulum archaeological site, and bottled water. Lunch, beach chair rentals, and optional activities like snorkel rentals are not included.'],
      ['What is the best time to visit Tulum ruins?',
       'Early morning (8:00–10:00 AM) is best for fewer crowds, cooler temperatures, and better light for photos. Mid-day can be very hot (30–35°C / 86–95°F) and the site offers little shade. We recommend an early pickup to arrive right when the site opens.'],
    ],
    es: [
      ['¿A qué distancia está Tulum de Cancún y cuánto dura el tour?',
       'Tulum está a 130 km al sur del Aeropuerto de Cancún — aproximadamente 90 minutos en auto por la Carretera Federal 307. El tour Tulum Express dura de 8 a 9 horas en total, incluyendo pickup, 1.5 horas explorando las ruinas, tiempo en la playa bajo el sitio y regreso.'],
      ['¿Por qué son famosas las ruinas de Tulum?',
       'Tulum es el único sitio arqueológico maya importante construido en un acantilado frente al Caribe. Sirvió como ciudad portuaria y centro de comercio maya entre los siglos XIII y XV. La icónica postal — pirámide más mar turquesa — es por lo que las ruinas de Tulum son de los sitios más fotografiados de México.'],
      ['¿Puedo nadar en las ruinas de Tulum?',
       'Sí — hay una pequeña playa pública directamente debajo de las ruinas (Playa Ruinas), accesible por una escalera de madera. Es un buen lugar para un chapuzón rápido después de visitar el sitio. Lleva traje de baño debajo de la ropa, protector solar reef-safe y toalla.'],
      ['¿Qué incluye el tour Tulum Express?',
       'Transporte privado redondo desde tu hotel, guía certificado bilingüe, entradas al sitio arqueológico de Tulum y agua embotellada. La comida, renta de camastros y actividades opcionales como snorkel no están incluidas.'],
      ['¿Cuál es la mejor hora para visitar las ruinas de Tulum?',
       'Temprano por la mañana (8:00 a 10:00 AM) es mejor por menos gente, temperaturas más frescas y mejor luz para fotos. Al mediodía puede hacer mucho calor (30–35°C) y el sitio tiene poca sombra. Recomendamos pickup temprano para llegar justo cuando abre el sitio.'],
    ],
  },

  'tulum-akumal-snorkel': {
    en: [
      ['Why is Akumal known for swimming with turtles?',
       'Akumal Bay is a protected cove where green sea turtles come daily to feed on seagrass. Snorkelers can see turtles in less than 2 meters of water, often within 5 minutes of entering. It’s one of the most reliable spots in the world to snorkel with wild turtles, especially from May to October.'],
      ['How long is the Tulum + Akumal Snorkel tour?',
       'The tour runs 9–10 hours. Pickup around 8:00 AM, 1.5 hours at Tulum ruins, drive 30 minutes to Akumal, 1.5 hours snorkeling with certified guide, lunch break, and return. You’ll be back at your hotel by around 6:00 PM.'],
      ['Do I need to bring my own snorkel gear?',
       'No — mask, snorkel, fins, and life vest are provided as part of the snorkel portion. Bring reef-safe biodegradable sunscreen (required to protect the turtles and reef), swimwear, towel, and an underwater camera or waterproof phone pouch.'],
      ['Is the Akumal snorkel turtle tour safe for kids?',
       'Yes — life vests are mandatory for everyone, and a certified guide stays with your group the entire time. The water is calm and shallow (1–3 meters). Children as young as 6 can participate comfortably. Non-swimmers are safe with the life vest.'],
      ['What is included in the Tulum + Akumal tour?',
       'Private round-trip transport, certified bilingual guide, entrance to Tulum ruins, Akumal marine park fee, snorkel gear, life vest, certified snorkel guide at Akumal, and bottled water. Lunch and tips are not included.'],
    ],
    es: [
      ['¿Por qué Akumal es famosa por nadar con tortugas?',
       'La Bahía de Akumal es una cala protegida donde las tortugas verdes llegan diariamente a alimentarse de pastos marinos. Los snorkelistas pueden ver tortugas en menos de 2 metros de profundidad, a menudo en los primeros 5 minutos. Es de los lugares más confiables del mundo para hacer snorkel con tortugas silvestres, especialmente de mayo a octubre.'],
      ['¿Cuánto dura el tour Tulum + Akumal Snorkel?',
       'El tour dura de 9 a 10 horas. Pickup alrededor de 8:00 AM, 1.5 horas en las ruinas de Tulum, 30 minutos en auto a Akumal, 1.5 horas de snorkel con guía certificado, pausa para comer y regreso. Regresas a tu hotel alrededor de las 6:00 PM.'],
      ['¿Debo llevar mi propio equipo de snorkel?',
       'No — se incluyen visor, snorkel, aletas y chaleco salvavidas como parte del snorkel. Lleva protector solar biodegradable reef-safe (obligatorio para proteger tortugas y arrecife), traje de baño, toalla y cámara sumergible o funda acuática para tu celular.'],
      ['¿El tour de snorkel con tortugas en Akumal es seguro para niños?',
       'Sí — el chaleco salvavidas es obligatorio para todos y un guía certificado acompaña a tu grupo todo el tiempo. El agua es tranquila y poco profunda (1 a 3 metros). Niños desde los 6 años pueden participar cómodamente. Quienes no nadan están seguros con el chaleco.'],
      ['¿Qué incluye el tour Tulum + Akumal?',
       'Transporte privado redondo, guía certificado bilingüe, entrada a ruinas de Tulum, entrada al parque marino de Akumal, equipo de snorkel, chaleco salvavidas, guía certificado de snorkel en Akumal y agua embotellada. La comida y propinas no están incluidas.'],
    ],
  },

  'tulum-coba': {
    en: [
      ['What do you see on the Tulum + Cobá combined tour?',
       'You visit two contrasting Mayan sites in one day: Tulum, a dramatic cliffside port city overlooking the Caribbean, and Cobá, a jungle-hidden site connected by ancient sacbé roads. It’s the ideal combo for history lovers who want both iconic ocean views and authentic jungle ruins.'],
      ['How long is the Tulum + Cobá tour from Cancun?',
       'Total tour time is 10–12 hours. Pickup around 7:30 AM, 1.5 hours at Cobá, 1.5-hour drive, 1 hour at Tulum ruins, and return. It’s a longer day because the sites are 45 minutes apart — bring snacks and water.'],
      ['Which should I visit first — Cobá or Tulum?',
       'We recommend Cobá first, in the cooler morning hours, because it requires more walking/biking on unshaded jungle paths. Tulum is visited in the afternoon when the cliffside sea breeze makes the heat more bearable. We can adjust the order for you on request.'],
      ['Is this tour suitable if I have limited time in Riviera Maya?',
       'Yes — the Tulum + Cobá combo is ideal if you only have one day for archaeology and want to see both a cliff-top and a jungle-style Mayan city. However, if you prefer a less rushed day, split them into two separate tours.'],
      ['What is included in the Tulum + Cobá tour?',
       'Private round-trip transport, certified bilingual guide, entrance fees to both Tulum and Cobá, and bottled water. Bicycle/triciclo rental at Cobá and lunch are not included. Most guests grab lunch in Tulum town on the way back.'],
    ],
    es: [
      ['¿Qué se visita en el tour combinado Tulum + Cobá?',
       'Visitas dos sitios mayas contrastantes en un día: Tulum, una dramática ciudad portuaria en acantilado frente al Caribe, y Cobá, un sitio escondido en la selva conectado por antiguos sacbés. Es la combinación ideal para amantes de la historia que quieren vistas oceánicas icónicas y ruinas auténticas en la selva.'],
      ['¿Cuánto dura el tour Tulum + Cobá desde Cancún?',
       'El tour total dura de 10 a 12 horas. Pickup alrededor de 7:30 AM, 1.5 horas en Cobá, 1.5 horas de manejo, 1 hora en las ruinas de Tulum y regreso. Es un día largo porque los sitios están a 45 minutos de distancia — lleva bocadillos y agua.'],
      ['¿Cuál debo visitar primero, Cobá o Tulum?',
       'Recomendamos Cobá primero, en las horas frescas de la mañana, porque requiere más caminata o bici en senderos de selva sin sombra. Tulum se visita por la tarde cuando la brisa del mar en el acantilado hace el calor más llevadero. Podemos ajustar el orden si lo pides.'],
      ['¿Este tour es adecuado si tengo tiempo limitado en la Riviera Maya?',
       'Sí — el combo Tulum + Cobá es ideal si solo tienes un día para arqueología y quieres ver tanto una ciudad maya en acantilado como una estilo jungla. Sin embargo, si prefieres un día menos apurado, divídelos en dos tours separados.'],
      ['¿Qué incluye el tour Tulum + Cobá?',
       'Transporte privado redondo, guía certificado bilingüe, entradas a Tulum y Cobá, y agua embotellada. La renta de bicicleta/triciclo en Cobá y la comida no están incluidas. La mayoría de los huéspedes come en el pueblo de Tulum de regreso.'],
    ],
  },

  'tulum-gran-cenote-tulum': {
    en: [
      ['What is the Gran Cenote and why visit it after Tulum ruins?',
       'The Gran Cenote is a partially open cenote 5 minutes from downtown Tulum, famous for crystal-clear water, freshwater turtles, and dramatic stalactites. After the heat of the Tulum ruins, a 45-minute swim here is refreshing and one of the best photo opportunities in the Riviera Maya.'],
      ['How long is the Tulum + Gran Cenote tour?',
       'The tour runs 8–9 hours total. Pickup around 8:00 AM, 1.5 hours at Tulum ruins, 5-minute drive to Gran Cenote, 45 minutes swimming/snorkeling, lunch break in Tulum town, and return. You’re back at your hotel by around 6:00 PM.'],
      ['What animals can I see at Gran Cenote?',
       'Freshwater turtles (they swim right next to you), small fish, and occasionally bats in the cave sections at sunrise/sunset. The water is fresh (not saltwater) and about 3 meters deep on average. Snorkeling gear is provided and highly recommended for the underwater view.'],
      ['What should I pack for the Gran Cenote swim?',
       'Swimsuit, reef-safe biodegradable sunscreen (chemical sunscreen is banned to protect the cenote), towel, change of clothes, flip-flops or water shoes, and a waterproof camera pouch. Lockers are available at the cenote entrance for a small fee.'],
      ['What is included in the Tulum + Gran Cenote tour?',
       'Private round-trip transport, certified bilingual guide, entrance to Tulum archaeological site, entrance to Gran Cenote, snorkel gear (mask + fins), life vest, and bottled water. Lunch is not included but there are many options in Tulum town on the way back.'],
    ],
    es: [
      ['¿Qué es el Gran Cenote y por qué visitarlo después de las ruinas de Tulum?',
       'El Gran Cenote es un cenote parcialmente abierto a 5 minutos del centro de Tulum, famoso por su agua cristalina, tortugas de agua dulce y estalactitas dramáticas. Después del calor de las ruinas de Tulum, un baño de 45 minutos aquí es refrescante y una de las mejores oportunidades fotográficas de la Riviera Maya.'],
      ['¿Cuánto dura el tour Tulum + Gran Cenote?',
       'El tour dura de 8 a 9 horas en total. Pickup alrededor de 8:00 AM, 1.5 horas en las ruinas de Tulum, 5 minutos al Gran Cenote, 45 minutos nadando o haciendo snorkel, pausa para comer en el pueblo de Tulum y regreso. Regresas a tu hotel alrededor de las 6:00 PM.'],
      ['¿Qué animales se pueden ver en el Gran Cenote?',
       'Tortugas de agua dulce (nadan justo a tu lado), peces pequeños y ocasionalmente murciélagos en las secciones de cueva al amanecer o atardecer. El agua es dulce (no salada) y de unos 3 metros de profundidad en promedio. Se incluye equipo de snorkel — altamente recomendado para la vista bajo el agua.'],
      ['¿Qué debo llevar para el baño en el Gran Cenote?',
       'Traje de baño, protector solar biodegradable reef-safe (el químico está prohibido para proteger el cenote), toalla, cambio de ropa, sandalias o zapatos de agua y funda acuática para cámara. Hay lockers en la entrada del cenote por una cuota pequeña.'],
      ['¿Qué incluye el tour Tulum + Gran Cenote?',
       'Transporte privado redondo, guía certificado bilingüe, entrada al sitio arqueológico de Tulum, entrada al Gran Cenote, equipo de snorkel (visor + aletas), chaleco salvavidas y agua embotellada. La comida no está incluida pero hay muchas opciones en el pueblo de Tulum de regreso.'],
    ],
  },

  'book': {
    en: [
      ['How much does a Cancun airport shuttle cost?',
       'Private airport transfer prices from Cancun Airport depend on destination and vehicle size. Transfers to the Cancun Hotel Zone start around $45 USD, Playa del Carmen from $80 USD, and Tulum from $120 USD for a private vehicle (up to 8 passengers). All prices are flat fees — no surge pricing or meters.'],
      ['How long does it take to get from Cancun Airport to my hotel?',
       'Drive times from Cancun Airport: Hotel Zone 20–30 minutes, Puerto Morelos 25 minutes, Playa del Carmen 50 minutes, Akumal 75 minutes, and Tulum 90 minutes. Times are without traffic — add 15–20 minutes during peak hours (Dec–April, around 2–6 PM).'],
      ['Do I need to reserve airport transportation in advance?',
       'Yes, we recommend booking at least 24 hours in advance to guarantee vehicle availability, especially during high season (Dec–April and July–August). Walk-up transfers at the airport can cost 3–4x the pre-booked rate and wait times are unpredictable.'],
      ['Where do I meet my driver at Cancun Airport?',
       'After you exit customs, walk past the vendor hallway and go outside to the designated pickup zone. Your driver holds a sign with your name. Arrival meet-and-greet is included at no extra charge. We monitor your flight so if it’s delayed, your driver waits at no charge for up to 90 minutes.'],
      ['Can you accommodate child seats and large groups?',
       'Yes. Child seats are available on request when booking — please specify ages in the booking form (see Additional Options for pricing). For groups up to 16 passengers we use a Toyota HiAce or Nissan Urvan van; for larger groups we coordinate multiple vans with simultaneous departures. Let us know your group size and we\'ll recommend the right setup.'],
    ],
    es: [
      ['¿Cuánto cuesta un transporte del Aeropuerto de Cancún?',
       'Los precios de transporte privado desde el Aeropuerto de Cancún dependen del destino y tamaño del vehículo. Traslados a la Zona Hotelera de Cancún desde $45 USD, Playa del Carmen desde $80 USD y Tulum desde $120 USD para vehículo privado (hasta 8 pasajeros). Todos los precios son tarifa fija — sin sobrecargos ni taxímetro.'],
      ['¿Cuánto tarda el traslado del Aeropuerto de Cancún al hotel?',
       'Tiempos de manejo desde el Aeropuerto de Cancún: Zona Hotelera 20–30 minutos, Puerto Morelos 25 minutos, Playa del Carmen 50 minutos, Akumal 75 minutos y Tulum 90 minutos. Tiempos sin tráfico — agrega 15–20 minutos en horas pico (diciembre a abril, alrededor de las 2–6 PM).'],
      ['¿Necesito reservar el transporte del aeropuerto con anticipación?',
       'Sí, recomendamos reservar al menos 24 horas antes para garantizar disponibilidad, especialmente en temporada alta (diciembre a abril y julio/agosto). Los traslados sin reserva en el aeropuerto pueden costar 3 a 4 veces más y los tiempos de espera son impredecibles.'],
      ['¿Dónde me encuentro con el chofer en el Aeropuerto de Cancún?',
       'Después de pasar aduana, camina más allá del pasillo de vendedores y sal a la zona de pickup designada. Tu chofer tiene un letrero con tu nombre. El servicio meet-and-greet a la llegada está incluido sin costo. Monitoreamos tu vuelo — si hay retraso, el chofer espera sin costo hasta 90 minutos.'],
      ['¿Manejan sillas infantiles y grupos grandes?',
       'Sí. Las sillas infantiles están disponibles bajo solicitud al reservar — por favor especifica edades en el formulario (revisa Opciones Adicionales para conocer el costo). Para grupos de hasta 16 pasajeros usamos una van Toyota HiAce o Nissan Urvan; para grupos más grandes coordinamos varias vans con salida simultánea. Dinos el tamaño del grupo y te recomendamos el arreglo ideal.'],
    ],
  },

  'hotel-to-hotel': {
    en: [
      ['What is a hotel-to-hotel transfer and when do I need one?',
       'A hotel-to-hotel transfer is a private direct ride between two hotels in the Riviera Maya — no detours, no shared passengers. It’s used when moving to a second resort mid-trip, visiting friends at another property, or relocating between Cancun, Playa del Carmen, and Tulum without going back to the airport.'],
      ['How much does a hotel-to-hotel transfer cost?',
       'Hotel-to-hotel transfer prices depend on distance. Cancun Hotel Zone to Playa del Carmen starts around $70 USD, Playa del Carmen to Tulum from $60 USD, and Cancun to Tulum from $110 USD. Flat-rate private service for up to 8 passengers — no meter, no surprises.'],
      ['Can I stop somewhere along the way?',
       'Yes — up to two 15-minute stops are included at no extra charge (for example, a quick lunch stop in Playa del Carmen or a cenote photo stop). Longer stops or excursions can be added as custom service. Just let us know when booking.'],
      ['Is hotel-to-hotel transfer faster than a taxi?',
       'Yes. Taxis in the Riviera Maya often require flagging down at hotel entrances, negotiate prices on the spot, and may not be available at odd hours. Our hotel-to-hotel transfer is pre-booked with a guaranteed arrival time and fixed flat rate, so you don’t lose time or risk overcharging.'],
      ['What types of vehicles are used for hotel-to-hotel service?',
       'We use air-conditioned SUVs (Toyota Sienna, Toyota Highlander) for 1–4 passengers and Toyota HiAce or Nissan Urvan vans for 5–16 passengers. For groups larger than 16 we coordinate multiple vans. All vehicles are late-model and fully licensed for tourist transportation under Mexican SECTUR regulations.'],
    ],
    es: [
      ['¿Qué es un traslado hotel a hotel y cuándo lo necesito?',
       'Un traslado hotel a hotel es un viaje privado directo entre dos hoteles de la Riviera Maya — sin desvíos, sin pasajeros compartidos. Se usa al mudarse a un segundo resort a mitad del viaje, visitar amigos en otra propiedad o moverse entre Cancún, Playa del Carmen y Tulum sin regresar al aeropuerto.'],
      ['¿Cuánto cuesta un traslado hotel a hotel?',
       'Los precios dependen de la distancia. Zona Hotelera de Cancún a Playa del Carmen desde $70 USD, Playa del Carmen a Tulum desde $60 USD y Cancún a Tulum desde $110 USD. Servicio privado tarifa fija hasta 8 pasajeros — sin taxímetro, sin sorpresas.'],
      ['¿Puedo parar en algún lugar del camino?',
       'Sí — se incluyen hasta dos paradas de 15 minutos sin costo extra (por ejemplo, comida rápida en Playa del Carmen o foto en un cenote). Paradas más largas o excursiones se agregan como servicio personalizado. Solo avísanos al reservar.'],
      ['¿El traslado hotel a hotel es más rápido que un taxi?',
       'Sí. Los taxis en la Riviera Maya a menudo requieren esperar en la entrada del hotel, negociar precios en el momento y pueden no estar disponibles a horas raras. Nuestro traslado hotel a hotel se reserva con anticipación, con tiempo de llegada garantizado y tarifa fija — no pierdes tiempo ni te arriesgas a pagar de más.'],
      ['¿Qué tipo de vehículos usan para el servicio hotel a hotel?',
       'Usamos SUVs con aire acondicionado (Toyota Sienna, Toyota Highlander) para 1–4 pasajeros y vans Toyota HiAce o Nissan Urvan para 5–16 pasajeros. Para grupos de más de 16 personas coordinamos varias vans. Todos los vehículos son modelos recientes y están totalmente licenciados para transporte turístico bajo la regulación SECTUR de México.'],
    ],
  },

  'groups': {
    en: [
      ['What group sizes do you accommodate for transportation?',
       'We handle group transport in modern Toyota HiAce and Nissan Urvan vans, each seating up to 16 passengers. For groups larger than 16 we coordinate multiple vans with simultaneous departures so everyone arrives together. Tell us your group size and we\'ll quote the exact number of vehicles needed.'],
      ['Can you handle wedding and corporate event transportation?',
       'Yes — wedding parties, incentive trips, and corporate events are one of our core services. We coordinate multi-vehicle departures, timed arrivals, wait-and-return service during ceremonies, and branded welcome signs. Full itinerary planning is included for groups of 20+.'],
      ['How far in advance should I book group transportation?',
       'For groups under 30 passengers, book at least 1 week in advance. For 30+ passengers or specific-time events (weddings, conferences, sports team transfers), book 4–6 weeks in advance to guarantee vehicle availability and staff assignments — especially during high season.'],
      ['Are vehicles equipped for long-distance group trips?',
       'Yes. Our Toyota HiAce and Nissan Urvan vans have air conditioning, comfortable seating, USB charging ports, and generous luggage space. On long routes (Cancún to Chichén Itzá, Mérida, Bacalar) the driver plans scheduled restroom stops at safe roadside rest areas. Professional bilingual drivers carry SECTUR tourist transport licenses.'],
      ['Can you customize a multi-day group itinerary?',
       'Yes — we build custom multi-day transportation packages including airport arrivals, hotel transfers, tour days (Chichén Itzá, Tulum, cenotes), and departure runs. You get one dedicated coordinator, one flat price per person, and one point of contact through the entire trip.'],
    ],
    es: [
      ['¿Qué tamaños de grupo manejan para transporte?',
       'Manejamos transporte grupal en vans modernas Toyota HiAce y Nissan Urvan, con capacidad de hasta 16 pasajeros por unidad. Para grupos de más de 16 personas coordinamos múltiples vans con salida simultánea para que todos lleguen juntos. Cuéntanos el tamaño de tu grupo y te cotizamos el número exacto de vehículos.'],
      ['¿Manejan transporte para bodas y eventos corporativos?',
       'Sí — bodas, viajes de incentivo y eventos corporativos son uno de nuestros servicios principales. Coordinamos salidas con múltiples vehículos, llegadas sincronizadas, servicio de espera durante ceremonias y letreros de bienvenida personalizados. La planeación completa de itinerario está incluida para grupos de 20+.'],
      ['¿Con cuánta anticipación debo reservar transporte grupal?',
       'Para grupos menores a 30 pasajeros, reserva al menos 1 semana antes. Para 30+ pasajeros o eventos a hora específica (bodas, congresos, equipos deportivos), reserva con 4–6 semanas de anticipación para garantizar vehículos y personal — especialmente en temporada alta.'],
      ['¿Los vehículos están equipados para viajes grupales largos?',
       'Sí. Nuestras vans Toyota HiAce y Nissan Urvan cuentan con aire acondicionado, asientos cómodos, puertos USB y amplio espacio para equipaje. En rutas largas (Cancún a Chichén Itzá, Mérida, Bacalar) el chofer programa paradas en áreas de descanso seguras en carretera. Choferes profesionales bilingües con licencia SECTUR de transporte turístico.'],
      ['¿Pueden personalizar un itinerario grupal de varios días?',
       'Sí — armamos paquetes personalizados de transporte de varios días con llegadas al aeropuerto, traslados entre hoteles, días de tour (Chichén Itzá, Tulum, cenotes) y salidas. Tienes un coordinador dedicado, un precio fijo por persona y un solo punto de contacto durante todo el viaje.'],
    ],
  },
};

// -------------------------------------------------------------------------
// Build the FAQ HTML block + JSON-LD block
// -------------------------------------------------------------------------
function buildFaqSection(qas, langCode) {
  const heading = langCode === 'es' ? 'Preguntas Frecuentes' : 'Frequently Asked Questions';
  const items = qas.map(([q, a]) => `
        <details class="faq-item">
          <summary class="faq-question">${q}</summary>
          <div class="faq-answer"><p>${a}</p></div>
        </details>`).join('');
  return `
  <!-- FAQ Section (AEO) -->
  <section class="faq-section" aria-labelledby="faq-heading" style="padding:var(--space-16) 0;background:var(--bg-subtle,#f8f9fa);">
    <div class="container">
      <h2 id="faq-heading" class="section-title" style="text-align:center;margin-bottom:var(--space-8);">${heading}</h2>
      <div class="faq-list" style="max-width:820px;margin:0 auto;">${items}
      </div>
    </div>
  </section>
`;
}

function buildFaqJsonLd(qas) {
  const mainEntity = qas.map(([q, a]) => ({
    '@type': 'Question',
    'name': q,
    'acceptedAnswer': { '@type': 'Answer', 'text': a },
  }));
  return `  <script type="application/ld+json">
${JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': mainEntity }, null, 2)}
  </script>
`;
}

// -------------------------------------------------------------------------
// Inject into file
// -------------------------------------------------------------------------
function injectFaqIntoFile(filePath, qas, langCode) {
  let html = readFileSync(filePath, 'utf-8');

  if (html.includes('"@type": "FAQPage"')) {
    console.log(`  SKIP (already has FAQPage): ${filePath}`);
    return false;
  }

  const jsonLd = buildFaqJsonLd(qas);
  const faqHtml = buildFaqSection(qas, langCode);

  // Insert JSON-LD right before </head>
  html = html.replace(/<\/head>/i, jsonLd + '</head>');

  // Insert visible section right before </main>, or </body> if no </main>
  if (html.includes('</main>')) {
    html = html.replace(/<\/main>/i, faqHtml + '  </main>');
  } else {
    html = html.replace(/<\/body>/i, faqHtml + '</body>');
  }

  writeFileSync(filePath, html);
  console.log(`  OK: ${filePath} (+${qas.length} Q&A)`);
  return true;
}

// -------------------------------------------------------------------------
// Main
// -------------------------------------------------------------------------
let total = 0, skipped = 0;
for (const [slug, langs] of Object.entries(FAQS)) {
  const enPath = resolve(process.cwd(), slug, 'index.html');
  const esPath = resolve(process.cwd(), 'es', slug, 'index.html');

  console.log(`\n[${slug}]`);
  const enDone = injectFaqIntoFile(enPath, langs.en, 'en');
  const esDone = injectFaqIntoFile(esPath, langs.es, 'es');
  total += (enDone ? 1 : 0) + (esDone ? 1 : 0);
  skipped += (enDone ? 0 : 1) + (esDone ? 0 : 1);
}

console.log(`\n✓ Injected FAQPage schema + visible section into ${total} pages (skipped ${skipped} already-tagged)`);
