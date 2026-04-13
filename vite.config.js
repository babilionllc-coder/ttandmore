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
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
