/* eslint-disable */
const defaultTheme = require('tailwindcss/defaultTheme');
const colors = require('tailwindcss/colors');

function withOpacityValue(variable) {
  return ({ opacityValue }) => {
    if (opacityValue === undefined) {
      return `rgb(var(${variable}))`;
    }
    return `rgb(var(${variable}) / ${opacityValue})`;
  };
}
function rem2px(input, fontSize = 16) {
  if (input == null) {
    return input;
  }

  switch (typeof input) {
    case 'object':
      if (Array.isArray(input)) {
        return input.map((val) => rem2px(val, fontSize));
      }
      const ret = {};
      for (const key in input) {
        ret[key] = rem2px(input[key]);
      }
      return ret;

    case 'string':
      return input.replace(
        /(\d*\.?\d+)rem$/,
        (_, val) => `${parseFloat(val) * fontSize}px`
      );
    default:
      return input;
  }
}

module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx,vue}',
    './business/**/*.{js,jsx,ts,tsx,vue}',
    '../packages/automa-ui/src/**/*.{js,jsx,ts,tsx,vue}',
  ],
  darkMode: 'class', // or 'media' or 'class'
  theme: {
    borderRadius: rem2px(defaultTheme.borderRadius),
    columns: rem2px(defaultTheme.columns),
    fontSize: rem2px(defaultTheme.fontSize),
    lineHeight: rem2px(defaultTheme.lineHeight),
    maxWidth: ({ theme, breakpoints }) => ({
      ...rem2px(defaultTheme.maxWidth({ theme, breakpoints })),
    }),
    spacing: rem2px(defaultTheme.spacing),
    extend: {
      colors: {
        primary: withOpacityValue('--color-primary'),
        'primary-foreground': 'var(--primary-foreground, #ffffff)',
        secondary: withOpacityValue('--color-secondary'),
        'secondary-foreground': 'var(--secondary-foreground, #f4f4f5)',
        accent: 'var(--accent, #f4f4f5)',
        'accent-foreground': 'var(--accent-foreground, #18181b)',
        background: 'var(--background, #ffffff)',
        foreground: 'var(--foreground, #09090b)',
        card: 'var(--card, #ffffff)',
        'card-foreground': 'var(--card-foreground, #09090b)',
        popover: 'var(--popover, #ffffff)',
        'popover-foreground': 'var(--popover-foreground, #09090b)',
        destructive: 'var(--destructive, #ef4444)',
        'destructive-foreground': 'var(--destructive-foreground, #ffffff)',
        border: 'var(--border, #e4e4e7)',
        input: 'var(--input, #e4e4e7)',
        muted: 'var(--muted, #f4f4f5)',
        'muted-foreground': 'var(--muted-foreground, #71717a)',
        ring: 'var(--ring, #3b82f6)',
        gray: colors.zinc,
        orange: colors.orange,
      },
      fontFamily: {
        sans: ['var(--automa-font-sans)'],
        mono: ['var(--automa-font-mono)'],
      },
      container: {
        center: true,
        padding: {
          DEFAULT: '1rem',
          sm: '2rem',
        },
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [require('@tailwindcss/typography')],
};
