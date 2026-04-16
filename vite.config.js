import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        book: resolve(__dirname, 'book/index.html'),
        hotelToHotel: resolve(__dirname, 'hotel-to-hotel/index.html'),
        groups: resolve(__dirname, 'groups/index.html'),
        termsAndConditions: resolve(__dirname, 'terms-and-conditions/index.html'),
        chichenItzaTour: resolve(__dirname, 'chichen-itza-tour/index.html'),
        chichenItzaCenoteSelvaMaya: resolve(__dirname, 'chichen-itza-cenote-selva-maya/index.html'),
        chichenItzaCenoteIkKil: resolve(__dirname, 'chichen-itza-cenote-ik-kil/index.html'),
        chichenItzaEkBalam: resolve(__dirname, 'chichen-itza-ek-balam/index.html'),
        tulum: resolve(__dirname, 'tulum/index.html'),
        tulumAkumalSnorkel: resolve(__dirname, 'tulum-akumal-snorkel/index.html'),
        tulumCoba: resolve(__dirname, 'tulum-coba/index.html'),
        coba: resolve(__dirname, 'coba/index.html'),
        ekBalamCenoteXcanche: resolve(__dirname, 'ek-balam-cenote-xcanche/index.html'),
        tulumGranCenoteTulum: resolve(__dirname, 'tulum-gran-cenote-tulum/index.html'),
        // Spanish pages
        esMain: resolve(__dirname, 'es/index.html'),
        esBook: resolve(__dirname, 'es/book/index.html'),
        esHotelToHotel: resolve(__dirname, 'es/hotel-to-hotel/index.html'),
        esGroups: resolve(__dirname, 'es/groups/index.html'),
        esTerms: resolve(__dirname, 'es/terms-and-conditions/index.html'),
        esChichenItzaTour: resolve(__dirname, 'es/chichen-itza-tour/index.html'),
        esChichenItzaCenoteSelvaMaya: resolve(__dirname, 'es/chichen-itza-cenote-selva-maya/index.html'),
        esChichenItzaCenoteIkKil: resolve(__dirname, 'es/chichen-itza-cenote-ik-kil/index.html'),
        esChichenItzaEkBalam: resolve(__dirname, 'es/chichen-itza-ek-balam/index.html'),
        esTulum: resolve(__dirname, 'es/tulum/index.html'),
        esTulumAkumalSnorkel: resolve(__dirname, 'es/tulum-akumal-snorkel/index.html'),
        esTulumCoba: resolve(__dirname, 'es/tulum-coba/index.html'),
        esCoba: resolve(__dirname, 'es/coba/index.html'),
        esEkBalamCenoteXcanche: resolve(__dirname, 'es/ek-balam-cenote-xcanche/index.html'),
        esTulumGranCenoteTulum: resolve(__dirname, 'es/tulum-gran-cenote-tulum/index.html'),
        // Blog pages (EN)
        blog: resolve(__dirname, 'blog/index.html'),
        blogAirportGuide: resolve(__dirname, 'blog/cancun-airport-transportation-guide/index.html'),
        blogPlayaDelCarmen: resolve(__dirname, 'blog/cancun-airport-to-playa-del-carmen/index.html'),
        blogChichenItzaTours: resolve(__dirname, 'blog/best-chichen-itza-tours-from-cancun/index.html'),
        blogAirportToTulum: resolve(__dirname, 'blog/cancun-airport-to-tulum/index.html'),
        // Blog pages (ES)
        esBlog: resolve(__dirname, 'es/blog/index.html'),
        esBlogAirportGuide: resolve(__dirname, 'es/blog/cancun-airport-transportation-guide/index.html'),
        esBlogPlayaDelCarmen: resolve(__dirname, 'es/blog/cancun-airport-to-playa-del-carmen/index.html'),
        esBlogChichenItzaTours: resolve(__dirname, 'es/blog/best-chichen-itza-tours-from-cancun/index.html'),
        esBlogAirportToTulum: resolve(__dirname, 'es/blog/cancun-airport-to-tulum/index.html'),
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
