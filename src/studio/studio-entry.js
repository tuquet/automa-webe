import { createApp, h } from 'vue';
import { createHead } from '@vueuse/head';
import StudioApp from './StudioApp.vue';
import pinia from '../lib/pinia';
import compsUi from '../lib/compsUi';
import vueI18n, { loadLocaleMessages, setI18nLanguage } from '../lib/vueI18n';
import vRemixicon, { icons } from '../lib/vRemixicon';
import vueToastification from '../lib/vue-toastification';

// Preload English Locales statically to ensure standalone 0-network-dependency
import commonLocale from '../locales/en/common.json';
import blocksLocale from '../locales/en/blocks.json';
import newtabLocale from '../locales/en/newtab.json';
import popupLocale from '../locales/en/popup.json';

// Styles
import '../assets/css/tailwind.css';
import '../assets/css/fonts.css';
import '../assets/css/style.css';
import '../assets/css/flow.css';
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import '@vue-flow/minimap/dist/style.css';

const commonEn = commonLocale.default || commonLocale;
const blocksEn = blocksLocale.default || blocksLocale;
const newtabEn = newtabLocale.default || newtabLocale;
const popupEn = popupLocale.default || popupLocale;

// Initialize base EN messages with deep merge
vueI18n.global.setLocaleMessage('en', commonEn);
vueI18n.global.mergeLocaleMessage('en', popupEn);
vueI18n.global.mergeLocaleMessage('en', newtabEn);
vueI18n.global.mergeLocaleMessage('en', blocksEn);
vueI18n.global.locale.value = 'en';

// Expose dynamic locale switching for standalone and parent iframes
if (typeof window !== 'undefined') {
  window.setStudioLanguage = async (locale) => {
    if (locale === 'en') {
      setI18nLanguage('en');
      return;
    }
    await loadLocaleMessages(locale, 'newtab');
    setI18nLanguage(locale);
  };
}

const head = createHead();
const app = createApp(StudioApp);

// Safe RouterLink fallback for standalone environment
const RouterLinkMock = {
  props: ['to'],
  setup(props, { slots }) {
    return () =>
      h(
        'span',
        { class: 'cursor-pointer' },
        slots.default ? slots.default() : []
      );
  },
};
app.component('RouterLink', RouterLinkMock);
app.component('RouterLink', RouterLinkMock);

app.use(head);
app.use(compsUi);
app.use(pinia);
app.use(vueI18n);
app.use(vueToastification);
app.use(vRemixicon, icons);

app.mount('#app');

// Live-Reload watcher for Standalone Studio dev server
if (typeof window !== 'undefined') {
  let lastModified = null;
  const pollBundleUpdate = async () => {
    try {
      const bundleUrl = new URL('studio.bundle.js', window.location.href).href;
      const res = await fetch(`${bundleUrl}?_t=${Date.now()}`, {
        method: 'HEAD',
        cache: 'no-store',
      });
      const current =
        res.headers.get('last-modified') || res.headers.get('etag');
      if (lastModified && current && current !== lastModified) {
        window.location.reload();
      }
      if (current) {
        lastModified = current;
      }
    } catch (_) {
      // Ignored
    }
  };
  setInterval(pollBundleUpdate, 1500);
}

if (module.hot) module.hot.accept();
