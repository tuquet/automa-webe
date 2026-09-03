import VTooltip from '../directives/VTooltip';
import VAutofocus from '../directives/VAutofocus';
import VClosePopover from '../directives/VClosePopover';

function getComponents() {
  if (typeof import.meta !== 'undefined' && import.meta.glob) {
    const ui = import.meta.glob('../components/ui/*.vue', { eager: true });
    const transitions = import.meta.glob('../components/transitions/*.vue', {
      eager: true,
    });
    return { ui, transitions, isVite: true };
  }
  return {
    ui: require.context('../components/ui', false, /\.vue$/),
    transitions: require.context('../components/transitions', false, /\.vue$/),
    isVite: false,
  };
}

function registerComponents(app, comps, isVite) {
  if (isVite) {
    Object.entries(comps).forEach(([path, module]) => {
      const componentName = path
        .split('/')
        .pop()
        .replace(/\.vue$/, '');
      const component = module?.default ?? module ?? {};
      app.component(componentName, component);
    });
  } else {
    comps.keys().forEach((key) => {
      const componentName = key.replace(/(.\/)|\.vue$/g, '');
      const component = comps(key)?.default ?? {};
      app.component(componentName, component);
    });
  }
}

export default function (app) {
  app.directive('tooltip', VTooltip);
  app.directive('autofocus', VAutofocus);
  app.directive('close-popover', VClosePopover);

  const { ui, transitions, isVite } = getComponents();
  registerComponents(app, ui, isVite);
  registerComponents(app, transitions, isVite);
}
